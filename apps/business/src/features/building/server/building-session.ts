import { businessApiBase } from "@/shared/server/api-config";
import { businessSameOrigin } from "@/shared/server/request-origin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export { BUILDING_SESSION_COOKIE as SESSION_COOKIE } from "@/shared/server/session-cookies";
import { BUILDING_SESSION_COOKIE as SESSION_COOKIE } from "@/shared/server/session-cookies";
export const buildingApiBase = businessApiBase;
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
