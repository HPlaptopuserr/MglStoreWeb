import { NextRequest, NextResponse } from "next/server";

type TinLookupResponse = {
  status?: number;
  msg?: string;
  data?: string | number | null;
};

function buildTinLookupUrl(rawBaseUrl: string, regNo: string) {
  const configured = rawBaseUrl.trim().replace(/\/+$/, "");
  const endpoint = configured.includes("/api/info/check/getTinInfo")
    ? configured
    : `${configured}/api/info/check/getTinInfo`;
  const url = new URL(endpoint);
  url.searchParams.set("regNo", regNo);
  return url;
}

export async function GET(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_EBARIMT_ENABLED !== "true") {
    return NextResponse.json({ message: "eBarimt идэвхгүй байна" }, { status: 503 });
  }

  const regNo = String(request.nextUrl.searchParams.get("regNo") || "").replace(/\D/g, "");
  if (!/^\d{7}$/.test(regNo)) {
    return NextResponse.json(
      { message: "Байгууллагын РД 7 оронтой байна" },
      { status: 400 },
    );
  }

  const baseUrl = String(process.env.EBARIMT_INFO_API_URL || "").trim();
  if (!baseUrl) {
    return NextResponse.json(
      { message: "eBarimt TIN лавлагааны хаяг тохируулагдаагүй байна" },
      { status: 503 },
    );
  }

  try {
    const lookupUrl = buildTinLookupUrl(baseUrl, regNo);
    const response = await fetch(lookupUrl, { cache: "no-store" });
    const responseText = await response.text();
    let payload: TinLookupResponse;
    try {
      payload = JSON.parse(responseText) as TinLookupResponse;
    } catch {
      return NextResponse.json(
        { message: `eBarimt TIN лавлагаа JSON бус хариу өглөө (HTTP ${response.status})` },
        { status: 502 },
      );
    }

    const tin = String(payload.data ?? "").replace(/\D/g, "");

    if (!response.ok || payload.status !== 200 || !/^\d{11,14}$/.test(tin)) {
      return NextResponse.json(
        { message: payload.msg || `Байгууллагын TIN мэдээлэл олдсонгүй (HTTP ${response.status})` },
        { status: 404 },
      );
    }

    return NextResponse.json({ regNo, tin });
  } catch (error) {
    console.error("eBarimt TIN lookup error", error);
    const detail = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json(
      { message: `eBarimt TIN лавлагаатай холбогдож чадсангүй: ${detail}` },
      { status: 502 },
    );
  }
}
