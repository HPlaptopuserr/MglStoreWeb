import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@mgl/database";
import type { Prisma } from "@mgl/database";

export type RegisterOperatorResult = {
  success: boolean;
  message: string;
  data?: {
    userId: string;
    operatorId: string;
    email: string;
    setupLink: string;
    expiresAt: Date;
  };
};

export type ValidateTokenResult = {
  valid: boolean;
  email?: string;
  operatorId?: string;
  warehouseName?: string;
  error?: string;
};

export type SetPasswordResult = {
  success: boolean;
  message: string;
  email?: string;
};

function generateOperatorId(): string {
  return crypto.randomInt(10_000_000, 99_999_999).toString();
}

/**
 * Register warehouse operator — admin creates user with random 8-digit ID
 * and generates a password setup link (5 minute expiry)
 */
export async function registerWarehouseOperator(params: {
  email: string;
  fullName: string;
  phoneNumber?: string;
  warehouseId: string;
}): Promise<RegisterOperatorResult> {
  const { email, fullName, phoneNumber, warehouseId } = params;

  // Check warehouse exists
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
  });
  if (!warehouse) {
    return { success: false, message: "Агуулах олдсонгүй" };
  }

  // Check email not already taken
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    return { success: false, message: "Энэ имэйл хаяг бүртгэлтэй байна" };
  }

  // Generate unique 8-digit operator ID
  let operatorId = generateOperatorId();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.user.findUnique({
      where: { registerNumber: operatorId },
    });
    if (!existing) break;
    operatorId = generateOperatorId();
    attempts++;
  }
  if (attempts >= 10) {
    return { success: false, message: "Оператор ID үүсгэхэд алдаа гарлаа" };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Create user without password
    const newUser = await tx.user.create({
      data: {
        email,
        registerNumber: operatorId,
        role: "USER",
        isActive: true,
        onboardingSource: "ADMIN",
        profile: {
          create: {
            fullName,
            phoneNumber: phoneNumber || null,
          },
        },
      },
    });

    // Create setup token (5 min expiry)
    await tx.warehouseSetupToken.create({
      data: {
        userId: newUser.id,
        warehouseId,
        token,
        expiresAt,
      },
    });

    return newUser;
  });

  const baseUrl = process.env.WAREHOUSE_APP_URL || "https://warehouse.mglstore.mn";
  const setupLink = `${baseUrl}/setup?token=${token}`;

  return {
    success: true,
    message: "Агуулахын оператор амжилттай бүртгэгдлээ",
    data: {
      userId: user.id,
      operatorId,
      email,
      setupLink,
      expiresAt,
    },
  };
}

/**
 * Validate warehouse setup token
 */
export async function validateWarehouseSetupToken(
  token: string,
): Promise<ValidateTokenResult> {
  if (!token) {
    return { valid: false, error: "Token шаардлагатай" };
  }

  const setupToken = await prisma.warehouseSetupToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          registerNumber: true,
          passwordHash: true,
        },
      },
      warehouse: {
        select: { name: true },
      },
    },
  });

  if (!setupToken) {
    return { valid: false, error: "Token олдсонгүй" };
  }

  if (setupToken.usedAt) {
    return { valid: false, error: "Энэ token аль хэдийн ашиглагдсан байна" };
  }

  if (new Date() > setupToken.expiresAt) {
    return { valid: false, error: "Token хугацаа дууссан байна (5 минут)" };
  }

  if (setupToken.user.passwordHash) {
    return {
      valid: false,
      error: "Нууц үг аль хэдийн тохируулагдсан байна",
    };
  }

  return {
    valid: true,
    email: setupToken.user.email,
    operatorId: setupToken.user.registerNumber || undefined,
    warehouseName: setupToken.warehouse.name,
  };
}

/**
 * Set warehouse operator password using setup token
 */
export async function setWarehouseOperatorPassword(
  token: string,
  password: string,
): Promise<SetPasswordResult> {
  if (!token) {
    return { success: false, message: "Token шаардлагатай" };
  }

  if (!password || password.length < 8) {
    return {
      success: false,
      message: "Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой",
    };
  }

  const setupToken = await prisma.warehouseSetupToken.findUnique({
    where: { token },
    include: {
      user: {
        select: { id: true, email: true, passwordHash: true },
      },
    },
  });

  if (!setupToken) {
    return { success: false, message: "Token олдсонгүй" };
  }

  if (setupToken.usedAt) {
    return { success: false, message: "Энэ token аль хэдийн ашиглагдсан байна" };
  }

  if (new Date() > setupToken.expiresAt) {
    return { success: false, message: "Token хугацаа дууссан байна (5 минут)" };
  }

  if (setupToken.user.passwordHash) {
    return { success: false, message: "Нууц үг аль хэдийн тохируулагдсан байна" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.update({
      where: { id: setupToken.user.id },
      data: { passwordHash },
    });

    await tx.warehouseSetupToken.update({
      where: { id: setupToken.id },
      data: { usedAt: new Date() },
    });
  });

  return {
    success: true,
    message: "Нууц үг амжилттай тохируулагдлаа",
    email: setupToken.user.email,
  };
}

/**
 * Regenerate setup token for warehouse operator (admin only)
 */
export async function regenerateWarehouseSetupToken(
  userId: string,
  warehouseId: string,
): Promise<{ setupLink: string; expiresAt: Date }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    throw new Error("Хэрэглэгч олдсонгүй");
  }

  if (user.passwordHash) {
    throw new Error("Хэрэглэгч аль хэдийн нууц үг тохируулсан байна");
  }

  const newToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Invalidate old tokens
    await tx.warehouseSetupToken.updateMany({
      where: {
        userId,
        warehouseId,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // Create new token
    await tx.warehouseSetupToken.create({
      data: {
        userId,
        warehouseId,
        token: newToken,
        expiresAt,
      },
    });
  });

  const baseUrl = process.env.WAREHOUSE_APP_URL || "https://warehouse.mglstore.mn";
  const setupLink = `${baseUrl}/setup?token=${newToken}`;

  return { setupLink, expiresAt };
}
