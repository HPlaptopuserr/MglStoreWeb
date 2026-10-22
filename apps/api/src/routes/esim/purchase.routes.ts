import type { Router, Request, Response } from "express";
import type { AuthPayload } from "../../middleware/auth";
import {
  EsimPurchaseService,
  PurchaseError,
  publicPurchase,
  type PurchaseInput,
} from "../../services/esim/purchase-service";

export function parsePurchaseInput(value: unknown): PurchaseInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    typeof body.token !== "string" ||
    !body.token ||
    body.token.length > 4096 ||
    typeof body.idempotencyKey !== "string" ||
    !/^[a-zA-Z0-9_-]{16,64}$/.test(body.idempotencyKey) ||
    body.acceptedTerms !== true ||
    body.compatibleDevice !== true ||
    Object.keys(body).some(
      (key) =>
        ![
          "token",
          "idempotencyKey",
          "acceptedTerms",
          "compatibleDevice",
        ].includes(key),
    )
  )
    return null;
  return {
    token: body.token,
    idempotencyKey: body.idempotencyKey,
    acceptedTerms: true,
    compatibleDevice: true,
  };
}
const userId = (req: Request) =>
  (req as Request & { user: AuthPayload }).user.userId;
export function purchaseRoutes(
  router: Router,
  service: () => EsimPurchaseService,
): void {
  router.post("/store/esim/orders", async (req, res) => {
    const body = parsePurchaseInput(req.body);
    if (!body) {
      res
        .status(400)
        .json({ message: "Захиалгын мэдээлэл болон зөвшөөрлөө шалгана уу." });
      return;
    }
    try {
      res.json(publicPurchase(await service().create(userId(req), body)));
    } catch (error) {
      failure(res, error);
    }
  });
  router.get("/store/esim/orders", async (req, res) => {
    try {
      res.json({
        orders: (await service().list(userId(req))).map(publicPurchase),
      });
    } catch (error) {
      failure(res, error);
    }
  });
  router.get("/store/esim/orders/:id", async (req, res) => {
    try {
      res.json(
        publicPurchase(
          await service().owned(userId(req), String(req.params.id)),
        ),
      );
    } catch (error) {
      failure(res, error);
    }
  });
  router.post("/store/esim/orders/:id/check", async (req, res) => {
    try {
      const current = service();
      const order = await current.owned(userId(req), String(req.params.id));
      await current.reconcile(order.id);
      res.json(publicPurchase(await current.owned(userId(req), order.id)));
    } catch (error) {
      failure(res, error);
    }
  });
  router.get("/store/esim/orders/:id/activation", async (req, res) => {
    try {
      res.json(await service().activation(userId(req), String(req.params.id)));
    } catch (error) {
      failure(res, error);
    }
  });
}
function failure(res: Response, error: unknown): void {
  if (error instanceof PurchaseError) {
    res.status(error.status).json({ code: error.code, message: error.message });
  } else {
    res
      .status(503)
      .json({
        code: "ESIM_UNAVAILABLE",
        message: "Үйлчилгээ түр боломжгүй байна. Захиалгаа дахин шалгана уу.",
      });
  }
}
