const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const ORG_PORTAL_URL =
  process.env.NEXT_PUBLIC_ORG_URL ||
  (IS_PRODUCTION ? "https://org.mglstore.mn" : "http://localhost:3004");

export const VENDOR_PORTAL_URL =
  process.env.NEXT_PUBLIC_VENDOR_URL ||
  (IS_PRODUCTION ? "https://vendor.mglstore.mn" : "http://localhost:3002");

export const VENDOR_BANK_ACCOUNT_URL = `${VENDOR_PORTAL_URL.replace(/\/$/, "")}/profile?tab=qpay`;
