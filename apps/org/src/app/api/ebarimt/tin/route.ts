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

function buildInfoApiUrl(baseUrl: string, endpointName: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  const root = normalized.includes("/api/info/check/")
    ? normalized.replace(/\/api\/info\/check\/[^/?#]+.*$/i, "")
    : normalized;
  return new URL(`${root}/api/info/check/${endpointName}`);
}

function buildTinLookupUrl(baseUrl: string, regNo: string) {
  const url = buildInfoApiUrl(baseUrl, "getTinInfo");
  url.searchParams.set("regNo", regNo);
  return url;
}

function buildTaxpayerInfoUrl(baseUrl: string, tin: string) {
  const url = buildInfoApiUrl(baseUrl, "getInfo");
  url.searchParams.set("tin", tin);
  return url;
}

export async function GET(request: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_EBARIMT_ENABLED !== "true"
  ) {
    return NextResponse.json(
      { message: "eBarimt идэвхгүй байна" },
      { status: 503 },
    );
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
    const baseUrl =
      process.env.EBARIMT_INFO_API_URL || "https://api.ebarimt.mn";
    const response = await fetch(buildTinLookupUrl(baseUrl, regNo), {
      cache: "no-store",
    });
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

    const infoResponse = await fetch(buildTaxpayerInfoUrl(baseUrl, tin), {
      cache: "no-store",
    });
    const infoRaw = await infoResponse.text();
    let infoPayload: TaxpayerInfoResponse;
    try {
      infoPayload = JSON.parse(infoRaw) as TaxpayerInfoResponse;
    } catch {
      return NextResponse.json(
        { message: "Байгууллагын нэрийн лавлагааны хариу буруу байна" },
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
        { message: infoPayload.msg || "Байгууллагын нэр олдсонгүй" },
        { status: 404 },
      );
    }

    return NextResponse.json({ regNo, tin, name });
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
