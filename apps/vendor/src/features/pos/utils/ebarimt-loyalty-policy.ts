/** Payment classification for point redemption must be verified before taking money. */
export function ebarimtLoyaltyPaymentBlocker({
  enabled,
  redeemedPoints,
}: {
  enabled: boolean;
  redeemedPoints: number;
}): string | null {
  return enabled && redeemedPoints > 0
    ? "M Point хасалтын eBarimt төлбөрийн ангилал баталгаажаагүй байна. Оноо хасахгүй төлөх сонголтыг ашиглана уу. Төлбөр эхлээгүй."
    : null;
}
