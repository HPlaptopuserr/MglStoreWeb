import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_POS_API_URL = "http://localhost:7080";

function isAllowedPosApiHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    host === "localhost" ||
    host === "::1" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host.endsWith(".local")
  );
}

function getTarget(request: NextRequest) {
  const path = String(request.nextUrl.searchParams.get("path") || "");
  if (
    !path.startsWith("/rest/") ||
    path.includes("://") ||
    path.includes("..") ||
    /[\r\n]/.test(path)
  ) {
    throw new Error("eBarimt PosAPI зам буруу байна");
  }

  const rawBaseUrl = String(
    request.nextUrl.searchParams.get("baseUrl") ||
      process.env.NEXT_PUBLIC_EBARIMT_POS_API_URL ||
      DEFAULT_POS_API_URL,
  )
    .trim()
    .replace(/\/+$/, "");
  const url = new URL(rawBaseUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !isAllowedPosApiHost(url.hostname)
  ) {
    throw new Error("eBarimt PosAPI нь дотоод сүлжээний URL байх ёстой");
  }
  return `${rawBaseUrl}${path}`;
}

async function proxyPosApi(request: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_EBARIMT_ENABLED !== "true"
  ) {
    return NextResponse.json({ message: "eBarimt идэвхгүй байна" }, { status: 503 });
  }

  let target: string;
  try {
    target = getTarget(request);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "PosAPI хүсэлт буруу" },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const path = String(request.nextUrl.searchParams.get("path") || "");
  const timer = setTimeout(
    () => controller.abort(),
    path.startsWith("/rest/sendData") ? 600_000 : 25_000,
  );
  try {
    const hasBody = !["GET", "HEAD"].includes(request.method);
    const body = hasBody ? await request.text() : undefined;
    const response = await fetch(target, {
      method: request.method,
      headers: {
        Accept: "application/json",
        ...(body
          ? {
              "Content-Type":
                request.headers.get("content-type") || "application/json",
            }
          : {}),
      },
      body,
      cache: "no-store",
      signal: controller.signal,
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error && error.name === "AbortError"
            ? "eBarimt PosAPI хариу өгөхгүй байна"
            : "eBarimt PosAPI-тай холбогдож чадсангүй",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}

export const GET = proxyPosApi;
export const POST = proxyPosApi;
export const PUT = proxyPosApi;
export const DELETE = proxyPosApi;
