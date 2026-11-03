import {
  getVendorMerchantConfig,
  getVendorSystemQrConfig,
  type MerchantChannel,
} from "./vendor-merchant.service";

type StorePaymentMerchant =
  | {
      provider: "SYSTEMQR";
      channel: MerchantChannel;
      config: NonNullable<Awaited<ReturnType<typeof getVendorSystemQrConfig>>>;
    }
  | {
      provider: "QPAY";
      channel: MerchantChannel;
      config: NonNullable<Awaited<ReturnType<typeof getVendorMerchantConfig>>["config"]>;
    };

/** Use the seller account shown in Profile, Org and Vendor bank settings.
 * Keep WEB-only sellers supported, without falling back to a platform account.
 */
export async function getStorePaymentMerchant(
  organizationId: string,
): Promise<StorePaymentMerchant | null> {
  for (const channel of ["POS", "WEB"] as const) {
    const systemQr = await getVendorSystemQrConfig(organizationId, channel);
    if (systemQr) return { provider: "SYSTEMQR", channel, config: systemQr };

    const qpay = await getVendorMerchantConfig(organizationId, channel, {
      allowCentralFallback: false,
    });
    if (!qpay.success) throw new Error("Seller payment configuration unavailable");
    if (qpay.config) return { provider: "QPAY", channel, config: qpay.config };
  }
  return null;
}
