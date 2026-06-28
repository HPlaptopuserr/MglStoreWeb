import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_POS_API_URL = "http://localhost:7080";
const ALLOWED_PATH_PREFIX = "/rest/";
const DEFAULT_TIMEOUT_MS = 25_000;
const SEND_DATA_TIMEOUT_MS = 600_000;

function getPosApiBaseUrl() {
  return String(process.env.NEXT_PUBLIC_EBARIMT_POS_API_URL || DEFAULT_POS_API_URL).replace(/\/$/, "");
}

function getSafePosApiPath(request: NextRequest) {
  const path = String(request.nextUrl.searchParams.get("path") || "");

  if (
    !path.startsWith(ALLOWED_PATH_PREFIX) ||
    path.includes("://") ||
    path.includes("..") ||
    /[\r\n]/.test(path)
  ) {
    throw new Error("Invalid eBarimt PosAPI path");
  }

  return path;
}

async function proxyPosApi(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_EBARIMT_ENABLED !== "true") {
    return NextResponse.json({ message: "eBarimt disabled" }, { status: 503 });
  }

  let path: string;
  try {
    path = getSafePosApiPath(request);
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || "Invalid PosAPI request" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutMs = path.startsWith("/rest/sendData") ? SEND_DATA_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const hasBody = !["GET", "HEAD"].includes(request.method);
    const body = hasBody ? await request.text() : undefined;
    try {
      const response = await fetch(`${getPosApiBaseUrl()}${path}`, {
        method: request.method,
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": request.headers.get("content-type") || "application/json" } : {}),
        },
        body,
        cache: "no-store",
        signal: controller.signal,
      });

      const text = await response.text();
      return new NextResponse(text, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("content-type") || "application/json",
        },
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return NextResponse.json({ message: "eBarimt PosAPI timeout" }, { status: 504 });
    }
    console.error("eBarimt PosAPI proxy error", error);
    return NextResponse.json({ message: "eBarimt PosAPI unreachable" }, { status: 502 });
  }
}

export const GET = proxyPosApi;
export const POST = proxyPosApi;
export const PUT = proxyPosApi;
export const DELETE = proxyPosApi;
