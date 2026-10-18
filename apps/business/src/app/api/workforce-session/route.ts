import { NextResponse } from "next/server";
import {
  WORKFORCE_COOKIE,
  workforceApiBase,
  workforceSameOrigin,
  workforceToken,
  workforceUnavailable,
} from "@/lib/server/workforce-session";
export async function POST(request: Request) {
  if (!workforceSameOrigin(request))
    return NextResponse.json(
      { message: "Хүсэлтийн эх сурвалж буруу" },
      { status: 403 },
    );
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Мэдээлэл буруу" }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("email" in body) ||
    !("password" in body) ||
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    body.email.length > 254 ||
    body.password.length > 1024
  )
    return NextResponse.json(
      { message: "Нэвтрэх мэдээллээ шалгана уу" },
      { status: 400 },
    );
  try {
    const upstream = await fetch(`${workforceApiBase}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const result = (await upstream.json()) as {
      accessToken?: string;
      message?: string;
    };
    if (!upstream.ok || !result.accessToken)
      return NextResponse.json(
        { message: result.message || "Нэвтэрч чадсангүй" },
        { status: upstream.ok ? 401 : upstream.status },
      );
    const check = await fetch(`${workforceApiBase}/api/workforce/session`, {
      headers: { Authorization: `Bearer ${result.accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const session: unknown = await check.json();
    if (!check.ok) return NextResponse.json(session, { status: check.status });
    const response = NextResponse.json(session);
    response.cookies.set(WORKFORCE_COOKIE, result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });
    return response;
  } catch {
    return workforceUnavailable();
  }
}
export async function GET() {
  const token = await workforceToken();
  if (!token)
    return NextResponse.json({ message: "Нэвтэрнэ үү" }, { status: 401 });
  try {
    const result = await fetch(`${workforceApiBase}/api/workforce/session`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    return NextResponse.json((await result.json()) as unknown, {
      status: result.status,
    });
  } catch {
    return workforceUnavailable();
  }
}
export async function DELETE(request: Request) {
  if (!workforceSameOrigin(request))
    return NextResponse.json(
      { message: "Хүсэлтийн эх сурвалж буруу" },
      { status: 403 },
    );
  const response = NextResponse.json({ ok: true });
  response.cookies.set(WORKFORCE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
