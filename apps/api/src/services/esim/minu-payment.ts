import { createSystemQrInvoice, checkSystemQrPayment } from "../systemqr";
import type { Purchase } from "./purchase-store";
export interface EsimPaymentInvoice {
  invoice_id: string;
  qr_text: string;
  qr_image: string;
  urls: { name: string; description: string; logo: string; link: string }[];
}
export function esimMinuConfig(env: NodeJS.ProcessEnv = process.env) {
  const merchantCode = env.ESIM_MINU_MERCHANT_CODE?.trim();
  const username = env.SYSTEMQR_USERNAME?.trim();
  const password = env.SYSTEMQR_PASSWORD?.trim();
  if (!merchantCode || !username || !password || merchantCode === username)
    throw new Error("Missing eSIM Minu subMerchant configuration");
  return { merchantCode, username, password };
}
export async function createEsimMinuInvoice(
  order: Purchase,
): Promise<EsimPaymentInvoice> {
  const config = esimMinuConfig();
  const publicUrl = process.env.API_PUBLIC_URL?.replace(/\/+$/, "");
  if (!publicUrl?.startsWith("https://"))
    throw new Error("Missing callback URL");
  const invoice = await createSystemQrInvoice(
    {
      merchantCode: order.merchantCode,
      amount: order.totalMnt,
      referenceNumber: order.id,
      webhook: `${publicUrl}/api/esim/minu/callback`,
    },
    config.username,
    config.password,
  );
  return {
    invoice_id: String(invoice.invoiceId),
    qr_text: String(invoice.qrText),
    qr_image: "",
    urls: (invoice.urls as unknown[]).map((value) => {
      if (!value || typeof value !== "object")
        throw new Error("Invalid bank link");
      const item = value as Record<string, unknown>;
      return {
        name: String(item.name ?? ""),
        description: String(item.description ?? ""),
        logo: String(item.logo ?? ""),
        link: String(item.link ?? ""),
      };
    }),
  };
}
export async function checkEsimMinuPayment(order: Purchase): Promise<boolean> {
  if (!order.invoiceId || !order.merchantCode) return false;
  const config = esimMinuConfig();
  // Use the merchant and exact fixed-amount invoice persisted at creation.
  return (
    (
      await checkSystemQrPayment(
        {
          merchantCode: order.merchantCode,
          invoiceNumber: order.invoiceId,
        },
        config.username,
        config.password,
      )
    ).paid === true
  );
}
