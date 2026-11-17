import { CLUB_BUSINESS_SITE_ORIGIN } from "@mgl/types";

/** Company presentations are hosted by the separate MGL Business app. */
export const companySiteOrigin = (
  process.env.NEXT_PUBLIC_BUSINESS_URL ||
  (process.env.NODE_ENV === "production"
    ? CLUB_BUSINESS_SITE_ORIGIN
    : "http://localhost:3005")
).replace(/\/$/, "");
