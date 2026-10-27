import { businessApiBase } from "@/shared/server/api-config";
import { businessSameOrigin } from "@/shared/server/request-origin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export { WORKFORCE_SESSION_COOKIE as WORKFORCE_COOKIE } from "@/shared/server/session-cookies";
import { WORKFORCE_SESSION_COOKIE as WORKFORCE_COOKIE } from "@/shared/server/session-cookies";
export const workforceApiBase = businessApiBase;
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
