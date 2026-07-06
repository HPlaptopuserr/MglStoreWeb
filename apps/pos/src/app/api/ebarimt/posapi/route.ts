import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_POS_API_URL = "http://localhost:7080";
const ALLOWED_PATH_PREFIX = "/rest/";
const DEFAULT_TIMEOUT_MS = 25_000;
const SEND_DATA_TIMEOUT_MS = 600_000;

function isAllowedPosApiHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1") return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return host.endsWith(".local");
}

function getPosApiBaseUrl(request: NextRequest) {
  const configured = String(
    request.nextUrl.searchParams.get("baseUrl") ||
      process.env.NEXT_PUBLIC_EBARIMT_POS_API_URL ||
      DEFAULT_POS_API_URL,
  ).trim();
  const normalized = configured.replace(/\/+$/, "");

  try {
    const url = new URL(normalized);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error("Invalid eBarimt PosAPI URL");
    }
    if (!isAllowedPosApiHost(url.hostname)) {
      throw new Error("eBarimt PosAPI URL must be local or private network");
    }
    return normalized;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Invalid eBarimt PosAPI URL");
  }
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
  let baseUrl: string;
  try {
    path = getSafePosApiPath(request);
    baseUrl = getPosApiBaseUrl(request);
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
      const response = await fetch(`${baseUrl}${path}`, {
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
