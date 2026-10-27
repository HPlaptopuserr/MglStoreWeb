import { NextResponse } from "next/server";
import {
  buildingApiBase,
  buildingToken,
  sameOrigin,
  unavailable,
} from "@/features/building/server/building-session";
async function forward(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const target = path.join("/");
  const mediaRead =
    /^projects\/[a-zA-Z0-9-]+\/media\/[a-f0-9-]{36}\.webp$/.test(target);
  const mediaUpload = /^admin\/projects\/[a-zA-Z0-9-]+\/media$/.test(target);
  const detail = /^admin\/projects\/[a-zA-Z0-9-]+$/.test(target);
  const website = /^admin\/projects\/[a-zA-Z0-9-]+\/website$/.test(target);
  const unit = /^admin\/projects\/[a-zA-Z0-9-]+\/units\/[a-zA-Z0-9-]+$/.test(
    target,
  );
  const purchaseRead = /^(admin|buyer)\/purchases$/.test(target);
  const cancelPurchase = /^admin\/purchases\/[a-zA-Z0-9-]+\/cancel$/.test(
    target,
  );
  const purchaseWrite =
    cancelPurchase ||
    /^(admin|buyer)\/purchases\/[a-zA-Z0-9-]+\/accept$/.test(target) ||
    ["admin/purchases", "admin/purchases/buyer"].includes(target);
  const inquiryWrite = /^(admin\/)?projects\/[a-zA-Z0-9-]+\/inquiries$/.test(
    target,
  );
  const publicInquiry = inquiryWrite && target.startsWith("projects/");
  const allowed =
    request.method === "GET"
      ? purchaseRead ||
        mediaRead ||
        detail ||
        website ||
        [
          "admin/projects",
          "admin/organization",
          "admin/inventory",
          "admin/inventory-options",
          "admin/dashboard",
          "admin/navigation",
          "admin/customers",
          "admin/inquiries",
          "admin/payments-report",
        ].includes(target)
      : request.method === "PATCH"
        ? mediaRead || detail || website || unit
        : request.method === "POST" &&
          (target === "admin/projects" ||
            mediaUpload ||
            purchaseWrite ||
            inquiryWrite);
  if (!allowed)
    return NextResponse.json({ message: "Хуудас олдсонгүй" }, { status: 404 });
  if (request.method !== "GET" && !sameOrigin(request))
    return NextResponse.json(
      { message: "Хүсэлтийн эх сурвалж буруу байна" },
      { status: 403 },
    );
  const token = await buildingToken();
  if (!token && !mediaRead && !publicInquiry)
    return NextResponse.json({ message: "Нэвтэрнэ үү" }, { status: 401 });
  try {
    const response = await fetch(
      `${buildingApiBase}/api/building/${target}${new URL(request.url).search}`,
      {
        method: request.method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: request.method !== "GET" ? await request.text() : undefined,
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );
    if (mediaRead)
      return new NextResponse(await response.arrayBuffer(), {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("content-type") ?? "image/webp",
          "Cache-Control": "private, max-age=300",
        },
      });
    const body: unknown = await response.json();
    return NextResponse.json(body, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return unavailable();
  }
}
export const GET = forward;
export const POST = forward;

export const PATCH = forward;
