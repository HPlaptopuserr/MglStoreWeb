import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { businessApiBase } from "@/shared/server/api-config";
import { businessSameOrigin } from "@/shared/server/request-origin";
import {
  BUILDING_SESSION_COOKIE,
  WORKFORCE_SESSION_COOKIE,
} from "@/shared/server/session-cookies";
import {
  accountContext,
  normalizeRecoveryPhone,
  passwordError,
} from "../model/password";
import { readChallenge, signChallenge } from "./recovery-cookie";
const challengeCookie = "mgl_password_challenge";
const resetCookie = "mgl_password_reset";
const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/account/password",
};
function reply(message: string, status = 400) {
  return NextResponse.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
async function upstream(path: string, body: object, token?: string) {
  const response = await fetch(`${businessApiBase}/auth/${path}`, {
    method: token ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data: unknown = await response.json();
  if (!data || typeof data !== "object")
    throw new Error("Invalid API response");
  return { response, data: data as Record<string, unknown> };
}
export async function POST(request: Request) {
  if (!businessSameOrigin(request))
    return reply("Хүсэлтийн эх сурвалж буруу.", 403);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply("Мэдээлэл буруу.");
  }
  if (!body || typeof body !== "object" || !("action" in body))
    return reply("Мэдээлэл буруу.");
  const input = body as Record<string, unknown>;
  const jar = await cookies();
  try {
    if (input.action === "start") {
      const phone =
        typeof input.phone === "string" && input.phone.length <= 32
          ? normalizeRecoveryPhone(input.phone)
          : null;
      if (!phone)
        return reply("Бүртгэлтэй 8 оронтой утасны дугаараа оруулна уу.");
      // Check configuration before creating a paid provider session.
      signChallenge({
        phone,
        sessionId: "check",
        expiresAt: Date.now() + 300000,
      });
      const { response, data } = await upstream("forgot-password", { phone });
      if (!response.ok)
        return reply(
          response.status === 429
            ? "Олон хүсэлт илгээсэн байна. Түр хүлээгээд дахин оролдоно уу."
            : "Баталгаажуулалт эхэлсэнгүй. Бүртгэлтэй дугаар болон үйлчилгээний тохиргоог шалгана уу.",
          response.status,
        );
      const session = data.session;
      if (
        !session ||
        typeof session !== "object" ||
        !("sessionId" in session) ||
        typeof session.sessionId !== "string" ||
        !("shortcode" in session) ||
        typeof session.shortcode !== "string" ||
        !("text" in session) ||
        typeof session.text !== "string" ||
        !("expiresAt" in session) ||
        typeof session.expiresAt !== "string"
      )
        throw new Error("Invalid session");
      const expiresAt = Math.min(
        Date.parse(session.expiresAt),
        Date.now() + 300000,
      );
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now())
        throw new Error("Expired session");
      const result = NextResponse.json(
        {
          shortcode: session.shortcode,
          text: session.text,
          expiresAt: new Date(expiresAt).toISOString(),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
      result.cookies.set(
        challengeCookie,
        signChallenge({ phone, sessionId: session.sessionId, expiresAt }),
        { ...options, maxAge: Math.floor((expiresAt - Date.now()) / 1000) },
      );
      result.cookies.set(resetCookie, "", { ...options, maxAge: 0 });
      return result;
    }
    if (input.action === "verify") {
      const challenge = readChallenge(jar.get(challengeCookie)?.value);
      if (!challenge)
        return reply("Баталгаажуулах хугацаа дууссан. Дахин эхлүүлнэ үү.", 410);
      const { response, data } = await upstream(
        "forgot-password/verify-mn/complete",
        { phone: challenge.phone, sessionId: challenge.sessionId },
      );
      if (!response.ok)
        return reply(
          response.status === 429
            ? "Түр хүлээгээд дахин шалгана уу."
            : "SMS хараахан баталгаажаагүй байна. Зөв дугаараас илгээсэн эсэхээ шалгана уу.",
          response.status,
        );
      if (typeof data.resetToken !== "string")
        throw new Error("Missing reset token");
      const result = reply("Утасны дугаар баталгаажлаа.", 200);
      result.cookies.set(resetCookie, data.resetToken, {
        ...options,
        maxAge: 600,
      });
      result.cookies.set(challengeCookie, "", { ...options, maxAge: 0 });
      return result;
    }
    if (input.action !== "reset" && input.action !== "change")
      return reply("Үйлдэл буруу.");
    if (
      typeof input.password !== "string" ||
      typeof input.confirmation !== "string"
    )
      return reply("Шинэ нууц үгээ оруулна уу.");
    const validation = passwordError(input.password, input.confirmation);
    if (validation) return reply(validation);
    let result: Awaited<ReturnType<typeof upstream>>;
    if (input.action === "change") {
      const context = accountContext(input.context);
      const token = jar.get(
        context === "workforce"
          ? WORKFORCE_SESSION_COOKIE
          : BUILDING_SESSION_COOKIE,
      )?.value;
      if (!token) return reply("Эхлээд бүртгэлээрээ нэвтэрнэ үү.", 401);
      if (
        typeof input.currentPassword !== "string" ||
        !input.currentPassword ||
        input.currentPassword.length > 1024
      )
        return reply("Одоогийн нууц үгээ оруулна уу.");
      result = await upstream(
        "web/change-password",
        { currentPassword: input.currentPassword, newPassword: input.password },
        token,
      );
    } else {
      const resetToken = jar.get(resetCookie)?.value;
      if (!resetToken)
        return reply("Баталгаажуулалтаа дахин эхлүүлнэ үү.", 410);
      result = await upstream("reset-password", {
        resetToken,
        password: input.password,
      });
    }
    if (!result.response.ok)
      return reply(
        typeof result.data.message === "string"
          ? result.data.message
          : "Нууц үг солиход алдаа гарлаа.",
        result.response.status,
      );
    const response = reply("Нууц үг амжилттай шинэчлэгдлээ.", 200);
    response.cookies.set(resetCookie, "", { ...options, maxAge: 0 });
    response.cookies.set(challengeCookie, "", { ...options, maxAge: 0 });
    return response;
  } catch {
    return reply(
      "Үйлчилгээтэй холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу.",
      503,
    );
  }
}
