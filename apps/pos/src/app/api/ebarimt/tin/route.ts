import { NextRequest, NextResponse } from "next/server";

type TinLookupResponse = {
  status?: number;
  msg?: string;
  data?: string | number | null;
};

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

  const baseUrl = String(process.env.EBARIMT_INFO_API_URL || "").replace(/\/$/, "");
  if (!baseUrl) {
    return NextResponse.json(
      { message: "eBarimt TIN лавлагааны хаяг тохируулагдаагүй байна" },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `${baseUrl}/api/info/check/getTinInfo?regNo=${encodeURIComponent(regNo)}`,
      { cache: "no-store" },
    );
    const payload = (await response.json()) as TinLookupResponse;
    const tin = String(payload.data ?? "").replace(/\D/g, "");

    if (!response.ok || payload.status !== 200 || !/^\d{11,14}$/.test(tin)) {
      return NextResponse.json(
        { message: payload.msg || "Байгууллагын TIN мэдээлэл олдсонгүй" },
        { status: 404 },
      );
    }

    return NextResponse.json({ regNo, tin });
  } catch (error) {
    console.error("eBarimt TIN lookup error", error);
    return NextResponse.json(
      { message: "eBarimt TIN лавлагаатай холбогдож чадсангүй" },
      { status: 502 },
    );
  }
}
