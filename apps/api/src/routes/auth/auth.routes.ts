import express, {
  Router,
  type Router as ExpressRouter,
  type Request,
} from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { prisma } from "@mgl/database";
import {
  isAdminRole,
  ADMIN_ROLE_LABELS,
  getPlatformPermissions,
} from "@mgl/types";
import {
  resolveOrganization,
  requireAuth,
  type AuthPayload,
} from "../../middleware/auth";
import { emailService } from "../../services/email/email.service";
import { authEmailTemplates } from "../../services/email/templates/auth-email.templates";
import { recordOrganizationActivity } from "../../services/organization-activity.service";

const router: ExpressRouter = Router();
const isProduction = process.env.NODE_ENV === "production";
const profileUploadsDir = path.resolve(__dirname, "../../../uploads/profile");
if (!fs.existsSync(profileUploadsDir)) {
  fs.mkdirSync(profileUploadsDir, { recursive: true });
}

const profileAvatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, profileUploadsDir),
    filename: (req, file, cb) => {
      const userId = String((req as any).user?.userId || "user").replace(
        /[^a-zA-Z0-9_-]/g,
        "",
      );
      const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      cb(null, `${userId}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Зөвхөн зураг файл upload хийнэ үү"));
  },
});

router.use("/profile/uploads", express.static(profileUploadsDir));

const isLocalRequest = (ip?: string) =>
  ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const authRateLimitMessage = {
  message:
    "Нэвтрэх оролдлого түр хугацаанд хязгаарлагдлаа. Хэсэг хүлээгээд дахин оролдоно уу.",
};

const MOBILE_REFRESH_TOKEN_DAYS = 30;

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueMobileRefreshToken(userId: string, req: Request) {
  const refreshToken = crypto.randomBytes(48).toString("base64url");
  await prisma.userSession.create({
    data: {
      userId,
      refreshHash: hashRefreshToken(refreshToken),
      userAgent: req.get("user-agent") || null,
      ip: req.ip || null,
      expiresAt: new Date(
        Date.now() + MOBILE_REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
      ),
    },
  });
  return refreshToken;
}

const rateLimitIdentifier = (req: Request): string | null => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return null;
  }

  const body = req.body as Record<string, unknown>;
  const rawIdentifier = body.email ?? body.phone ?? body.identifier;
  return typeof rawIdentifier === "string" && rawIdentifier.trim().length > 0
    ? rawIdentifier.trim().toLowerCase()
    : null;
};

const scopedAuthKey = (req: Request): string => {
  const networkKey = ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? "");
  const identifier = rateLimitIdentifier(req);
  return identifier ? `${networkKey}:${identifier}` : networkKey;
};

const loginAttemptLimiter = rateLimit({
  windowMs:
    parsePositiveInt(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MINUTES, 15) *
    60 *
    1000,
  max: parsePositiveInt(process.env.AUTH_LOGIN_RATE_LIMIT_MAX, 30),
  keyGenerator: scopedAuthKey,
  skip: (req) => !isProduction && isLocalRequest(req.ip),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: authRateLimitMessage,
});

const passwordRecoveryLimiter = rateLimit({
  windowMs:
    parsePositiveInt(process.env.AUTH_RECOVERY_RATE_LIMIT_WINDOW_MINUTES, 15) *
    60 *
    1000,
  max: parsePositiveInt(process.env.AUTH_RECOVERY_RATE_LIMIT_MAX, 10),
  keyGenerator: scopedAuthKey,
  skip: (req) => !isProduction && isLocalRequest(req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Нууц үг сэргээх хүсэлт түр хугацаанд хязгаарлагдлаа. Хэсэг хүлээгээд дахин оролдоно уу.",
  },
});

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production"
    ? (() => {
        throw new Error("FATAL: JWT_SECRET not set");
      })()
    : "dev-secret-change-me");
const VERIFY_MN_API_BASE = "https://api.verify.mn";
const VERIFY_MN_DEV_SESSION_PREFIX = "dev_verify_mn";

function isDevVerifyMnFallbackEnabled() {
  return (
    process.env.NODE_ENV !== "production" && !process.env.VERIFY_MN_API_KEY
  );
}

function toIsoOrNull(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toMembershipPayload(user: any) {
  const expiresAt = user.membershipExpiresAt
    ? new Date(user.membershipExpiresAt)
    : null;
  const active = Boolean(
    user.isPrime && (!expiresAt || expiresAt.getTime() > Date.now()),
  );
  const discountPhone = active
    ? user.membershipDiscountPhone || user.profile?.phoneNumber || null
    : null;

  return {
    active,
    badge: active ? "MEMBER" : "NONE",
    paidAt: toIsoOrNull(user.membershipPaidAt),
    startedAt: toIsoOrNull(user.membershipStartedAt),
    expiresAt: toIsoOrNull(user.membershipExpiresAt),
    discountPhone,
    phoneDiscountEligible: Boolean(active && discountPhone),
  };
}

type AuthOrgContext = {
  organizationId: string;
  orgRole: string;
  organizationName?: string | null;
  businessOrdersEnabled?: boolean;
  businessInventoryEnabled?: boolean;
  businessAttendanceEnabled?: boolean;
  businessAttendanceManualEnabled?: boolean;
  businessTasksEnabled?: boolean;
  businessDeliveryEnabled?: boolean;
  capabilities?: string[];
};

type AuthOrganizationSummary = {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  role: string;
  isPrimary: boolean;
  capabilities: string[];
  type: string | null;
  status: string | null;
  isVerified: boolean;
  businessOrdersEnabled: boolean;
  businessInventoryEnabled: boolean;
  businessAttendanceEnabled: boolean;
  businessAttendanceManualEnabled: boolean;
  businessTasksEnabled: boolean;
  businessDeliveryEnabled: boolean;
};

async function listUserOrganizations(
  userId: string,
): Promise<AuthOrganizationSummary[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId,
      isActive: true,
      deletedAt: null,
      organization: { deletedAt: null },
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: {
      role: true,
      isPrimary: true,
      capabilities: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          type: true,
          status: true,
          isVerified: true,
          businessOrdersEnabled: true,
          businessInventoryEnabled: true,
          businessAttendanceEnabled: true,
          businessAttendanceManualEnabled: true,
          businessTasksEnabled: true,
          businessDeliveryEnabled: true,
        },
      },
    },
  });

  return memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    logoUrl: membership.organization.logoUrl,
    role: membership.role,
    isPrimary: membership.isPrimary,
    capabilities: membership.capabilities,
    type: membership.organization.type,
    status: membership.organization.status,
    isVerified: membership.organization.isVerified,
    businessOrdersEnabled: membership.organization.businessOrdersEnabled,
    businessInventoryEnabled: membership.organization.businessInventoryEnabled,
    businessAttendanceEnabled:
      membership.organization.businessAttendanceEnabled,
    businessAttendanceManualEnabled:
      membership.organization.businessAttendanceManualEnabled,
    businessTasksEnabled: membership.organization.businessTasksEnabled,
    businessDeliveryEnabled: membership.organization.businessDeliveryEnabled,
  }));
}

function toWebUserPayload(
  user: any,
  orgInfo?: Partial<AuthOrgContext> | null,
  organizations: AuthOrganizationSummary[] = [],
) {
  const safeEmail = user.email?.endsWith("@temp.local") ? null : user.email;
  const addresses = Array.isArray(user.addresses)
    ? user.addresses.map((item: any) => ({
        id: item.id,
        label: item.label || "",
        fullAddress: item.fullAddress || "",
        city: item.city || "",
        district: item.district || "",
        khoroo: item.khoroo || "",
        entrance: item.entrance || "",
        apartment: item.apartment || "",
        lat: item.lat ?? null,
        lng: item.lng ?? null,
        isDefault: Boolean(item.isDefault),
      }))
    : [];
  const address = Array.isArray(user.addresses)
    ? user.addresses.find((item: any) => item.isDefault) || user.addresses[0]
    : null;
  const membership = toMembershipPayload(user);

  return {
    id: user.id,
    email: safeEmail,
    role: user.role,
    isPrime: membership.active,
    membership,
    orgRole: orgInfo?.orgRole || null,
    fullName: user.profile?.fullName || "",
    phone: user.profile?.phoneNumber || null,
    avatarUrl: user.profile?.avatarUrl || null,
    organizationId: orgInfo?.organizationId || null,
    organizationName: orgInfo?.organizationName || null,
    businessOrdersEnabled: orgInfo?.businessOrdersEnabled ?? true,
    businessInventoryEnabled: orgInfo?.businessInventoryEnabled ?? true,
    businessAttendanceEnabled: orgInfo?.businessAttendanceEnabled ?? true,
    businessAttendanceManualEnabled:
      orgInfo?.businessAttendanceManualEnabled ?? false,
    businessTasksEnabled: orgInfo?.businessTasksEnabled ?? true,
    businessDeliveryEnabled: orgInfo?.businessDeliveryEnabled ?? false,
    capabilities: orgInfo?.capabilities ?? [],
    organizations,
    termsAcceptedAt: user.termsAcceptedAt || null,
    marketingConsent: Boolean(user.marketingConsent),
    addresses,
    defaultAddress: address
      ? {
          id: address.id,
          label: address.label || "",
          fullAddress: address.fullAddress || "",
          city: address.city || "",
          district: address.district || "",
          khoroo: address.khoroo || "",
          entrance: address.entrance || "",
          apartment: address.apartment || "",
          lat: address.lat ?? null,
          lng: address.lng ?? null,
          isDefault: Boolean(address.isDefault),
        }
      : null,
  };
}

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
  const tokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

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
    challenge = jwt.verify(
      String(challengeToken),
      JWT_SECRET,
    ) as WebEmailOtpChallenge;
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
  await emailService.send({
    to: email,
    template: authEmailTemplates.loginOtp(code),
  });
}

async function sendPasswordResetOtpEmail(email: string, code: string) {
  await emailService.send({
    to: email,
    template: authEmailTemplates.passwordResetOtp(code),
  });
}

function normalizeWebIdentifier(email?: string, phone?: string) {
  // Verification requests include both fields. Prefer the supplied phone so
  // Verify.mn never attempts to validate the email address as a phone number.
  const identifier = (phone || email || "").trim();
  const isPhone =
    /^[0-9+\-\s()]{7,16}$/.test(identifier) && !identifier.includes("@");
  const digits = identifier.replace(/[^\d]/g, "");
  return {
    identifier:
      isPhone && digits.startsWith("976") && digits.length === 11
        ? digits.slice(3)
        : isPhone
          ? digits
          : identifier.toLowerCase(),
    isPhone,
  };
}

function normalizePhoneDigits(phone?: string | null) {
  const digits = (phone || "").replace(/[^\d]/g, "");
  return digits.startsWith("976") && digits.length === 11
    ? digits.slice(3)
    : digits;
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

async function findVendorUserByIdentifier(
  identifier: string,
  isPhone: boolean,
) {
  if (isPhone) {
    const users = await prisma.user.findMany({
      where: { profile: { phoneNumber: identifier } },
      include: { profile: true },
      orderBy: { createdAt: "desc" },
    });

    for (const user of users) {
      const orgInfo = await resolveLoginOrganization(user.id);
      if (orgInfo) return user;
    }

    return null;
  }

  const user = await findWebUserByIdentifier(identifier, isPhone);
  if (!user) return null;

  const orgInfo = await resolveLoginOrganization(user.id);
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

async function createVerifyMnSession(
  phone: string,
): Promise<VerifyMnSessionResponse> {
  const apiKey = process.env.VERIFY_MN_API_KEY;
  const callback =
    process.env.VERIFY_MN_CALLBACK_URL ||
    (process.env.API_PUBLIC_URL
      ? `${process.env.API_PUBLIC_URL.replace(/\/$/, "")}/auth/web/verify-mn/callback`
      : "");
  const nonce = crypto.randomInt(100000, 999999).toString();

  if (!apiKey) {
    if (isDevVerifyMnFallbackEnabled()) {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const sessionId = `${VERIFY_MN_DEV_SESSION_PREFIX}:${phone}:${crypto.randomUUID()}`;

      console.warn(
        "[verify.mn dev fallback] VERIFY_MN_API_KEY missing; using local auto-verified session.",
      );
      return {
        sessionId,
        phone,
        shortcode: "LOCAL",
        text: nonce,
        smsUri: `sms:${phone}?body=${encodeURIComponent(nonce)}`,
        displayInstruction:
          "Local development fallback. Баталгаажуулах товч дарж үргэлжлүүлнэ үү.",
        expiresAt,
      };
    }

    throw new Error("VERIFY_MN_API_KEY is not configured");
  }

  if (!callback) {
    throw new Error("VERIFY_MN_CALLBACK_URL is not configured");
  }

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
    throw new Error(
      data?.message || `Verify.mn session failed with ${res.status}`,
    );
  }

  return data as VerifyMnSessionResponse;
}

async function getVerifyMnSessionStatus(
  sessionId: string,
): Promise<VerifyMnStatusResponse> {
  const apiKey = process.env.VERIFY_MN_API_KEY;

  if (!apiKey) {
    if (
      isDevVerifyMnFallbackEnabled() &&
      sessionId.startsWith(`${VERIFY_MN_DEV_SESSION_PREFIX}:`)
    ) {
      const [, phone] = sessionId.split(":");

      return {
        sessionId,
        phone: phone || "",
        sessionStatus: "VERIFIED",
        callbackStatus: "SENT",
        verifiedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };
    }

    throw new Error("VERIFY_MN_API_KEY is not configured");
  }

  const res = await fetch(
    `${VERIFY_MN_API_BASE}/sessions/${encodeURIComponent(sessionId)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.message || `Verify.mn status failed with ${res.status}`,
    );
  }

  return data as VerifyMnStatusResponse;
}

const VERIFY_MN_STATUS_MAX_ATTEMPTS = 4;
const VERIFY_MN_STATUS_RETRY_DELAY_MS = 750;

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForVerifyMnSessionStatus(sessionId: string) {
  let status = await getVerifyMnSessionStatus(sessionId);

  for (
    let attempt = 1;
    attempt < VERIFY_MN_STATUS_MAX_ATTEMPTS &&
    status.sessionStatus === "PENDING";
    attempt += 1
  ) {
    await wait(VERIFY_MN_STATUS_RETRY_DELAY_MS);
    status = await getVerifyMnSessionStatus(sessionId);
  }

  return status;
}

function createWebAccessToken(
  user: any,
  orgInfo?: Partial<AuthOrgContext> | null,
) {
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

async function resolveVendorLoginMembership(userId: string) {
  const primary = await prisma.organizationMember.findFirst({
    where: {
      userId,
      isActive: true,
      deletedAt: null,
      isPrimary: true,
      organization: { status: "ACTIVE", deletedAt: null },
    },
    select: {
      organizationId: true,
      role: true,
      capabilities: true,
      organization: {
        select: {
          name: true,
          businessOrdersEnabled: true,
          businessInventoryEnabled: true,
          businessAttendanceEnabled: true,
          businessAttendanceManualEnabled: true,
          businessTasksEnabled: true,
          businessDeliveryEnabled: true,
        },
      },
    },
  });

  if (primary) return primary;

  return prisma.organizationMember.findFirst({
    where: {
      userId,
      isActive: true,
      deletedAt: null,
      organization: { status: "ACTIVE", deletedAt: null },
    },
    orderBy: { createdAt: "asc" },
    select: {
      organizationId: true,
      role: true,
      capabilities: true,
      organization: {
        select: {
          name: true,
          businessOrdersEnabled: true,
          businessInventoryEnabled: true,
          businessAttendanceEnabled: true,
          businessAttendanceManualEnabled: true,
          businessTasksEnabled: true,
          businessDeliveryEnabled: true,
        },
      },
    },
  });
}

async function resolveLoginOrganization(
  userId: string,
): Promise<AuthOrgContext | null> {
  const membership = await resolveVendorLoginMembership(userId);
  return membership
    ? {
        organizationId: membership.organizationId,
        orgRole: membership.role,
        organizationName: membership.organization?.name || null,
        businessOrdersEnabled:
          membership.organization?.businessOrdersEnabled ?? true,
        businessInventoryEnabled:
          membership.organization?.businessInventoryEnabled ?? true,
        businessAttendanceEnabled:
          membership.organization?.businessAttendanceEnabled ?? true,
        businessAttendanceManualEnabled:
          membership.organization?.businessAttendanceManualEnabled ?? false,
        businessTasksEnabled:
          membership.organization?.businessTasksEnabled ?? true,
        businessDeliveryEnabled:
          membership.organization?.businessDeliveryEnabled ?? false,
        capabilities: membership.capabilities,
      }
    : null;
}

async function resolveTokenOrganization(
  userId: string,
  tokenOrganizationId?: string | null,
): Promise<AuthOrgContext | null> {
  if (tokenOrganizationId) {
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: tokenOrganizationId,
        isActive: true,
        deletedAt: null,
        organization: { status: "ACTIVE", deletedAt: null },
      },
      select: {
        organizationId: true,
        role: true,
        capabilities: true,
        organization: {
          select: {
            name: true,
            businessOrdersEnabled: true,
            businessInventoryEnabled: true,
            businessAttendanceEnabled: true,
            businessAttendanceManualEnabled: true,
            businessTasksEnabled: true,
            businessDeliveryEnabled: true,
          },
        },
      },
    });

    if (membership) {
      return {
        organizationId: membership.organizationId,
        orgRole: membership.role,
        organizationName: membership.organization?.name || null,
        businessOrdersEnabled:
          membership.organization?.businessOrdersEnabled ?? true,
        businessInventoryEnabled:
          membership.organization?.businessInventoryEnabled ?? true,
        businessAttendanceEnabled:
          membership.organization?.businessAttendanceEnabled ?? true,
        businessAttendanceManualEnabled:
          membership.organization?.businessAttendanceManualEnabled ?? false,
        businessTasksEnabled:
          membership.organization?.businessTasksEnabled ?? true,
        businessDeliveryEnabled:
          membership.organization?.businessDeliveryEnabled ?? false,
        capabilities: membership.capabilities,
      };
    }
  }

  return resolveLoginOrganization(userId);
}

function toWebAuthResponse(
  user: any,
  accessToken: string,
  orgInfo?: Partial<AuthOrgContext> | null,
  organizations: AuthOrganizationSummary[] = [],
) {
  const safeEmail = user.email?.endsWith("@temp.local") ? null : user.email;
  const membership = toMembershipPayload(user);

  return {
    accessToken,
    user: {
      id: user.id,
      email: safeEmail,
      role: user.role,
      isPrime: membership.active,
      membership,
      orgRole: orgInfo?.orgRole || null,
      fullName: user.profile?.fullName || "",
      phone: user.profile?.phoneNumber || null,
      organizationId: orgInfo?.organizationId || null,
      organizationName: orgInfo?.organizationName || null,
      businessOrdersEnabled: orgInfo?.businessOrdersEnabled ?? true,
      businessInventoryEnabled: orgInfo?.businessInventoryEnabled ?? true,
      businessAttendanceEnabled: orgInfo?.businessAttendanceEnabled ?? true,
      businessAttendanceManualEnabled:
        orgInfo?.businessAttendanceManualEnabled ?? false,
      businessTasksEnabled: orgInfo?.businessTasksEnabled ?? true,
      businessDeliveryEnabled: orgInfo?.businessDeliveryEnabled ?? false,
      capabilities: orgInfo?.capabilities ?? [],
      organizations,
    },
  };
}

async function toWebAuthResponseWithOrganizations(
  user: any,
  orgInfo?: Partial<AuthOrgContext> | null,
) {
  await recordOrganizationActivity(orgInfo?.organizationId);
  return toWebAuthResponse(
    user,
    createWebAccessToken(user, orgInfo),
    orgInfo,
    await listUserOrganizations(user.id),
  );
}

// ── GET /auth/me — Return current user profile from token ──────────────
router.get("/me", requireAuth, async (req, res) => {
  try {
    const { userId, organizationId } = (req as any).user as AuthPayload;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        addresses: {
          where: { deletedAt: null },
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    const [orgInfo, organizations] = await Promise.all([
      resolveTokenOrganization(user.id, organizationId),
      listUserOrganizations(user.id),
    ]);
    return res.json(toWebUserPayload(user, orgInfo, organizations));
  } catch (error) {
    console.error("[auth/me error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

router.post("/vendor/switch-organization", requireAuth, async (req, res) => {
  try {
    const { userId } = (req as any).user as AuthPayload;
    const organizationId = String(req.body?.organizationId || "").trim();

    if (!organizationId) {
      return res.status(400).json({ message: "organizationId шаардлагатай" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.isActive) {
      return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    const orgInfo = await resolveTokenOrganization(user.id, organizationId);
    if (!orgInfo?.organizationId || orgInfo.organizationId !== organizationId) {
      return res.status(403).json({
        message: "Энэ байгууллагад нэвтрэх эрх олдсонгүй",
      });
    }

    return res.json(await toWebAuthResponseWithOrganizations(user, orgInfo));
  } catch (error) {
    console.error("[vendor switch organization error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

router.post("/admin/login", loginAttemptLimiter, async (req, res) => {
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
      return res.status(401).json({ message: "Нууц үг тохируулаагүй байна" });
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

router.post(
  "/admin/forgot-password",
  passwordRecoveryLimiter,
  async (req, res) => {
    try {
      const { email, phone } = req.body;
      const identifier: string | undefined = email || phone;

      if (!identifier) {
        return res.status(400).json({
          message: "Имэйл эсвэл утасны дугаар шаардлагатай",
        });
      }

      const normalized = normalizeWebIdentifier(email, phone);
      const user = await findAdminUserByIdentifier(
        normalized.identifier,
        normalized.isPhone,
      );

      if (!user) {
        return res.status(404).json({ message: "Admin хэрэглэгч олдсонгүй" });
      }

      if (!user.isActive) {
        return res
          .status(403)
          .json({ message: "Admin хэрэглэгч идэвхгүй байна" });
      }

      if (!normalized.isPhone) {
        if (!emailService.isConfigured()) {
          return res
            .status(500)
            .json({ message: "SMTP тохиргоо хийгдээгүй байна" });
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
        message:
          error instanceof Error ? error.message : "Сервер дээр алдаа гарлаа",
      });
    }
  },
);

router.post(
  "/admin/forgot-password/verify-mn/complete",
  passwordRecoveryLimiter,
  async (req, res) => {
    try {
      const { phone, sessionId } = req.body;
      const { identifier, isPhone } = normalizeWebIdentifier(undefined, phone);

      if (!isPhone || !identifier || !sessionId) {
        return res
          .status(400)
          .json({ message: "Утасны дугаар болон sessionId шаардлагатай." });
      }

      const user = await findAdminUserByIdentifier(identifier, true);
      if (!user) {
        return res.status(404).json({ message: "Admin хэрэглэгч олдсонгүй" });
      }

      if (!user.isActive) {
        return res
          .status(403)
          .json({ message: "Admin хэрэглэгч идэвхгүй байна" });
      }

      const status = await waitForVerifyMnSessionStatus(sessionId);
      const statusPhone = normalizePhoneDigits(status.phone);
      if (statusPhone && statusPhone !== identifier) {
        return res
          .status(400)
          .json({ message: "Баталгаажуулсан дугаар таарахгүй байна." });
      }

      if (status.sessionStatus !== "VERIFIED") {
        return res.status(400).json({
          message:
            status.sessionStatus === "EXPIRED"
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
        message:
          error instanceof Error
            ? error.message
            : "Verify.mn баталгаажуулахад алдаа гарлаа",
      });
    }
  },
);

router.post(
  "/admin/forgot-password/email/complete",
  passwordRecoveryLimiter,
  async (req, res) => {
    try {
      const { otpCode, challengeToken } = req.body;

      let challenge: WebEmailOtpChallenge;
      try {
        challenge = verifyEmailOtpChallenge(
          otpCode,
          challengeToken,
          "admin-password-reset",
        );
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "EMAIL_OTP_REQUIRED") {
          return res
            .status(400)
            .json({ message: "Баталгаажуулах код шаардлагатай" });
        }
        if (code === "EMAIL_OTP_EXPIRED") {
          return res
            .status(400)
            .json({ message: "Баталгаажуулах кодын хугацаа дууссан байна" });
        }
        if (code === "EMAIL_OTP_INVALID_CODE") {
          return res
            .status(400)
            .json({ message: "Баталгаажуулах код буруу байна" });
        }
        return res
          .status(400)
          .json({ message: "Баталгаажуулах хүсэлт буруу байна" });
      }

      const user = await prisma.user.findUnique({
        where: { id: challenge.userId },
      });

      if (
        !user ||
        !user.isActive ||
        user.email !== challenge.email ||
        !isAdminRole(user.role)
      ) {
        return res
          .status(401)
          .json({ message: "Admin нууц үг сэргээх эрх баталгаажаагүй байна" });
      }

      const resetToken = await createPasswordResetToken(user.id);
      return res.json({
        message: "Имэйл баталгаажлаа",
        resetToken,
      });
    } catch (error) {
      console.error("[admin forgot-password email complete error]", error);
      return res
        .status(500)
        .json({ message: "Имэйл код баталгаажуулахад алдаа гарлаа" });
    }
  },
);

router.post(
  "/vendor/forgot-password",
  passwordRecoveryLimiter,
  async (req, res) => {
    try {
      const { email, phone } = req.body;
      const identifier: string | undefined = email || phone;

      if (!identifier) {
        return res.status(400).json({
          message: "И-мэйл эсвэл утасны дугаар шаардлагатай",
        });
      }

      const normalized = normalizeWebIdentifier(email, phone);
      const user = await findVendorUserByIdentifier(
        normalized.identifier,
        normalized.isPhone,
      );

      if (!user) {
        return res
          .status(404)
          .json({ message: "Нийлүүлэгч хэрэглэгч олдсонгүй" });
      }

      if (!user.isActive) {
        return res
          .status(403)
          .json({ message: "Нийлүүлэгч хэрэглэгч идэвхгүй байна" });
      }

      if (!normalized.isPhone) {
        if (!emailService.isConfigured()) {
          return res
            .status(500)
            .json({ message: "SMTP тохиргоо хийгдээгүй байна" });
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
        message:
          error instanceof Error ? error.message : "Сервер дээр алдаа гарлаа",
      });
    }
  },
);

router.post(
  "/vendor/forgot-password/verify-mn/complete",
  passwordRecoveryLimiter,
  async (req, res) => {
    try {
      const { phone, sessionId } = req.body;
      const { identifier, isPhone } = normalizeWebIdentifier(undefined, phone);

      if (!isPhone || !identifier || !sessionId) {
        return res
          .status(400)
          .json({ message: "Утасны дугаар болон sessionId шаардлагатай." });
      }

      const user = await findVendorUserByIdentifier(identifier, true);
      if (!user) {
        return res
          .status(404)
          .json({ message: "Нийлүүлэгч хэрэглэгч олдсонгүй" });
      }

      if (!user.isActive) {
        return res
          .status(403)
          .json({ message: "Нийлүүлэгч хэрэглэгч идэвхгүй байна" });
      }

      const status = await waitForVerifyMnSessionStatus(sessionId);
      const statusPhone = normalizePhoneDigits(status.phone);
      if (statusPhone && statusPhone !== identifier) {
        return res
          .status(400)
          .json({ message: "Баталгаажуулсан дугаар таарахгүй байна." });
      }

      if (status.sessionStatus !== "VERIFIED") {
        return res.status(400).json({
          message:
            status.sessionStatus === "EXPIRED"
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
        message:
          error instanceof Error
            ? error.message
            : "Verify.mn баталгаажуулахад алдаа гарлаа",
      });
    }
  },
);

router.post(
  "/vendor/forgot-password/email/complete",
  passwordRecoveryLimiter,
  async (req, res) => {
    try {
      const { otpCode, challengeToken } = req.body;

      let challenge: WebEmailOtpChallenge;
      try {
        challenge = verifyEmailOtpChallenge(
          otpCode,
          challengeToken,
          "vendor-password-reset",
        );
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "EMAIL_OTP_REQUIRED") {
          return res
            .status(400)
            .json({ message: "Баталгаажуулах код шаардлагатай" });
        }
        if (code === "EMAIL_OTP_EXPIRED") {
          return res
            .status(400)
            .json({ message: "Баталгаажуулах кодын хугацаа дууссан байна" });
        }
        if (code === "EMAIL_OTP_INVALID_CODE") {
          return res
            .status(400)
            .json({ message: "Баталгаажуулах код буруу байна" });
        }
        return res
          .status(400)
          .json({ message: "Баталгаажуулах хүсэлт буруу байна" });
      }

      const user = await prisma.user.findUnique({
        where: { id: challenge.userId },
      });

      const orgInfo = user ? await resolveOrganization(user.id) : null;
      if (
        !user ||
        !user.isActive ||
        user.email !== challenge.email ||
        !orgInfo
      ) {
        return res.status(401).json({
          message: "Нийлүүлэгч нууц үг сэргээх эрх баталгаажаагүй байна",
        });
      }

      const resetToken = await createPasswordResetToken(user.id);
      return res.json({
        message: "Имэйл баталгаажлаа",
        resetToken,
      });
    } catch (error) {
      console.error("[vendor forgot-password email complete error]", error);
      return res
        .status(500)
        .json({ message: "Имэйл код баталгаажуулахад алдаа гарлаа" });
    }
  },
);

router.post("/login", loginAttemptLimiter, async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    const identifier: string | undefined = email || phone;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "И-мэйл эсвэл утасны дугаар болон нууц үг шаардлагатай",
      });
    }

    const isPhone =
      /^[0-9+\-\s()]{7,15}$/.test(identifier.trim()) &&
      !identifier.includes("@");

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
    const orgInfo = await resolveLoginOrganization(user.id);

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
    const refreshToken = await issueMobileRefreshToken(user.id, req);

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: safeEmail,
        role: user.role,
        isPrime: Boolean(user.isPrime),
        orgRole: orgInfo?.orgRole || null,
        fullName: user.profile?.fullName || "",
        phone: user.profile?.phoneNumber || null,
        organizationId: orgInfo?.organizationId || null,
        organizationName: orgInfo?.organizationName || "",
        businessOrdersEnabled: orgInfo?.businessOrdersEnabled ?? true,
        businessInventoryEnabled: orgInfo?.businessInventoryEnabled ?? true,
        businessAttendanceEnabled: orgInfo?.businessAttendanceEnabled ?? true,
        businessAttendanceManualEnabled:
          orgInfo?.businessAttendanceManualEnabled ?? false,
        businessTasksEnabled: orgInfo?.businessTasksEnabled ?? true,
        businessDeliveryEnabled: orgInfo?.businessDeliveryEnabled ?? false,
        capabilities: orgInfo?.capabilities ?? [],
      },
    });
  } catch (error) {
    console.error("[login error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

router.post("/refresh", async (req, res) => {
  const refreshToken =
    typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
  const requestedOrganizationId =
    typeof req.body?.organizationId === "string"
      ? req.body.organizationId.trim()
      : "";
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token шаардлагатай" });
  }

  try {
    const session = await prisma.userSession.findUnique({
      where: { refreshHash: hashRefreshToken(refreshToken) },
      include: { user: { include: { profile: true } } },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.isActive ||
      session.user.deletedAt
    ) {
      return res.status(401).json({ message: "Session хугацаа дууссан" });
    }

    const orgInfo = requestedOrganizationId
      ? await resolveTokenOrganization(session.userId, requestedOrganizationId)
      : await resolveLoginOrganization(session.userId);
    if (
      requestedOrganizationId &&
      orgInfo?.organizationId !== requestedOrganizationId
    ) {
      return res.status(403).json({
        message: "Сонгосон байгууллагын идэвхтэй эрх олдсонгүй",
      });
    }
    const accessToken = jwt.sign(
      {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        organizationId: orgInfo?.organizationId || null,
        orgRole: orgInfo?.orgRole || null,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );
    const nextRefreshToken = crypto.randomBytes(48).toString("base64url");
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshHash: hashRefreshToken(nextRefreshToken),
        expiresAt: new Date(
          Date.now() + MOBILE_REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
    });

    return res.json({ accessToken, refreshToken: nextRefreshToken });
  } catch (error) {
    console.error("[refresh session error]", error);
    return res.status(500).json({ message: "Session шинэчлэхэд алдаа гарлаа" });
  }
});

router.post("/vendor/login", loginAttemptLimiter, async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    const { identifier, isPhone } = normalizeWebIdentifier(email, phone);

    if (!identifier || !password) {
      return res.status(400).json({
        message: "И-мэйл эсвэл утасны дугаар болон нууц үг шаардлагатай",
      });
    }

    const user = await findVendorUserByIdentifier(identifier, isPhone);

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

    const orgInfo = await resolveLoginOrganization(user.id);
    if (!orgInfo?.organizationId) {
      return res.status(403).json({
        message:
          "Энэ login хэрэглэгч байгууллагын Vendor login account-д холбогдоогүй байна. Admin дээр Partner detail → Vendor login account хэсгээс owner/ажилтнаар нэмнэ үү.",
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return res.json(await toWebAuthResponseWithOrganizations(user, orgInfo));
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
      return res.status(400).json({
        message: "Verify.mn баталгаажуулалт утасны дугаараар хийгдэнэ.",
      });
    }

    if (mode === "register") {
      if (!password || !fullName) {
        return res
          .status(400)
          .json({ message: "Нэр болон нууц үг шаардлагатай." });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Нууц үг дор хаяж 6 тэмдэгт байх ёстой." });
      }

      const existingUser = await findWebUserByIdentifier(identifier, true);
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "Энэ утасны дугаар бүртгэгдсэн байна." });
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
        return res
          .status(403)
          .json({ message: "Admin хэрэглэгч web нэвтрэлт ашиглах боломжгүй." });
      }

      if (!user.passwordHash) {
        return res
          .status(401)
          .json({ message: "Нууц үг тохируулаагүй байна." });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Нууц үг буруу байна" });
      }
    }

    const session = await createVerifyMnSession(identifier);
    return res.json({ session });
  } catch (error) {
    console.error("[verify.mn start error]", error);
    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Verify.mn баталгаажуулалт эхлүүлэхэд алдаа гарлаа",
    });
  }
});

router.post("/web/verify-mn/complete", async (req, res) => {
  try {
    const { email, phone, password, fullName, mode, sessionId } = req.body;
    const { identifier, isPhone } = normalizeWebIdentifier(email, phone);

    if (!isPhone || !identifier || !sessionId) {
      return res
        .status(400)
        .json({ message: "Утасны дугаар болон sessionId шаардлагатай." });
    }

    const status = await waitForVerifyMnSessionStatus(sessionId);
    const statusPhone = normalizePhoneDigits(status.phone);
    if (statusPhone && statusPhone !== identifier) {
      return res
        .status(400)
        .json({ message: "Баталгаажуулсан дугаар таарахгүй байна." });
    }

    if (status.sessionStatus !== "VERIFIED") {
      return res.status(400).json({
        message:
          status.sessionStatus === "EXPIRED"
            ? "Баталгаажуулах хугацаа дууссан байна."
            : "SMS баталгаажуулалт хараахан ирээгүй байна.",
        status: status.sessionStatus,
      });
    }

    if (mode === "register") {
      if (!password || !fullName) {
        return res
          .status(400)
          .json({ message: "Нэр болон нууц үг шаардлагатай." });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Нууц үг дор хаяж 6 тэмдэгт байх ёстой." });
      }

      const existingUser = await findWebUserByIdentifier(identifier, true);
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "Энэ утасны дугаар бүртгэгдсэн байна." });
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

      return res
        .status(201)
        .json(await toWebAuthResponseWithOrganizations(newUser));
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
      return res
        .status(403)
        .json({ message: "Admin хэрэглэгч web нэвтрэлт ашиглах боломжгүй." });
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
    return res.json(await toWebAuthResponseWithOrganizations(user, orgInfo));
  } catch (error) {
    console.error("[verify.mn complete error]", error);
    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Verify.mn баталгаажуулахад алдаа гарлаа",
    });
  }
});

router.get("/web/verify-mn/callback", (req, res) => {
  console.log("[verify.mn callback]", req.query);
  return res.sendStatus(200);
});

router.post("/web/login", loginAttemptLimiter, async (req, res) => {
  try {
    const { email, phone, password, otpCode, challengeToken } = req.body;
    const identifier: string | undefined = email || phone;

    if (otpCode || challengeToken) {
      if (!otpCode || !challengeToken) {
        return res
          .status(400)
          .json({ message: "Баталгаажуулах код шаардлагатай" });
      }

      let challenge: WebEmailOtpChallenge;
      try {
        challenge = jwt.verify(
          challengeToken,
          JWT_SECRET,
        ) as WebEmailOtpChallenge;
      } catch {
        return res
          .status(400)
          .json({ message: "Баталгаажуулах кодын хугацаа дууссан байна" });
      }

      if (challenge.purpose !== "web-email-login") {
        return res
          .status(400)
          .json({ message: "Баталгаажуулах хүсэлт буруу байна" });
      }

      const expectedHash = hashEmailOtp(
        String(otpCode).trim(),
        challenge.userId,
      );
      if (expectedHash !== challenge.codeHash) {
        return res
          .status(400)
          .json({ message: "Баталгаажуулах код буруу байна" });
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
      return res.json(await toWebAuthResponseWithOrganizations(user, orgInfo));
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
        message:
          "Admin хэрэглэгч web нэвтрэлт ашиглах боломжгүй. Admin panel ашиглана уу.",
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

    if (!isPhone && !user.emailVerified) {
      if (!emailService.isConfigured()) {
        return res
          .status(500)
          .json({ message: "SMTP тохиргоо хийгдээгүй байна" });
      }

      const challenge = createEmailOtpChallenge({
        id: user.id,
        email: user.email,
      });
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
    return res.json(await toWebAuthResponseWithOrganizations(user, orgInfo));
  } catch (error) {
    console.error("[web login error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

router.post("/web/register", async (req, res) => {
  try {
    return res.status(400).json({
      message:
        "Бүртгэл үүсгэхийн тулд Verify.mn утасны баталгаажуулалт шаардлагатай.",
    });
  } catch (error) {
    console.error("[web register error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

// ─── Forgot Password ───────────────────────────────────────────────────

router.post("/forgot-password", passwordRecoveryLimiter, async (req, res) => {
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

      if (!emailService.isConfigured()) {
        return res
          .status(500)
          .json({ message: "SMTP тохиргоо хийгдээгүй байна" });
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

router.post(
  "/forgot-password/verify-mn/complete",
  passwordRecoveryLimiter,
  async (req, res) => {
    try {
      const { phone, sessionId } = req.body;
      const { identifier, isPhone } = normalizeWebIdentifier(undefined, phone);

      if (!isPhone || !identifier || !sessionId) {
        return res
          .status(400)
          .json({ message: "Утасны дугаар болон sessionId шаардлагатай." });
      }

      const user = await findWebUserByIdentifier(identifier, true);
      if (!user) {
        return res.status(404).json({ message: "Бүртгэлгүй хэрэглэгч байна" });
      }

      const status = await waitForVerifyMnSessionStatus(sessionId);
      const statusPhone = normalizePhoneDigits(status.phone);
      if (statusPhone && statusPhone !== identifier) {
        return res
          .status(400)
          .json({ message: "Баталгаажуулсан дугаар таарахгүй байна." });
      }

      if (status.sessionStatus !== "VERIFIED") {
        return res.status(400).json({
          message:
            status.sessionStatus === "EXPIRED"
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
        message:
          error instanceof Error
            ? error.message
            : "Verify.mn баталгаажуулахад алдаа гарлаа",
      });
    }
  },
);

router.post(
  "/forgot-password/email/complete",
  passwordRecoveryLimiter,
  async (req, res) => {
    try {
      const { otpCode, challengeToken } = req.body;

      let challenge: WebEmailOtpChallenge;
      try {
        challenge = verifyEmailOtpChallenge(
          otpCode,
          challengeToken,
          "web-password-reset",
        );
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "EMAIL_OTP_REQUIRED") {
          return res
            .status(400)
            .json({ message: "Баталгаажуулах код шаардлагатай" });
        }
        if (code === "EMAIL_OTP_EXPIRED") {
          return res
            .status(400)
            .json({ message: "Баталгаажуулах кодын хугацаа дууссан байна" });
        }
        if (code === "EMAIL_OTP_INVALID_CODE") {
          return res
            .status(400)
            .json({ message: "Баталгаажуулах код буруу байна" });
        }
        return res
          .status(400)
          .json({ message: "Баталгаажуулах хүсэлт буруу байна" });
      }

      const user = await prisma.user.findUnique({
        where: { id: challenge.userId },
      });

      if (!user || !user.isActive || user.email !== challenge.email) {
        return res
          .status(401)
          .json({ message: "Нууц үг сэргээх эрх баталгаажаагүй байна" });
      }

      const resetToken = await createPasswordResetToken(user.id);
      return res.json({
        message: "Имэйл баталгаажлаа",
        resetToken,
      });
    } catch (error) {
      console.error("[forgot-password email complete error]", error);
      return res
        .status(500)
        .json({ message: "Имэйл код баталгаажуулахад алдаа гарлаа" });
    }
  },
);

router.post("/verify-reset-code", passwordRecoveryLimiter, async (req, res) => {
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

router.post("/reset-password", passwordRecoveryLimiter, async (req, res) => {
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
    const {
      fullName,
      phone,
      email,
      avatarUrl,
      address,
      acceptTerms,
      marketingConsent,
    } = req.body as {
      fullName?: string;
      phone?: string;
      email?: string;
      avatarUrl?: string | null;
      acceptTerms?: boolean;
      marketingConsent?: boolean;
      address?: {
        label?: string;
        fullAddress?: string;
        city?: string;
        district?: string;
        khoroo?: string;
        entrance?: string;
        apartment?: string;
        lat?: number | string | null;
        lng?: number | string | null;
        id?: string | null;
        isDefault?: boolean;
      };
    };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, addresses: { where: { deletedAt: null } } },
    });

    if (!user) {
      return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    // Validate email uniqueness if changed
    if (email && email !== user.email && !email.endsWith("@temp.local")) {
      const existing = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (existing && existing.id !== userId) {
        return res
          .status(409)
          .json({ message: "Энэ и-мэйл бүртгэгдсэн байна" });
      }
    }

    // Validate phone uniqueness if changed
    if (phone && phone !== user.profile?.phoneNumber) {
      const existing = await prisma.user.findFirst({
        where: { profile: { phoneNumber: phone.trim() }, id: { not: userId } },
      });
      if (existing) {
        return res
          .status(409)
          .json({ message: "Энэ утасны дугаар бүртгэгдсэн байна" });
      }
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const savedUser = await tx.user.update({
        where: { id: userId },
        data: {
          ...(email && !email.endsWith("@temp.local")
            ? { email: email.trim().toLowerCase() }
            : {}),
          ...(acceptTerms && !user.termsAcceptedAt
            ? { termsAcceptedAt: new Date() }
            : {}),
          ...(marketingConsent !== undefined
            ? { marketingConsent: Boolean(marketingConsent) }
            : {}),
          profile: {
            upsert: {
              create: {
                fullName: fullName?.trim() || "",
                phoneNumber: phone?.trim() || "",
                avatarUrl: avatarUrl?.trim() || null,
              },
              update: {
                ...(fullName !== undefined
                  ? { fullName: fullName.trim() }
                  : {}),
                ...(phone !== undefined ? { phoneNumber: phone.trim() } : {}),
                ...(avatarUrl !== undefined
                  ? { avatarUrl: avatarUrl?.trim() || null }
                  : {}),
              },
            },
          },
        },
        include: {
          profile: true,
          addresses: {
            where: { deletedAt: null },
            orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
          },
        },
      });

      const fullAddress = address?.fullAddress?.trim();
      if (fullAddress) {
        const nextAddress = address as NonNullable<typeof address>;
        const addressId =
          nextAddress.id &&
          user.addresses.some((item) => item.id === nextAddress.id)
            ? nextAddress.id
            : null;
        const shouldSetDefault =
          nextAddress.isDefault !== false || user.addresses.length === 0;

        if (shouldSetDefault) {
          await tx.address.updateMany({
            where: { userId, deletedAt: null },
            data: { isDefault: false },
          });
        }

        const addressData = {
          label: nextAddress.label?.trim() || "Үндсэн хаяг",
          fullAddress,
          city: nextAddress.city?.trim() || null,
          district: nextAddress.district?.trim() || null,
          khoroo: nextAddress.khoroo?.trim() || null,
          entrance: nextAddress.entrance?.trim() || null,
          apartment: nextAddress.apartment?.trim() || null,
          lat:
            nextAddress.lat === undefined ||
            nextAddress.lat === null ||
            nextAddress.lat === ""
              ? null
              : Number(nextAddress.lat),
          lng:
            nextAddress.lng === undefined ||
            nextAddress.lng === null ||
            nextAddress.lng === ""
              ? null
              : Number(nextAddress.lng),
          deletedAt: null,
        };

        if (addressId) {
          await tx.address.update({
            where: { id: addressId },
            data: {
              ...addressData,
              ...(shouldSetDefault ? { isDefault: true } : {}),
            },
          });
        } else {
          await tx.address.create({
            data: {
              userId,
              ...addressData,
              isDefault: shouldSetDefault,
            },
          });
        }
      }

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          profile: true,
          addresses: {
            where: { deletedAt: null },
            orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
          },
        },
      });
    });

    const orgInfo = await resolveOrganization(userId);
    return res.json(toWebUserPayload(updatedUser, orgInfo));
  } catch (error) {
    console.error("[web/profile update error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

router.post(
  "/web/profile/avatar",
  requireAuth,
  profileAvatarUpload.single("avatar"),
  async (req: Request, res) => {
    try {
      const { userId } = (req as any).user as AuthPayload;
      if (!req.file) {
        return res.status(400).json({ message: "Зураг файл шаардлагатай" });
      }

      const avatarUrl = `/api/auth/profile/uploads/${req.file.filename}`;
      await prisma.profile.upsert({
        where: { userId },
        create: { userId, fullName: "", avatarUrl },
        update: { avatarUrl },
      });

      return res.json({ avatarUrl });
    } catch (error) {
      console.error("[web/profile avatar upload error]", error);
      return res
        .status(500)
        .json({ message: "Зураг upload хийхэд алдаа гарлаа" });
    }
  },
);

// ── PUT /auth/web/change-password — Change password for current user ───
router.put("/web/change-password", requireAuth, async (req, res) => {
  try {
    const { userId } = (req as any).user as AuthPayload;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Одоогийн болон шинэ нууц үгээ оруулна уу" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Шинэ нууц үг дор хаяж 6 тэмдэгт байх ёстой" });
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
