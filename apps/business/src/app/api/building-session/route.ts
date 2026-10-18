import { NextResponse } from "next/server";
import {
  buildingApiBase,
  buildingToken,
  sameOrigin,
  SESSION_COOKIE,
  unavailable,
} from "@/lib/server/building-session";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { message: "Хүсэлтийн эх сурвалж буруу байна" },
      { status: 403 },
    );
  try {
    const body: unknown = await request.json();
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
    const upstream = await fetch(`${buildingApiBase}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    const data = (await upstream.json()) as {
      accessToken?: string;
      message?: string;
      user?: { fullName?: string; permissions?: string[] };
    };
    if (!upstream.ok)
      return NextResponse.json(
        { message: data.message || "Нэвтрэх боломжгүй байна" },
        { status: upstream.status },
      );
    if (!data.accessToken)
      return NextResponse.json(
        { message: "Нэвтэрч чадсангүй" },
        { status: 401 },
      );
    const access = await fetch(`${buildingApiBase}/api/building/session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${data.accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!access.ok)
      return NextResponse.json(
        {
          message:
            access.status === 403
              ? "Барилгын байгууллагын эрх байхгүй байна. Доорх Бүртгүүлэх холбоосоор байгууллагаа нэмнэ үү."
              : "Эрх шалгахад алдаа гарлаа",
        },
        { status: access.status },
      );
    const session = (await access.json()) as { accessToken: string };
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(SESSION_COOKIE, session.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });
    return response;
  } catch {
    return unavailable();
  }
}
export async function GET() {
  const token = await buildingToken();
  if (!token)
    return NextResponse.json({ authenticated: false }, { status: 401 });
  try {
    const response = await fetch(
      `${buildingApiBase}/api/building/admin/projects`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    return NextResponse.json(
      { authenticated: response.ok },
      { status: response.ok ? 200 : response.status },
    );
  } catch {
    return unavailable();
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { message: "Хүсэлтийн эх сурвалж буруу байна" },
      { status: 403 },
    );
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
