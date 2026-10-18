import { businessSameOrigin } from "./request-origin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export const WORKFORCE_COOKIE = "mgl_workforce_session";
export const workforceApiBase = (
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://mgl-api.onrender.com"
    : "http://localhost:4000")
).replace(/\/$/, "");
export async function workforceToken() {
  return (await cookies()).get(WORKFORCE_COOKIE)?.value;
}
export const workforceSameOrigin = businessSameOrigin;
export function workforceUnavailable() {
  return NextResponse.json(
    {
      message:
        "Цаг удирдлагын сервертэй холбогдож чадсангүй. Дахин оролдоно уу.",
    },
    { status: 503 },
  );
}
