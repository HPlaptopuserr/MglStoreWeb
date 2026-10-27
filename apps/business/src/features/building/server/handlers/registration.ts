import { NextResponse } from "next/server";
import {
  buildingApiBase,
  sameOrigin,
  unavailable,
} from "@/features/building/server/building-session";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { message: "Хүсэлтийн эх сурвалж буруу байна" },
      { status: 403 },
    );
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Мэдээллээ шалгана уу" },
      { status: 400 },
    );
  }
  try {
    const response = await fetch(`${buildingApiBase}/api/building/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    return NextResponse.json(await response.json(), {
      status: response.status,
    });
  } catch {
    return unavailable();
  }
}
