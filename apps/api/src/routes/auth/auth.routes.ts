import { Router, type Router as ExpressRouter } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { isAdminRole, ADMIN_ROLE_LABELS, getPlatformPermissions } from "@mgl/types";
import { resolveOrganization, requireAuth, type AuthPayload } from "../../middleware/auth";
import { isSmtpConfigured, sendSmtpMail } from "../../lib/smtp";

const router: ExpressRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? (() => { throw new Error("FATAL: JWT_SECRET not set"); })() : "dev-secret-change-me");
const VERIFY_MN_API_BASE = "https://api.verify.mn";

type VerifyMnSessionResponse = {
  sessionId: string;
  phone: string;
  shortcode: string;
  text: string;
  smsUri: string;
  displayInstruction: string;
  expiresAt: string;
};

type VerifyMnStatusResponse = {
  sessionId: string;
  phone: string;
  sessionStatus: "PENDING" | "VERIFIED" | "EXPIRED";
  callbackStatus?: "PENDING" | "SENT" | "FAILED";
  verifiedAt?: string | null;
  expiresAt: string;
};

type WebEmailOtpPurpose =
  | "web-email-login"
  | "web-password-reset"
  | "admin-password-reset"
  | "vendor-password-reset";

type WebEmailOtpChallenge = {
  purpose: WebEmailOtpPurpose;
  userId: string;
  email: string;
  codeHash: string;
};

async function createPasswordResetToken(userId: string) {
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return resetToken;
}

function hashEmailOtp(code: string, userId: string) {
  return crypto
    .createHash("sha256")
    .update(`${code}.${userId}.${JWT_SECRET}`)
    .digest("hex");
}

function createEmailOtpChallenge(
  user: { id: string; email: string },
  purpose: WebEmailOtpPurpose = "web-email-login",
) {
  const code = crypto.randomInt(100000, 999999).toString();
  const challengeToken = jwt.sign(
    {
      purpose,
      userId: user.id,
      email: user.email,
      codeHash: hashEmailOtp(code, user.id),
    } satisfies WebEmailOtpChallenge,
    JWT_SECRET,
    { expiresIn: "10m" },
  );

  return { code, challengeToken, expiresIn: 10 * 60 };
}

function verifyEmailOtpChallenge(
  otpCode: unknown,
  challengeToken: unknown,
  purpose: WebEmailOtpPurpose,
) {
  if (!otpCode || !challengeToken) {
    throw new Error("EMAIL_OTP_REQUIRED");
  }

  let challenge: WebEmailOtpChallenge;
  try {
    challenge = jwt.verify(String(challengeToken), JWT_SECRET) as WebEmailOtpChallenge;
  } catch {
    throw new Error("EMAIL_OTP_EXPIRED");
  }

  if (challenge.purpose !== purpose) {
    throw new Error("EMAIL_OTP_INVALID_PURPOSE");
  }

  const expectedHash = hashEmailOtp(String(otpCode).trim(), challenge.userId);
  if (expectedHash !== challenge.codeHash) {
    throw new Error("EMAIL_OTP_INVALID_CODE");
  }

  return challenge;
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

async function sendWebLoginOtpEmail(email: string, code: string) {
  await sendSmtpMail({
    to: email,
    subject: "MGL Store нэвтрэх баталгаажуулах код",
    text: [
      `Таны MGL Store нэвтрэх баталгаажуулах код: ${code}`,
      "",
      "Энэ код 10 минут хүчинтэй.",
      "Хэрэв та нэвтрэх гэж оролдоогүй бол энэ имэйлийг үл тооно уу.",
    ].join("\n"),
  });
}

async function sendPasswordResetOtpEmail(email: string, code: string) {
  await sendSmtpMail({
    to: email,
    subject: "MGL Store нууц үг сэргээх код",
    text: [
      `Таны MGL Store нууц үг сэргээх код: ${code}`,
      "",
      "Энэ код 10 минут хүчинтэй.",
      "Хэрэв та нууц үг сэргээх хүсэлт илгээгээгүй бол энэ имэйлийг үл тооно уу.",
    ].join("\n"),
  });
}

function normalizeWebIdentifier(email?: string, phone?: string) {
  const identifier = (email || phone || "").trim();
  const isPhone = /^[0-9+\-\s()]{7,16}$/.test(identifier) && !identifier.includes("@");
  const digits = identifier.replace(/[^\d]/g, "");
  return {
    identifier: isPhone && digits.startsWith("976") && digits.length === 11
      ? digits.slice(3)
      : isPhone
        ? digits
        : identifier.toLowerCase(),
    isPhone,
  };
}

function normalizePhoneDigits(phone?: string | null) {
  const digits = (phone || "").replace(/[^\d]/g, "");
  return digits.startsWith("976") && digits.length === 11 ? digits.slice(3) : digits;
}

async function findWebUserByIdentifier(identifier: string, isPhone: boolean) {
  if (isPhone) {
    return prisma.user.findFirst({
      where: { profile: { phoneNumber: identifier } },
      include: { profile: true },
    });
  }

  return prisma.user.findUnique({
    where: { email: identifier.toLowerCase() },
    include: { profile: true },
  });
}

async function findVendorUserByIdentifier(identifier: string, isPhone: boolean) {
  if (isPhone) {
    const users = await prisma.user.findMany({
      where: { profile: { phoneNumber: identifier } },
      include: { profile: true },
      orderBy: { createdAt: "desc" },
    });

    for (const user of users) {
      const orgInfo = await resolveOrganization(user.id);
      if (orgInfo) return user;
    }

    return null;
  }

  const user = await findWebUserByIdentifier(identifier, isPhone);
  if (!user) return null;

  const orgInfo = await resolveOrganization(user.id);
  return orgInfo ? user : null;
}

async function findAdminUserByIdentifier(identifier: string, isPhone: boolean) {
  const user = isPhone
    ? await prisma.user.findFirst({
        where: { profile: { phoneNumber: identifier } },
        include: { profile: true },
      })
    : await prisma.user.findUnique({
        where: { email: identifier.toLowerCase() },
        include: { profile: true },
      });

  return user && isAdminRole(user.role) ? user : null;
}

async function createVerifyMnSession(phone: string): Promise<VerifyMnSessionResponse> {
  const apiKey = process.env.VERIFY_MN_API_KEY;
  const callback =
    process.env.VERIFY_MN_CALLBACK_URL ||
    (process.env.API_PUBLIC_URL
      ? `${process.env.API_PUBLIC_URL.replace(/\/$/, "")}/auth/web/verify-mn/callback`
      : "");

  if (!apiKey) {
    throw new Error("VERIFY_MN_API_KEY is not configured");
  }

  if (!callback) {
    throw new Error("VERIFY_MN_CALLBACK_URL is not configured");
  }

  const nonce = crypto.randomInt(100000, 999999).toString();
  const res = await fetch(`${VERIFY_MN_API_BASE}/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
      text: nonce,
      callback,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Verify.mn session failed with ${res.status}`);
  }

  return data as VerifyMnSessionResponse;
}

async function getVerifyMnSessionStatus(sessionId: string): Promise<VerifyMnStatusResponse> {
  const apiKey = process.env.VERIFY_MN_API_KEY;

  if (!apiKey) {
    throw new Error("VERIFY_MN_API_KEY is not configured");
  }

  const res = await fetch(`${VERIFY_MN_API_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Verify.mn status failed with ${res.status}`);
  }

  return data as VerifyMnStatusResponse;
}

function createWebAccessToken(user: any, orgInfo?: Awaited<ReturnType<typeof resolveOrganization>>) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: orgInfo?.organizationId || null,
      orgRole: orgInfo?.orgRole || null,
    },
    JWT_SECRET,
    { expiresIn: "1d" },
  );
}

function toWebAuthResponse(user: any, accessToken: string, orgInfo?: Awaited<ReturnType<typeof resolveOrganization>>) {
  const safeEmail = user.email?.endsWith("@temp.local") ? null : user.email;

  return {
    accessToken,
    user: {
      id: user.id,
      email: safeEmail,
      role: user.role,
      orgRole: orgInfo?.orgRole || null,
      fullName: user.profile?.fullName || "",
      phone: user.profile?.phoneNumber || null,
      organizationId: orgInfo?.organizationId || null,
    },
  };
}

// ── GET /auth/me — Return current user profile from token ──────────────
router.get("/me", requireAuth, async (req, res) => {
  try {
    const { userId } = (req as any).user as AuthPayload;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    const orgInfo = await resolveOrganization(user.id);
    const safeEmail = user.email?.endsWith("@temp.local") ? null : user.email;

    return res.json({
      id: user.id,
      email: safeEmail,
      role: user.role,
      orgRole: orgInfo?.orgRole || null,
      fullName: user.profile?.fullName || "",
      phone: user.profile?.phoneNumber || null,
      organizationId: orgInfo?.organizationId || null,
    });
  } catch (error) {
    console.error("[auth/me error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email болон password шаардлагатай",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { profile: true },
    });

    if (!user) {
      return res.status(401).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Хэрэглэгч идэвхгүй байна" });
    }

    if (!isAdminRole(user.role)) {
      return res.status(403).json({ message: "Admin эрхгүй байна" });
    }

    if (!user.passwordHash) {
      return res
        .status(401)
        .json({ message: "Нууц үг тохируулаагүй байна" });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Нууц үг буруу байна" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        roleLabel: ADMIN_ROLE_LABELS[user.role] || user.role,
        fullName: user.profile?.fullName || "",
        permissions: getPlatformPermissions(user.role),
      },
    });
  } catch (error) {
    console.error("[admin login error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

router.post("/admin/forgot-password", async (req, res) => {
  try {
    const { email, phone } = req.body;
    const identifier: string | undefined = email || phone;

    if (!identifier) {
      return res.status(400).json({
        message: "Имэйл эсвэл утасны дугаар шаардлагатай",
      });
    }

    const normalized = normalizeWebIdentifier(email, phone);
    const user = await findAdminUserByIdentifier(normalized.identifier, normalized.isPhone);

    if (!user) {
      return res.status(404).json({ message: "Admin хэрэглэгч олдсонгүй" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Admin хэрэглэгч идэвхгүй байна" });
    }

    if (!normalized.isPhone) {
      if (!isSmtpConfigured()) {
        return res.status(500).json({ message: "SMTP тохиргоо хийгдээгүй байна" });
      }

      const challenge = createEmailOtpChallenge(
        { id: user.id, email: user.email },
        "admin-password-reset",
      );
      await sendPasswordResetOtpEmail(user.email, challenge.code);

      return res.json({
        message: "Нууц үг сэргээх код имэйл рүү илгээгдлээ",
        channel: "emailOtp",
        challengeToken: challenge.challengeToken,
        emailMasked: maskEmail(user.email),
        expiresIn: challenge.expiresIn,
      });
    }

    const session = await createVerifyMnSession(normalized.identifier);
    return res.json({
      message: "Verify.mn баталгаажуулалт эхэллээ",
      channel: "verifyMn",
      session,
    });
  } catch (error) {
    console.error("[admin forgot-password error]", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Сервер дээр алдаа гарлаа",
    });
  }
});

router.post("/admin/forgot-password/verify-mn/complete", async (req, res) => {
  try {
    const { phone, sessionId } = req.body;
    const { identifier, isPhone } = normalizeWebIdentifier(undefined, phone);

    if (!isPhone || !identifier || !sessionId) {
      return res.status(400).json({ message: "Утасны дугаар болон sessionId шаардлагатай." });
    }

    const user = await findAdminUserByIdentifier(identifier, true);
    if (!user) {
      return res.status(404).json({ message: "Admin хэрэглэгч олдсонгүй" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Admin хэрэглэгч идэвхгүй байна" });
    }

    const status = await getVerifyMnSessionStatus(sessionId);
    const statusPhone = normalizePhoneDigits(status.phone);
    if (statusPhone && statusPhone !== identifier) {
      return res.status(400).json({ message: "Баталгаажуулсан дугаар таарахгүй байна." });
    }

    if (status.sessionStatus !== "VERIFIED") {
      return res.status(400).json({
        message: status.sessionStatus === "EXPIRED"
          ? "Баталгаажуулах хугацаа дууссан байна."
          : "SMS баталгаажуулалт хараахан ирээгүй байна.",
        status: status.sessionStatus,
      });
    }

    const resetToken = await createPasswordResetToken(user.id);
    return res.json({
      message: "Утас баталгаажлаа",
      resetToken,
    });
  } catch (error) {
    console.error("[admin forgot-password verify.mn complete error]", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Verify.mn баталгаажуулахад алдаа гарлаа",
    });
  }
});

router.post("/admin/forgot-password/email/complete", async (req, res) => {
  try {
    const { otpCode, challengeToken } = req.body;

    let challenge: WebEmailOtpChallenge;
    try {
      challenge = verifyEmailOtpChallenge(otpCode, challengeToken, "admin-password-reset");
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "EMAIL_OTP_REQUIRED") {
        return res.status(400).json({ message: "Баталгаажуулах код шаардлагатай" });
      }
      if (code === "EMAIL_OTP_EXPIRED") {
        return res.status(400).json({ message: "Баталгаажуулах кодын хугацаа дууссан байна" });
      }
      if (code === "EMAIL_OTP_INVALID_CODE") {
        return res.status(400).json({ message: "Баталгаажуулах код буруу байна" });
      }
      return res.status(400).json({ message: "Баталгаажуулах хүсэлт буруу байна" });
    }

    const user = await prisma.user.findUnique({
      where: { id: challenge.userId },
    });

    if (!user || !user.isActive || user.email !== challenge.email || !isAdminRole(user.role)) {
      return res.status(401).json({ message: "Admin нууц үг сэргээх эрх баталгаажаагүй байна" });
    }

    const resetToken = await createPasswordResetToken(user.id);
    return res.json({
      message: "Имэйл баталгаажлаа",
      resetToken,
    });
  } catch (error) {
    console.error("[admin forgot-password email complete error]", error);
    return res.status(500).json({ message: "Имэйл код баталгаажуулахад алдаа гарлаа" });
  }
});

router.post("/vendor/forgot-password", async (req, res) => {
  try {
    const { email, phone } = req.body;
    const identifier: string | undefined = email || phone;

    if (!identifier) {
      return res.status(400).json({
        message: "И-мэйл эсвэл утасны дугаар шаардлагатай",
      });
    }

    const normalized = normalizeWebIdentifier(email, phone);
    const user = await findVendorUserByIdentifier(normalized.identifier, normalized.isPhone);

    if (!user) {
      return res.status(404).json({ message: "Нийлүүлэгч хэрэглэгч олдсонгүй" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Нийлүүлэгч хэрэглэгч идэвхгүй байна" });
    }

    if (!normalized.isPhone) {
      if (!isSmtpConfigured()) {
        return res.status(500).json({ message: "SMTP тохиргоо хийгдээгүй байна" });
      }

      const challenge = createEmailOtpChallenge(
        { id: user.id, email: user.email },
        "vendor-password-reset",
      );
      await sendPasswordResetOtpEmail(user.email, challenge.code);

      return res.json({
        message: "Нууц үг сэргээх код имэйл рүү илгээгдлээ",
        channel: "emailOtp",
        challengeToken: challenge.challengeToken,
        emailMasked: maskEmail(user.email),
        expiresIn: challenge.expiresIn,
      });
    }

    const session = await createVerifyMnSession(normalized.identifier);
    return res.json({
      message: "Verify.mn баталгаажуулалт эхэллээ",
      channel: "verifyMn",
      session,
    });
  } catch (error) {
    console.error("[vendor forgot-password error]", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Сервер дээр алдаа гарлаа",
    });
  }
});

router.post("/vendor/forgot-password/verify-mn/complete", async (req, res) => {
  try {
    const { phone, sessionId } = req.body;
    const { identifier, isPhone } = normalizeWebIdentifier(undefined, phone);

    if (!isPhone || !identifier || !sessionId) {
      return res.status(400).json({ message: "Утасны дугаар болон sessionId шаардлагатай." });
    }

    const user = await findVendorUserByIdentifier(identifier, true);
    if (!user) {
      return res.status(404).json({ message: "Нийлүүлэгч хэрэглэгч олдсонгүй" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Нийлүүлэгч хэрэглэгч идэвхгүй байна" });
    }

    const status = await getVerifyMnSessionStatus(sessionId);
    const statusPhone = normalizePhoneDigits(status.phone);
    if (statusPhone && statusPhone !== identifier) {
      return res.status(400).json({ message: "Баталгаажуулсан дугаар таарахгүй байна." });
    }

    if (status.sessionStatus !== "VERIFIED") {
      return res.status(400).json({
        message: status.sessionStatus === "EXPIRED"
          ? "Баталгаажуулах хугацаа дууссан байна."
          : "SMS баталгаажуулалт хараахан ирээгүй байна.",
        status: status.sessionStatus,
      });
    }

    const resetToken = await createPasswordResetToken(user.id);
    return res.json({
      message: "Утас баталгаажлаа",
      resetToken,
    });
  } catch (error) {
    console.error("[vendor forgot-password verify.mn complete error]", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Verify.mn баталгаажуулахад алдаа гарлаа",
    });
  }
});

router.post("/vendor/forgot-password/email/complete", async (req, res) => {
  try {
    const { otpCode, challengeToken } = req.body;

    let challenge: WebEmailOtpChallenge;
    try {
      challenge = verifyEmailOtpChallenge(otpCode, challengeToken, "vendor-password-reset");
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "EMAIL_OTP_REQUIRED") {
        return res.status(400).json({ message: "Баталгаажуулах код шаардлагатай" });
      }
      if (code === "EMAIL_OTP_EXPIRED") {
        return res.status(400).json({ message: "Баталгаажуулах кодын хугацаа дууссан байна" });
      }
      if (code === "EMAIL_OTP_INVALID_CODE") {
        return res.status(400).json({ message: "Баталгаажуулах код буруу байна" });
      }
      return res.status(400).json({ message: "Баталгаажуулах хүсэлт буруу байна" });
    }

    const user = await prisma.user.findUnique({
      where: { id: challenge.userId },
    });

    const orgInfo = user ? await resolveOrganization(user.id) : null;
    if (!user || !user.isActive || user.email !== challenge.email || !orgInfo) {
      return res.status(401).json({ message: "Нийлүүлэгч нууц үг сэргээх эрх баталгаажаагүй байна" });
    }

    const resetToken = await createPasswordResetToken(user.id);
    return res.json({
      message: "Имэйл баталгаажлаа",
      resetToken,
    });
  } catch (error) {
    console.error("[vendor forgot-password email complete error]", error);
    return res.status(500).json({ message: "Имэйл код баталгаажуулахад алдаа гарлаа" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    const identifier: string | undefined = email || phone;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "И-мэйл эсвэл утасны дугаар болон нууц үг шаардлагатай",
      });
    }

    const isPhone = /^[0-9+\-\s()]{7,15}$/.test(identifier.trim()) && !identifier.includes("@");

    let user;
    if (isPhone) {
      const phone = identifier.trim();

      // 1. Profile.phoneNumber-аар хай
      user = await prisma.user.findFirst({
        where: { profile: { phoneNumber: phone } },
        include: { profile: true },
      });

      // 2. Fallback: хуучин vendor-уудын хувьд RegistrationRequest-аас хай
      if (!user) {
        const regReq = await prisma.registrationRequest.findFirst({
          where: {
            phoneNumber: phone,
            approvedUserId: { not: null },
            status: "APPROVED",
          },
          select: { approvedUserId: true },
        });
        if (regReq?.approvedUserId) {
          user = await prisma.user.findUnique({
            where: { id: regReq.approvedUserId },
            include: { profile: true },
          });
        }
      }
    } else {
      user = await prisma.user.findUnique({
        where: { email: identifier.trim().toLowerCase() },
        include: { profile: true },
      });
    }

    if (!user) {
      return res.status(401).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Хэрэглэгч идэвхгүй байна" });
    }

    if (!user.passwordHash) {
      return res.status(401).json({
        message:
          "Нууц үг тохируулаагүй байна. Урилгын линкээр нууц үгээ тохируулна уу.",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Нууц үг буруу байна" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Determine effective role from OrganizationMember
    const orgInfo = await resolveOrganization(user.id);

    // Resolve org name
    let organizationName = "";
    if (orgInfo?.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: orgInfo.organizationId },
        select: { name: true },
      });
      organizationName = org?.name || "";
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: orgInfo?.organizationId || null,
        orgRole: orgInfo?.orgRole || null,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgRole: orgInfo?.orgRole || null,
        fullName: user.profile?.fullName || "",
        organizationId: orgInfo?.organizationId || null,
        organizationName,
      },
    });
  } catch (error) {
    console.error("[login error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

router.post("/vendor/login", async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    const identifier: string | undefined = email || phone;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "И-мэйл эсвэл утасны дугаар болон нууц үг шаардлагатай",
      });
    }

    const isPhone = /^[0-9+\-\s()]{7,15}$/.test(identifier.trim()) && !identifier.includes("@");
    const user = isPhone
      ? await prisma.user.findFirst({
          where: { profile: { phoneNumber: identifier.trim() } },
          include: { profile: true },
        })
      : await prisma.user.findUnique({
          where: { email: identifier.trim().toLowerCase() },
          include: { profile: true },
        });

    if (!user) {
      return res.status(401).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Хэрэглэгч идэвхгүй байна" });
    }

    if (!user.passwordHash) {
      return res.status(401).json({
        message: "Нууц үг тохируулаагүй байна. Урилгын линкээр нууц үгээ тохируулна уу.",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Нууц үг буруу байна" });
    }

    const orgInfo = await resolveOrganization(user.id);
    if (!orgInfo?.organizationId) {
      return res.status(403).json({ message: "Байгууллагад бүртгэлтэй хэрэглэгч биш байна" });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgInfo.organizationId },
      select: { name: true },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = createWebAccessToken(user, orgInfo);

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgRole: orgInfo.orgRole,
        fullName: user.profile?.fullName || "",
        phone: user.profile?.phoneNumber || null,
        organizationId: orgInfo.organizationId,
        organizationName: org?.name || "",
      },
    });
  } catch (error) {
    console.error("[vendor login error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

router.post("/web/verify-mn/start", async (req, res) => {
  try {
    const { email, phone, password, fullName, mode } = req.body;
    const { identifier, isPhone } = normalizeWebIdentifier(email, phone);

    if (!isPhone || !identifier) {
      return res.status(400).json({ message: "Verify.mn баталгаажуулалт утасны дугаараар хийгдэнэ." });
    }

    if (mode === "register") {
      if (!password || !fullName) {
        return res.status(400).json({ message: "Нэр болон нууц үг шаардлагатай." });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Нууц үг дор хаяж 6 тэмдэгт байх ёстой." });
      }

      const existingUser = await findWebUserByIdentifier(identifier, true);
      if (existingUser) {
        return res.status(409).json({ message: "Энэ утасны дугаар бүртгэгдсэн байна." });
      }
    } else {
      if (!password) {
        return res.status(400).json({ message: "Нууц үг шаардлагатай." });
      }

      const user = await findWebUserByIdentifier(identifier, true);
      if (!user) {
        return res.status(401).json({ message: "Хэрэглэгч олдсонгүй" });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "Хэрэглэгч идэвхгүй байна" });
      }

      if (isAdminRole(user.role)) {
        return res.status(403).json({ message: "Admin хэрэглэгч web нэвтрэлт ашиглах боломжгүй." });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ message: "Нууц үг тохируулаагүй байна." });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Нууц үг буруу байна" });
      }
    }

    const session = await createVerifyMnSession(identifier);
    return res.json(session);
  } catch (error) {
    console.error("[verify.mn start error]", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Verify.mn баталгаажуулалт эхлүүлэхэд алдаа гарлаа",
    });
  }
});

router.post("/web/verify-mn/complete", async (req, res) => {
  try {
    const { email, phone, password, fullName, mode, sessionId } = req.body;
    const { identifier, isPhone } = normalizeWebIdentifier(email, phone);

    if (!isPhone || !identifier || !sessionId) {
      return res.status(400).json({ message: "Утасны дугаар болон sessionId шаардлагатай." });
    }

    const status = await getVerifyMnSessionStatus(sessionId);
    const statusPhone = normalizePhoneDigits(status.phone);
    if (statusPhone && statusPhone !== identifier) {
      return res.status(400).json({ message: "Баталгаажуулсан дугаар таарахгүй байна." });
    }

    if (status.sessionStatus !== "VERIFIED") {
      return res.status(400).json({
        message: status.sessionStatus === "EXPIRED"
          ? "Баталгаажуулах хугацаа дууссан байна."
          : "SMS баталгаажуулалт хараахан ирээгүй байна.",
        status: status.sessionStatus,
      });
    }

    if (mode === "register") {
      if (!password || !fullName) {
        return res.status(400).json({ message: "Нэр болон нууц үг шаардлагатай." });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Нууц үг дор хаяж 6 тэмдэгт байх ёстой." });
      }

      const existingUser = await findWebUserByIdentifier(identifier, true);
      if (existingUser) {
        return res.status(409).json({ message: "Энэ утасны дугаар бүртгэгдсэн байна." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          email: `${Date.now()}@temp.local`,
          passwordHash,
          role: "USER",
          isActive: true,
          lastLoginAt: new Date(),
          profile: {
            create: {
              fullName: fullName.trim(),
              phoneNumber: identifier,
            },
          },
        },
        include: { profile: true },
      });

      return res.status(201).json(toWebAuthResponse(newUser, createWebAccessToken(newUser)));
    }

    if (!password) {
      return res.status(400).json({ message: "Нууц үг шаардлагатай." });
    }

    const user = await findWebUserByIdentifier(identifier, true);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Хэрэглэгч идэвхгүй байна" });
    }

    if (isAdminRole(user.role)) {
      return res.status(403).json({ message: "Admin хэрэглэгч web нэвтрэлт ашиглах боломжгүй." });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Нууц үг буруу байна" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const orgInfo = await resolveOrganization(user.id);
    return res.json(toWebAuthResponse(user, createWebAccessToken(user, orgInfo), orgInfo));
  } catch (error) {
    console.error("[verify.mn complete error]", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Verify.mn баталгаажуулахад алдаа гарлаа",
    });
  }
});

router.get("/web/verify-mn/callback", (req, res) => {
  console.log("[verify.mn callback]", req.query);
  return res.sendStatus(200);
});

router.post("/web/login", async (req, res) => {
  try {
    const { email, phone, password, otpCode, challengeToken } = req.body;
    const identifier: string | undefined = email || phone;

    if (otpCode || challengeToken) {
      if (!otpCode || !challengeToken) {
        return res.status(400).json({ message: "Баталгаажуулах код шаардлагатай" });
      }

      let challenge: WebEmailOtpChallenge;
      try {
        challenge = jwt.verify(challengeToken, JWT_SECRET) as WebEmailOtpChallenge;
      } catch {
        return res.status(400).json({ message: "Баталгаажуулах кодын хугацаа дууссан байна" });
      }

      if (challenge.purpose !== "web-email-login") {
        return res.status(400).json({ message: "Баталгаажуулах хүсэлт буруу байна" });
      }

      const expectedHash = hashEmailOtp(String(otpCode).trim(), challenge.userId);
      if (expectedHash !== challenge.codeHash) {
        return res.status(400).json({ message: "Баталгаажуулах код буруу байна" });
      }

      const user = await prisma.user.findUnique({
        where: { id: challenge.userId },
        include: { profile: true },
      });

      if (!user || !user.isActive || isAdminRole(user.role)) {
        return res.status(401).json({ message: "Нэвтрэх эрх баталгаажсангүй" });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), emailVerified: true },
      });

      const orgInfo = await resolveOrganization(user.id);
      return res.json(toWebAuthResponse(user, createWebAccessToken(user, orgInfo), orgInfo));
    }

    if (!identifier || !password) {
      return res.status(400).json({
        message: "И-мэйл эсвэл утасны дугаар болон нууц үг шаардлагатай",
      });
    }

    const normalized = normalizeWebIdentifier(email, phone);
    const isPhone = normalized.isPhone;

    let user;
    if (isPhone) {
      user = await findWebUserByIdentifier(normalized.identifier, true);
    } else {
      user = await prisma.user.findUnique({
        where: { email: normalized.identifier },
        include: { profile: true },
      });
    }

    if (!user) {
      return res.status(401).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Хэрэглэгч идэвхгүй байна" });
    }

    // Only block platform ADMIN from web login (they use /admin/login)
    if (isAdminRole(user.role)) {
      return res.status(403).json({
        message: "Admin хэрэглэгч web нэвтрэлт ашиглах боломжгүй. Admin panel ашиглана уу.",
      });
    }

    if (!user.passwordHash) {
      return res.status(401).json({
        message: "Нууц үг тохируулаагүй байна.",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Нууц үг буруу байна" });
    }

    if (!isPhone) {
      if (!isSmtpConfigured()) {
        return res.status(500).json({ message: "SMTP тохиргоо хийгдээгүй байна" });
      }

      const challenge = createEmailOtpChallenge({ id: user.id, email: user.email });
      await sendWebLoginOtpEmail(user.email, challenge.code);

      return res.json({
        requiresEmailOtp: true,
        challengeToken: challenge.challengeToken,
        emailMasked: maskEmail(user.email),
        expiresIn: challenge.expiresIn,
        message: "Баталгаажуулах код имэйл рүү илгээгдлээ",
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const orgInfo = await resolveOrganization(user.id);

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: orgInfo?.organizationId || null,
        orgRole: orgInfo?.orgRole || null,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    const safeEmail = user.email?.endsWith("@temp.local") ? null : user.email;

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: safeEmail,
        role: user.role,
        orgRole: orgInfo?.orgRole || null,
        fullName: user.profile?.fullName || "",
        phone: user.profile?.phoneNumber || null,
        organizationId: orgInfo?.organizationId || null,
      },
    });
  } catch (error) {
    console.error("[web login error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

router.post("/web/register", async (req, res) => {
  try {
    const { email, phone, password, fullName } = req.body;
    const identifier: string | undefined = email || phone;

    // Validation
    if (!identifier || !password || !fullName) {
      return res.status(400).json({
        message: "И-мэйл эсвэл утасны дугаар, нууц үг, нэр шаардлагатай",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Нууц үг дор хаяж 6 тэмдэгт байх ёстой.",
      });
    }

    const isPhone = /^[0-9+\-\s()]{7,15}$/.test(identifier.trim()) && !identifier.includes("@");

    // Check if user already exists
    let existingUser;
    if (isPhone) {
      existingUser = await prisma.user.findFirst({
        where: { profile: { phoneNumber: identifier.trim() } },
        include: { profile: true },
      });
    } else {
      existingUser = await prisma.user.findUnique({
        where: { email: identifier.trim().toLowerCase() },
        include: { profile: true },
      });
    }

    if (existingUser) {
      if (isAdminRole(existingUser.role)) {
        return res.status(409).json({
          message: isPhone
            ? "Энэ утасны дугаар бүртгэгдсэн байна"
            : "Энэ и-мэйл бүртгэгдсэн байна",
        });
      }

      const existingHash = existingUser.passwordHash;

      if (!existingHash) {
        // Account exists but has no password (e.g. vendor pending setup)
        // Do not allow registration to hijack this account
        return res.status(409).json({
          message: isPhone
            ? "Энэ утасны дугаар бүртгэгдсэн байна"
            : "Энэ и-мэйл бүртгэгдсэн байна",
        });
      }

      const isValidPassword = await bcrypt.compare(password, existingHash);
      if (!isValidPassword) {
        return res.status(409).json({
          message:
            "Энэ и-мэйл/утсаар бүртгэлтэй байна. Нэвтрэхдээ тухайн бүртгэлийн нууц үгийг ашиглана уу.",
        });
      }

      const passwordHash = existingHash;

      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          isActive: true,
          lastLoginAt: new Date(),
          profile: {
            upsert: {
              create: {
                fullName: fullName.trim(),
                phoneNumber: phone ? phone.trim() : undefined,
              },
              update: {
                fullName: existingUser.profile?.fullName || fullName.trim(),
                phoneNumber:
                  existingUser.profile?.phoneNumber ||
                  (phone ? phone.trim() : undefined),
              },
            },
          },
        },
        include: { profile: true },
      });

      const accessToken = jwt.sign(
        {
          userId: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
        },
        JWT_SECRET,
        { expiresIn: "1d" },
      );

      const safeEmail = updatedUser.email?.endsWith("@temp.local") ? null : updatedUser.email;

      return res.status(200).json({
        accessToken,
        user: {
          id: updatedUser.id,
          email: safeEmail,
          role: updatedUser.role,
          fullName: updatedUser.profile?.fullName || "",
          phone: updatedUser.profile?.phoneNumber || null,
        },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: email ? email.trim().toLowerCase() : `${Date.now()}@temp.local`,
        passwordHash,
        role: "USER",
        isActive: true,
        lastLoginAt: new Date(),
        profile: {
          create: {
            fullName: fullName.trim(),
            phoneNumber: phone ? phone.trim() : "",
          },
        },
      },
      include: { profile: true },
    });

    const accessToken = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    const safeEmail = newUser.email?.endsWith("@temp.local") ? null : newUser.email;

    return res.status(201).json({
      accessToken,
      user: {
        id: newUser.id,
        email: safeEmail,
        role: newUser.role,
        fullName: newUser.profile?.fullName || "",
        phone: newUser.profile?.phoneNumber || null,
      },
    });
  } catch (error) {
    console.error("[web register error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

// ─── Forgot Password ───────────────────────────────────────────────────

router.post("/forgot-password", async (req, res) => {
  try {
    const { email, phone } = req.body;
    const identifier: string | undefined = email || phone;

    if (!identifier) {
      return res.status(400).json({
        message: "И-мэйл эсвэл утасны дугаар шаардлагатай",
      });
    }

    const normalized = normalizeWebIdentifier(email, phone);
    const isPhone = normalized.isPhone;

    if (!isPhone) {
      const user = await findWebUserByIdentifier(normalized.identifier, false);
      if (!user) {
        return res.status(404).json({ message: "Бүртгэлгүй хэрэглэгч байна" });
      }

      if (!isSmtpConfigured()) {
        return res.status(500).json({ message: "SMTP тохиргоо хийгдээгүй байна" });
      }

      const challenge = createEmailOtpChallenge(
        { id: user.id, email: user.email },
        "web-password-reset",
      );
      await sendPasswordResetOtpEmail(user.email, challenge.code);

      return res.json({
        message: "Нууц үг сэргээх код имэйл рүү илгээгдлээ",
        channel: "emailOtp",
        challengeToken: challenge.challengeToken,
        emailMasked: maskEmail(user.email),
        expiresIn: challenge.expiresIn,
      });
    }

    const user = await findWebUserByIdentifier(normalized.identifier, true);

    if (!user) {
      return res.status(404).json({ message: "Бүртгэлгүй хэрэглэгч байна" });
    }

    const session = await createVerifyMnSession(normalized.identifier);
    return res.json({
      message: "Verify.mn баталгаажуулалт эхэллээ",
      channel: "verifyMn",
      session,
    });
  } catch (error) {
    console.error("[forgot-password error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

router.post("/forgot-password/verify-mn/complete", async (req, res) => {
  try {
    const { phone, sessionId } = req.body;
    const { identifier, isPhone } = normalizeWebIdentifier(undefined, phone);

    if (!isPhone || !identifier || !sessionId) {
      return res.status(400).json({ message: "Утасны дугаар болон sessionId шаардлагатай." });
    }

    const user = await findWebUserByIdentifier(identifier, true);
    if (!user) {
      return res.status(404).json({ message: "Бүртгэлгүй хэрэглэгч байна" });
    }

    const status = await getVerifyMnSessionStatus(sessionId);
    const statusPhone = normalizePhoneDigits(status.phone);
    if (statusPhone && statusPhone !== identifier) {
      return res.status(400).json({ message: "Баталгаажуулсан дугаар таарахгүй байна." });
    }

    if (status.sessionStatus !== "VERIFIED") {
      return res.status(400).json({
        message: status.sessionStatus === "EXPIRED"
          ? "Баталгаажуулах хугацаа дууссан байна."
          : "SMS баталгаажуулалт хараахан ирээгүй байна.",
        status: status.sessionStatus,
      });
    }

    const resetToken = await createPasswordResetToken(user.id);
    return res.json({
      message: "Утас баталгаажлаа",
      resetToken,
    });
  } catch (error) {
    console.error("[forgot-password verify.mn complete error]", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Verify.mn баталгаажуулахад алдаа гарлаа",
    });
  }
});

router.post("/forgot-password/email/complete", async (req, res) => {
  try {
    const { otpCode, challengeToken } = req.body;

    let challenge: WebEmailOtpChallenge;
    try {
      challenge = verifyEmailOtpChallenge(otpCode, challengeToken, "web-password-reset");
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "EMAIL_OTP_REQUIRED") {
        return res.status(400).json({ message: "Баталгаажуулах код шаардлагатай" });
      }
      if (code === "EMAIL_OTP_EXPIRED") {
        return res.status(400).json({ message: "Баталгаажуулах кодын хугацаа дууссан байна" });
      }
      if (code === "EMAIL_OTP_INVALID_CODE") {
        return res.status(400).json({ message: "Баталгаажуулах код буруу байна" });
      }
      return res.status(400).json({ message: "Баталгаажуулах хүсэлт буруу байна" });
    }

    const user = await prisma.user.findUnique({
      where: { id: challenge.userId },
    });

    if (!user || !user.isActive || user.email !== challenge.email) {
      return res.status(401).json({ message: "Нууц үг сэргээх эрх баталгаажаагүй байна" });
    }

    const resetToken = await createPasswordResetToken(user.id);
    return res.json({
      message: "Имэйл баталгаажлаа",
      resetToken,
    });
  } catch (error) {
    console.error("[forgot-password email complete error]", error);
    return res.status(500).json({ message: "Имэйл код баталгаажуулахад алдаа гарлаа" });
  }
});

router.post("/verify-reset-code", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Код шаардлагатай" });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(code.toString().trim())
      .digest("hex");

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      return res.status(400).json({
        message: "Код буруу эсвэл хугацаа дууссан байна",
      });
    }

    return res.json({ message: "Код баталгаажлаа", valid: true });
  } catch (error) {
    console.error("[verify-reset-code error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { code, resetToken: resetTokenValue, password } = req.body;
    const token = resetTokenValue || code;

    if (!token || !password) {
      return res.status(400).json({
        message: "Баталгаажуулах код болон шинэ нууц үг шаардлагатай",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Нууц үг дор хаяж 6 тэмдэгт байх ёстой",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token.toString().trim())
      .digest("hex");

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetToken) {
      return res.status(400).json({
        message: "Код буруу эсвэл хугацаа дууссан байна",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return res.json({ message: "Нууц үг амжилттай шинэчлэгдлээ" });
  } catch (error) {
    console.error("[reset-password error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

// ── PUT /auth/web/profile — Update current user profile ────────────────
router.put("/web/profile", requireAuth, async (req, res) => {
  try {
    const { userId } = (req as any).user as AuthPayload;
    const { fullName, phone, email } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    // Validate email uniqueness if changed
    if (email && email !== user.email && !email.endsWith("@temp.local")) {
      const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (existing && existing.id !== userId) {
        return res.status(409).json({ message: "Энэ и-мэйл бүртгэгдсэн байна" });
      }
    }

    // Validate phone uniqueness if changed
    if (phone && phone !== user.profile?.phoneNumber) {
      const existing = await prisma.user.findFirst({
        where: { profile: { phoneNumber: phone.trim() }, id: { not: userId } },
      });
      if (existing) {
        return res.status(409).json({ message: "Энэ утасны дугаар бүртгэгдсэн байна" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(email && !email.endsWith("@temp.local") ? { email: email.trim().toLowerCase() } : {}),
        profile: {
          upsert: {
            create: {
              fullName: fullName?.trim() || "",
              phoneNumber: phone?.trim() || "",
            },
            update: {
              ...(fullName !== undefined ? { fullName: fullName.trim() } : {}),
              ...(phone !== undefined ? { phoneNumber: phone.trim() } : {}),
            },
          },
        },
      },
      include: { profile: true },
    });

    const orgInfo = await resolveOrganization(userId);
    const safeEmail = updatedUser.email?.endsWith("@temp.local") ? null : updatedUser.email;

    return res.json({
      id: updatedUser.id,
      email: safeEmail,
      role: updatedUser.role,
      orgRole: orgInfo?.orgRole || null,
      fullName: updatedUser.profile?.fullName || "",
      phone: updatedUser.profile?.phoneNumber || null,
      organizationId: orgInfo?.organizationId || null,
    });
  } catch (error) {
    console.error("[web/profile update error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

// ── PUT /auth/web/change-password — Change password for current user ───
router.put("/web/change-password", requireAuth, async (req, res) => {
  try {
    const { userId } = (req as any).user as AuthPayload;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Одоогийн болон шинэ нууц үгээ оруулна уу" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Шинэ нууц үг дор хаяж 6 тэмдэгт байх ёстой" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Одоогийн нууц үг буруу байна" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return res.json({ message: "Нууц үг амжилттай солигдлоо" });
  } catch (error) {
    console.error("[web/change-password error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

export default router;
