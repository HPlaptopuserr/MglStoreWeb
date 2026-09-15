import { NextRequest, NextResponse } from "next/server";

type TinLookupResponse = {
  status?: number;
  msg?: string;
  data?: string | number | null;
};

function buildLookupUrl(baseUrl: string, regNo: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  const root = normalized.includes("/api/info/check/")
    ? normalized.replace(/\/api\/info\/check\/[^/?#]+.*$/i, "")
    : normalized;
  const url = new URL(`${root}/api/info/check/getTinInfo`);
  url.searchParams.set("regNo", regNo);
  return url;
}

export async function GET(request: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_EBARIMT_ENABLED !== "true"
  ) {
    return NextResponse.json({ message: "eBarimt идэвхгүй байна" }, { status: 503 });
  }

  const regNo = String(request.nextUrl.searchParams.get("regNo") || "").replace(
    /\D/g,
    "",
  );
  if (!/^\d{7}$/.test(regNo)) {
    return NextResponse.json(
      { message: "Байгууллагын регистр 7 оронтой байна" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      buildLookupUrl(
        process.env.EBARIMT_INFO_API_URL || "https://api.ebarimt.mn",
        regNo,
      ),
      { cache: "no-store" },
    );
    const raw = await response.text();
    let payload: TinLookupResponse;
    try {
      payload = JSON.parse(raw) as TinLookupResponse;
    } catch {
      return NextResponse.json(
        { message: "eBarimt TIN лавлагааны хариу буруу байна" },
        { status: 502 },
      );
    }
    const tin = String(payload.data ?? "").replace(/\D/g, "");
    if (!response.ok || payload.status !== 200 || !/^\d{11,14}$/.test(tin)) {
      return NextResponse.json(
        { message: payload.msg || "Байгууллагын мэдээлэл олдсонгүй" },
        { status: 404 },
      );
    }
    return NextResponse.json({ regNo, tin });
  } catch (error) {
    return NextResponse.json(
      {
        message: `eBarimt TIN лавлагаатай холбогдож чадсангүй: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      },
      { status: 502 },
    );
  }
}
