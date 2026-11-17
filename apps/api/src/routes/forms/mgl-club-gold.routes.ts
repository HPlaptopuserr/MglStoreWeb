import { requireAuth } from "../../middleware/auth";
import { requireClubAdmin } from "./mgl-club-access";
import { getClubWebsiteAccess } from "../../services/mgl-club-website-access";
import { Router, type Response, type Router as ExpressRouter } from "express";
import { rateLimit } from "express-rate-limit";
import {
  ClubGoldError,
  createClubGoldInvoice,
  checkClubGoldInvoice,
  createClubGoldInvoiceForAdmin,
  checkClubGoldInvoiceForAdmin,
} from "../../services/mgl-club-gold";
function fail(res: Response, error: unknown) {
  if (error instanceof ClubGoldError)
    return res.status(error.status).json({ message: error.message });
  return res.status(503).json({
    message: "Төлбөрийн үйлчилгээтэй холбогдож чадсангүй. Дахин оролдоно уу.",
  });
}
export function createClubGoldRouter(): ExpressRouter {
  const router = Router();
  const base = "/forms/mgl-club/gold";
  const adminBase = "/forms/mgl-club/my-companies/:id";
  const adminLimit = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });
  router.post(
    `${adminBase}/gold-invoice`,
    requireAuth,
    requireClubAdmin,
    adminLimit,
    async (req, res) => {
      res.setHeader("Cache-Control", "private, no-store");
      const id = String(req.params.id);
      if (!/^[0-9a-f-]{36}$/i.test(id))
        return res
          .status(400)
          .json({ message: "Байгууллагын дугаар буруу байна." });
      try {
        const access = await getClubWebsiteAccess(id);
        if (access.eligible)
          return res
            .status(409)
            .json({ message: "Алтан гишүүнчлэл идэвхтэй байна.", access });
        return res.json(await createClubGoldInvoiceForAdmin(id));
      } catch (error: unknown) {
        return fail(res, error);
      }
    },
  );
  router.post(
    `${adminBase}/gold-invoices/:invoiceId/check`,
    requireAuth,
    requireClubAdmin,
    adminLimit,
    async (req, res) => {
      res.setHeader("Cache-Control", "private, no-store");
      const id = String(req.params.id),
        invoiceId = String(req.params.invoiceId);
      if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(invoiceId))
        return res
          .status(400)
          .json({ message: "Байгууллага, нэхэмжлэхийн дугаар буруу байна." });
      try {
        return res.json(await checkClubGoldInvoiceForAdmin(id, invoiceId));
      } catch (error: unknown) {
        return fail(res, error);
      }
    },
  );
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
