import { NextRequest, NextResponse } from "next/server";

type TinLookupResponse = {
  status?: number;
  msg?: string;
  data?: string | number | null;
};

type TaxpayerInfoResponse = {
  status?: number;
  msg?: string;
  data?: {
    name?: string | null;
    found?: boolean;
  } | null;
};

function buildInfoApiUrl(rawBaseUrl: string, endpointName: string) {
  const configured = rawBaseUrl.trim().replace(/\/+$/, "");
  const baseUrl = configured.includes("/api/info/check/")
    ? configured.replace(/\/api\/info\/check\/[^/?#]+.*$/i, "")
    : configured;
  return new URL(`${baseUrl}/api/info/check/${endpointName}`);
}

function buildTinLookupUrl(rawBaseUrl: string, regNo: string) {
  const url = buildInfoApiUrl(rawBaseUrl, "getTinInfo");
  url.searchParams.set("regNo", regNo);
  return url;
}

function buildTaxpayerInfoUrl(rawBaseUrl: string, tin: string) {
  const url = buildInfoApiUrl(rawBaseUrl, "getInfo");
  url.searchParams.set("tin", tin);
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

  const baseUrl = String(
    process.env.EBARIMT_INFO_API_URL || "https://api.ebarimt.mn",
  ).trim();

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

    const infoResponse = await fetch(buildTaxpayerInfoUrl(baseUrl, tin), {
      cache: "no-store",
    });
    const infoText = await infoResponse.text();
    let infoPayload: TaxpayerInfoResponse;
    try {
      infoPayload = JSON.parse(infoText) as TaxpayerInfoResponse;
    } catch {
      return NextResponse.json(
        {
          message: `Байгууллагын нэрийн лавлагаа JSON бус хариу өглөө (HTTP ${infoResponse.status})`,
        },
        { status: 502 },
      );
    }

    const name = String(infoPayload.data?.name ?? "").trim();
    if (
      !infoResponse.ok ||
      infoPayload.status !== 200 ||
      infoPayload.data?.found === false ||
      !name
    ) {
      return NextResponse.json(
        {
          message:
            infoPayload.msg ||
            `Байгууллагын нэр олдсонгүй (HTTP ${infoResponse.status})`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ regNo, tin, name });
  } catch (error) {
    console.error("eBarimt TIN lookup error", error);
    const detail = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json(
      { message: `eBarimt TIN лавлагаатай холбогдож чадсангүй: ${detail}` },
      { status: 502 },
    );
  }
}
