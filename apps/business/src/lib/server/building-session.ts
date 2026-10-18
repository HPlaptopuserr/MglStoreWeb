import { businessSameOrigin } from "./request-origin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export const SESSION_COOKIE = "mgl_building_session";
export const buildingApiBase = (
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://mgl-api.onrender.com"
    : "http://localhost:4000")
).replace(/\/$/, "");
export async function buildingToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
export const sameOrigin = businessSameOrigin;
export function unavailable() {
  return NextResponse.json(
    { message: "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу." },
    { status: 503 },
  );
}
