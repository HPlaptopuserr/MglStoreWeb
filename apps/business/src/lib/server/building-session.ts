import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export const SESSION_COOKIE = "mgl_building_session";
export const buildingApiBase = (
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"
).replace(/\/$/, "");
export async function buildingToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}
export function unavailable() {
  return NextResponse.json(
    { message: "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу." },
    { status: 503 },
  );
}
