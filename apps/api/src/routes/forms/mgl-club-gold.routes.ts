import { Router, type Response, type Router as ExpressRouter } from "express";
import { rateLimit } from "express-rate-limit";
import {
  ClubGoldError,
  createClubGoldInvoice,
  checkClubGoldInvoice,
} from "../../services/mgl-club-gold";
function fail(res: Response, error: unknown) {
  if (error instanceof ClubGoldError)
    return res.status(error.status).json({ message: error.message });
  return res
    .status(503)
    .json({
      message: "Төлбөрийн үйлчилгээтэй холбогдож чадсангүй. Дахин оролдоно уу.",
    });
}
export function createClubGoldRouter(): ExpressRouter {
  const router = Router();
  const base = "/forms/mgl-club/gold";
  router.use(
    base,
    rateLimit({
      windowMs: 60_000,
      limit: 30,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
  );
  router.all(`${base}/callback`, async (req, res) => {
    const id = req.query.invoiceId;
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id))
      return res.sendStatus(400);
    try {
      await checkClubGoldInvoice(id);
      return res.json({ received: true });
    } catch (error: unknown) {
      return fail(res, error);
    }
  });
  router.post(`${base}/:registrationId/invoice`, async (req, res) => {
    const token = req.get("Authorization")?.replace(/^Bearer /, "") ?? "";
    try {
      return res.json(
        await createClubGoldInvoice(String(req.params.registrationId), token),
      );
    } catch (error: unknown) {
      return fail(res, error);
    }
  });
  router.post(
    `${base}/:registrationId/invoices/:invoiceId/check`,
    async (req, res) => {
      const token = req.get("Authorization")?.replace(/^Bearer /, "") ?? "";
      try {
        return res.json(
          await checkClubGoldInvoice(String(req.params.invoiceId), {
            registrationId: String(req.params.registrationId),
            token,
          }),
        );
      } catch (error: unknown) {
        return fail(res, error);
      }
    },
  );
  return router;
}
