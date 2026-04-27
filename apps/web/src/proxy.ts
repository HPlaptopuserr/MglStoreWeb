import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "mglstore.mn";
const RESERVED = new Set(["www", "admin", "vendor", "warehouse", "api", "cdn"]);

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];

  if (
    hostname === ROOT_DOMAIN ||
    hostname === `www.${ROOT_DOMAIN}` ||
    !hostname.endsWith(`.${ROOT_DOMAIN}`)
  ) {
    return NextResponse.next();
  }

  const subdomain = hostname.slice(0, hostname.length - ROOT_DOMAIN.length - 1);

  if (!subdomain || RESERVED.has(subdomain)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const originalPath = url.pathname;
  url.pathname = `/store/${subdomain}${originalPath === "/" ? "" : originalPath}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
