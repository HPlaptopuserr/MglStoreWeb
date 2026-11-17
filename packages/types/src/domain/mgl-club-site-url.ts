/** Top-level application paths are unavailable as company addresses. */
const reserved = new Set([
  "2003",
  "attendance",
  "account",
  "building",
  "apply",
  "association",
  "checkout",
  "company",
  "contract",
  "forms",
  "franchise",
  "hr",
  "info",
  "login",
  "logout",
  "mgl-club",
  "mgl-store",
  "mgl-water",
  "o",
  "orders",
  "organizations",
  "our-services",
  "privacy-policy",
  "products",
  "profile",
  "projects",
  "reels",
  "services",
  "shared-store",
  "store",
  "stores",
  "study",
  "api",
  "api-proxy",
  "auth",
  "admin",
  "vendor",
  "warehouse",
  "www",
  "assets",
  "register",
  "signup",
  "health",
  "robots",
  "sitemap",
]);
export function isClubSiteSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(value) &&
    !reserved.has(value)
  );
}
export function normalizeClubSiteSlug(value: unknown): string | null {
  const slug = typeof value === "string" ? value.trim().toLowerCase() : "";
  return isClubSiteSlug(slug) ? slug : null;
}
export const CLUB_BUSINESS_SITE_ORIGIN = "https://mglbusiness.mn";
