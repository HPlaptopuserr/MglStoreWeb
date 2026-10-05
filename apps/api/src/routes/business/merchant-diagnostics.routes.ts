import { Router, type Router as ExpressRouter } from "express";
import { AuditAction, prisma } from "@mgl/database";
import { Permission, type MerchantDiagnostics, type MerchantDiagnosticsChannel } from "@mgl/types";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import { isSystemQrMarker } from "../../services/vendor-merchant.service";

const router: ExpressRouter = Router();

function savedAccounts(value: unknown): MerchantDiagnosticsChannel["accounts"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    if (typeof item !== "object" || item === null) return [];
    if (!("account_bank_code" in item) || typeof item.account_bank_code !== "string"
      || !("account_number" in item) || typeof item.account_number !== "string"
      || !("account_name" in item) || typeof item.account_name !== "string") return [];
    return [{ bankCode: item.account_bank_code, number: item.account_number, name: item.account_name,
      isDefault: "is_default" in item && item.is_default === true }];
  });
}

router.get("/admin/organizations/:organizationId/merchant-diagnostics", requireAuth,
  requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS), async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const organizationId = req.params.organizationId;
      const org = await prisma.organization.findFirst({
        where: { id: organizationId, deletedAt: null },
        select: {
          qpayEnabled: true, qpayMerchantId: true, qpayMerchantKey: true, qpayInvoiceCode: true,
          qpayConnectedAt: true, qpayBankAccounts: true,
          webQpayEnabled: true, webQpayMerchantId: true, webQpayMerchantKey: true,
          webQpayInvoiceCode: true, webQpayConnectedAt: true, webQpayBankAccounts: true,
        },
      });
      if (!org) return res.status(404).json({ message: "Байгууллага олдсонгүй." });
      const channels: MerchantDiagnosticsChannel[] = (["POS", "WEB"] as const).map((channel) => {
        const web = channel === "WEB";
        const id = web ? org.webQpayMerchantId : org.qpayMerchantId;
        const key = web ? org.webQpayMerchantKey : org.qpayMerchantKey;
        const invoiceCode = web ? org.webQpayInvoiceCode : org.qpayInvoiceCode;
        const minu = isSystemQrMarker(key) || isSystemQrMarker(invoiceCode);
        return {
          channel, provider: id ? (minu ? "MINU" : "QPAY") : null,
          connected: Boolean((web ? org.webQpayEnabled : org.qpayEnabled) && id),
          merchantId: id, connectedAt: (web ? org.webQpayConnectedAt : org.qpayConnectedAt)?.toISOString() ?? null,
          credentialsConfigured: Boolean(key),
          accounts: savedAccounts(web ? org.webQpayBankAccounts : org.qpayBankAccounts),
          providerVerification: "NOT_VERIFIED",
        };
      });
      const logs = await prisma.auditLog.findMany({
        where: { action: AuditAction.MERCHANT_CONFIGURATION_CHANGED, meta: { path: ["organizationId"], equals: organizationId } },
        orderBy: { createdAt: "desc" }, take: 30,
        select: { id: true, createdAt: true, meta: true, user: { select: { email: true } } },
      });
      const payload: MerchantDiagnostics = {
        organizationId, readAt: new Date().toISOString(), channels,
        history: logs.map((log) => {
          const meta = log.meta && typeof log.meta === "object" && !Array.isArray(log.meta) ? log.meta : {};
          return { id: log.id, createdAt: log.createdAt.toISOString(), actor: log.user?.email || "Хэрэглэгч устсан / тодорхойгүй",
            channel: typeof meta.channel === "string" ? meta.channel : "—", event: typeof meta.event === "string" ? meta.event : "UNKNOWN" };
        }),
      };
      return res.json(payload);
    } catch {
      console.error("Merchant diagnostics read failed");
      return res.status(500).json({ message: "Төлбөрийн тохиргоог уншиж чадсангүй." });
    }
  });
export default router;
