interface OriginPolicy {
  production: boolean;
  siteUrl?: string;
  renderUrl?: string;
}

/** Do not trust forwarded host headers: only configured public origins are accepted. */
export function isBusinessRequestOrigin(
  request: Request,
  policy: OriginPolicy,
): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  if (!policy.production) return origin === new URL(request.url).origin;
  const allowed = [
    "https://mglbusiness.mn",
    "https://www.mglbusiness.mn",
    policy.siteUrl,
    policy.renderUrl,
  ];
  return allowed.some((value) => {
    if (!value) return false;
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        origin === url.origin
      );
    } catch {
      return false;
    }
  });
}

export function businessSameOrigin(request: Request): boolean {
  return isBusinessRequestOrigin(request, {
    production: process.env.NODE_ENV === "production",
    siteUrl: process.env.BUSINESS_SITE_URL,
    renderUrl: process.env.RENDER_EXTERNAL_URL,
  });
}
