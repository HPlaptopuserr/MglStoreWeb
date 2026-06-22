import crypto from "crypto";
import { type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { prisma, PaymentMethod, PosPaymentStatus } from "@mgl/database";

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
export const runtimeEnv = String(
  process.env.APP_ENV || process.env.NODE_ENV || "development",
).toLowerCase();
export const isProdLikeEnv =
  runtimeEnv === "production" || runtimeEnv === "staging";
export const allowPosSimulation =
  process.env.POS_ALLOW_SIMULATION === "true" && runtimeEnv === "development";
export const bridgeSharedSecret = String(
  process.env.POS_BRIDGE_SHARED_SECRET || "",
).trim();
export const bridgeChargeTimeoutMs = (() => {
  const value = Number(process.env.POS_BRIDGE_CHARGE_TIMEOUT_MS || 120_000);
  return Number.isFinite(value) && value > 0 ? value : 120_000;
})();

export const pushEcrBaseUrl = (
  process.env.PUSH_ECR_BASE_URL || "https://push.easypay.mn:8443"
).replace(/\/$/, "");
export const pushEcrApiKey = process.env.PUSH_ECR_API_KEY || "";
export const pushEcrClientId = process.env.PUSH_ECR_CLIENT_ID || "";
export const pushEcrDefaultTerminalId = process.env.PUSH_ECR_TERMINAL_ID || "";

export type PushEcrPurchaseResponse = {
  succeed: boolean;
  message?: string;
  amount?: number;
  payment?: number;
  systemRef?: string;
  traceno?: string;
  approveCode?: string;
  maskedPAN?: string;
  date?: string;
  merchantId?: string;
  terminalId?: string;
  bankTid?: string;
  ezTransactionId?: string;
  transactionAt?: string;
};

export type AuthClaims = {
  userId: string;
  role?: string;
  organizationId?: string | null;
};

export type SaleLineInput = {
  productId: string;
  qty: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
};

export type SalePaymentLineInput = {
  method: string;
  amount: number;
  attemptId?: string;
  transactionId?: string;
  invoiceId?: string;
  credit?: {
    targetType?: "COMPANY" | "CUSTOMER";
    borrowerId?: string;
    borrowerName?: string;
    borrowerPhone?: string;
    borrowerEmail?: string;
    borrowerAddress?: string;
    employeeId?: string;
    employeeName?: string;
    termMonths?: number;
    monthlyInterestRate?: number;
    principal?: number;
    totalInterest?: number;
    totalDue?: number;
    dueDate?: string;
    note?: string;
  };
};

export type CreateSaleBody = {
  shiftId?: string;
  branchId?: string;
  registerId?: string;
  organizationId?: string;
  restaurantTicketId?: string;
  clientSaleId?: string;
  paymentMethod?: string;
  paymentBreakdown?: SalePaymentLineInput[];
  loyalty?: {
    mode?: "EARN" | "REDEEM" | "NONE";
    phone?: string;
    redeemPoints?: number;
  };
  lines?: SaleLineInput[];
  note?: string;
};

export type ApiError = { status: number; message: string };

export type AuthUser = {
  id: string;
  role: string;
  isActive: boolean;
  deletedAt: Date | null;
  organizationId: string | null;
  orgRole: string | null;
};

export const MONEY_EPSILON = 0.01;

export const toApiError = (status: number, message: string): ApiError => ({
  status,
  message,
});

export const makePushEcrReferral = (attemptId: string): string =>
  attemptId.replace(/-/g, "").slice(0, 10).toUpperCase();

export const pushEcrHeaders = () => ({
  "Content-Type": "application/json",
  "x-api-key": pushEcrApiKey,
  "x-client-id": pushEcrClientId,
});

export const getBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token.trim();
};

export const parseAuthClaims = (req: Request): AuthClaims | null => {
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== "object") return null;
    const claims = decoded as Partial<AuthClaims>;
    if (!claims.userId || typeof claims.userId !== "string") return null;
    return {
      userId: claims.userId,
      role: typeof claims.role === "string" ? claims.role : undefined,
      organizationId:
        claims.organizationId === null ||
        typeof claims.organizationId === "string"
          ? claims.organizationId
          : undefined,
    };
  } catch {
    return null;
  }
};

export const normalizePaymentMethod = (
  value?: string,
): PaymentMethod | null => {
  if (!value) return null;
  const upper = String(value).toUpperCase();
  if (upper === "QR" || upper === "QPAY") return PaymentMethod.QPAY;
  if (upper === "CASH") return PaymentMethod.CASH;
  if (upper === "CARD") return PaymentMethod.CARD;
  if (upper === "CREDIT") return PaymentMethod.CREDIT;
  if (upper === "BANK_TRANSFER") return PaymentMethod.BANK_TRANSFER;
  return null;
};

export const normalizeRegisterName = (value?: string) =>
  String(value || "").trim();
export const roundMoney = (value: number) => Math.round(value * 100) / 100;
export const moneyMatches = (left: number, right: number) =>
  Math.abs(roundMoney(left) - roundMoney(right)) < MONEY_EPSILON;

export const signPayload = (payload: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

export const timingSafeEqualHex = (
  provided: string,
  expected: string,
): boolean => {
  if (!provided || !expected) return false;
  if (!/^[0-9a-f]+$/i.test(provided) || !/^[0-9a-f]+$/i.test(expected))
    return false;
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

export const getHeaderValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const parseBridgeResultStatus = (status?: string): PosPaymentStatus => {
  if (status === "APPROVED") return PosPaymentStatus.APPROVED;
  if (status === "DECLINED") return PosPaymentStatus.DECLINED;
  return PosPaymentStatus.FAILED;
};

export const parseQPaySuccess = (statusValue: unknown): boolean => {
  const status = String(statusValue || "")
    .trim()
    .toUpperCase();
  return ["000", "PAID", "SUCCESS", "SUCCEEDED", "COMPLETED"].includes(status);
};

export const parseOptionalDate = (value: unknown): Date | null => {
  if (value == null || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getAuthUser = async (req: Request): Promise<AuthUser | null> => {
  const claims = parseAuthClaims(req);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: { id: true, role: true, isActive: true, deletedAt: true },
  });
  if (!user) return null;

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, isActive: true, isPrimary: true },
    select: { organizationId: true, role: true },
  });
  const fallback = !membership
    ? await prisma.organizationMember.findFirst({
        where: { userId: user.id, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { organizationId: true, role: true },
      })
    : null;
  const org = membership || fallback;

  return {
    id: user.id,
    role: user.role,
    isActive: user.isActive,
    deletedAt: user.deletedAt,
    organizationId: org?.organizationId || null,
    orgRole: org?.role || null,
  };
};

export const requireAdminUser = async (req: Request, res: Response) => {
  const actor = await getAuthUser(req);
  if (!actor || actor.deletedAt || !actor.isActive) {
    res.status(401).json({ message: "Нэвтрэлт шаардлагатай" });
    return null;
  }
  if (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
    res.status(403).json({ message: "Admin эрх шаардлагатай" });
    return null;
  }
  return actor;
};

export const requirePosUser = async (req: Request, res: Response) => {
  const actor = await getAuthUser(req);
  if (!actor || actor.deletedAt || !actor.isActive) {
    res.status(401).json({ message: "Нэвтрэлт шаардлагатай" });
    return null;
  }
  if (actor.role !== "ADMIN" && !actor.organizationId) {
    res.status(403).json({ message: "POS ашиглах эрх хүрэлцэхгүй" });
    return null;
  }
  return actor;
};
