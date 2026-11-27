import { Router, type Router as RouterType } from "express";
import bcrypt from "bcryptjs";
import { prisma, type Prisma, type PlatformRole } from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import {
  normalizePhoneNumber,
  isPhoneNumberConflict,
} from "../../utils/phone-number";

type ManualUserInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export function parseManualUserInput(body: unknown): ManualUserInput | string {
  if (!body || typeof body !== "object") return "Бүх талбарыг бөглөнө үү";
  const input = body as Record<string, unknown>;
  const fullName =
    typeof input.fullName === "string" ? input.fullName.trim() : "";
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const rawPhone = typeof input.phone === "string" ? input.phone.trim() : "";
  const phone = normalizePhoneNumber(rawPhone);
  const password = typeof input.password === "string" ? input.password : "";
  if (!fullName || !email || !phone || !password)
    return "Бүх талбарыг бөглөнө үү";
  if (fullName.length > 200) return "Нэр 200 тэмдэгтээс хэтрэхгүй байна";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Имэйл хаягаа зөв оруулна уу";
  }
  if (!/^\+?[\d\s()-]+$/.test(rawPhone) || !/^[5-9]\d{7}$/.test(phone)) {
    return "Утасны дугаараа зөв оруулна уу";
  }
  if (password.length < 6 || Buffer.byteLength(password, "utf8") > 72) {
    return "Нууц үг дор хаяж 6 тэмдэгт, 72 байтаас хэтрэхгүй байна";
  }
  return { fullName, email, phone, password };
}

type UserRepository = {
  findFirst(args: {
    where: Prisma.UserWhereInput;
    select: { id: true };
  }): Promise<{ id: string } | null>;
  create(args: {
    data: Prisma.UserCreateInput;
    select: { id: true; email: true; role: true };
  }): Promise<{ id: string; email: string; role: PlatformRole }>;
};

export function createManualUsersRouter(
  users: UserRepository = prisma.user,
): RouterType {
  const router: RouterType = Router();
  router.post(
    "/admin/users/manual",
    requireAuth,
    requirePlatformPermission(Permission.MANAGE_USERS),
    async (req, res) => {
      const input = parseManualUserInput(req.body as unknown);
      if (typeof input === "string")
        return res.status(400).json({ message: input });
      try {
        // Include archived accounts: their identifiers cannot be reassigned.
        const existing = await users.findFirst({
          where: {
            OR: [
              { email: { equals: input.email, mode: "insensitive" } },
              { profile: { phoneNumber: input.phone } },
            ],
          },
          select: { id: true },
        });
        if (existing) {
          return res.status(409).json({
            message: "Энэ утас эсвэл имэйлтэй хэрэглэгч бүртгэлтэй байна",
          });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        const user = await users.create({
          data: {
            email: input.email,
            passwordHash,
            role: "USER",
            isActive: true,
            onboardingSource: "ADMIN",
            emailVerified: false,
            profile: {
              create: { fullName: input.fullName, phoneNumber: input.phone },
            },
          },
          select: { id: true, email: true, role: true },
        });
        return res
          .status(201)
          .json({ message: "Хэрэглэгч амжилттай үүслээ", data: user });
      } catch (error) {
        // The unique email constraint and phone-reservation trigger also protect
        // simultaneous requests after the friendly preflight check above.
        if (isPhoneNumberConflict(error)) {
          return res.status(409).json({
            message: "Энэ утас эсвэл имэйлтэй хэрэглэгч бүртгэлтэй байна",
          });
        }
        console.error("[admin/manual-user] Хэрэглэгч үүсгэхэд алдаа гарлаа");
        return res
          .status(500)
          .json({ message: "Хэрэглэгч үүсгэхэд алдаа гарлаа" });
      }
    },
  );

  return router;
}

export default createManualUsersRouter();
