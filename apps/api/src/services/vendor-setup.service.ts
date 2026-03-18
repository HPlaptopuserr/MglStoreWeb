import bcrypt from "bcryptjs";
import { prisma } from "@mgl/database";

export type ValidateTokenResult = {
  valid: boolean;
  email?: string;
  organizationName?: string;
  error?: string;
};

export type SetPasswordResult = {
  success: boolean;
  message: string;
  email?: string;
};

/**
 * Validate vendor setup token
 * Returns user info if token is valid
 */
export async function validateVendorSetupToken(
  token: string,
): Promise<ValidateTokenResult> {
  if (!token) {
    return { valid: false, error: "Token шаардлагатай" };
  }

  const setupToken = await prisma.vendorSetupToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          passwordHash: true,
          organization: {
            select: {
              name: true,
            },
          },
        },
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
    return { valid: false, error: "Token хугацаа дууссан байна (24 цаг)" };
  }

  // Check if user already has a password set
  if (setupToken.user.passwordHash) {
    return {
      valid: false,
      error: "Нууц үг аль хэдийн тохируулагдсан байна",
    };
  }

  return {
    valid: true,
    email: setupToken.user.email,
    organizationName: setupToken.user.organization?.name || undefined,
  };
}

/**
 * Set password for vendor using the setup token
 */
export async function setVendorPassword(
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

  const setupToken = await prisma.vendorSetupToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          passwordHash: true,
        },
      },
    },
  });

  if (!setupToken) {
    return { success: false, message: "Token олдсонгүй" };
  }

  if (setupToken.usedAt) {
    return {
      success: false,
      message: "Энэ token аль хэдийн ашиглагдсан байна",
    };
  }

  if (new Date() > setupToken.expiresAt) {
    return { success: false, message: "Token хугацаа дууссан байна (24 цаг)" };
  }

  if (setupToken.user.passwordHash) {
    return {
      success: false,
      message: "Нууц үг аль хэдийн тохируулагдсан байна",
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    // Update user password
    await tx.user.update({
      where: { id: setupToken.user.id },
      data: { passwordHash },
    });

    // Mark token as used
    await tx.vendorSetupToken.update({
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
 * Regenerate invite token for a registration request
 * Used when the original token expires
 */
export async function regenerateInviteToken(
  requestId: string,
): Promise<{ inviteToken: string; inviteLink: string }> {
  const request = await prisma.registrationRequest.findUnique({
    where: { id: requestId },
    include: {
      approvedUser: true,
    },
  });

  if (!request) {
    throw new Error("Хүсэлт олдсонгүй");
  }

  if (!request.approvedUserId || !request.approvedUser) {
    throw new Error("Энэ хүсэлт approve хийгдээгүй байна");
  }

  // Check if user already has a password
  if (request.approvedUser.passwordHash) {
    throw new Error("Хэрэглэгч аль хэдийн нууц үг тохируулсан байна");
  }

  const crypto = await import("crypto");
  const newToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await prisma.$transaction(async (tx) => {
    // Invalidate old tokens
    await tx.vendorSetupToken.updateMany({
      where: {
        userId: request.approvedUserId!,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Mark as used so they can't be used
      },
    });

    // Create new token
    await tx.vendorSetupToken.create({
      data: {
        userId: request.approvedUserId!,
        token: newToken,
        expiresAt,
      },
    });

    // Update registration request with new token
    await tx.registrationRequest.update({
      where: { id: requestId },
      data: {
        inviteToken: newToken,
        inviteTokenExpiresAt: expiresAt,
      },
    });
  });

  const VENDOR_APP_URL =
    process.env.VENDOR_APP_URL || "https://vendor.mglstore.mn";
  const inviteLink = `${VENDOR_APP_URL}/set-password?token=${newToken}`;

  return {
    inviteToken: newToken,
    inviteLink,
  };
}
