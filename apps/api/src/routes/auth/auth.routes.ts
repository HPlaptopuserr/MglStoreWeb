import { Router, type Router as ExpressRouter } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { isAdminRole, ADMIN_ROLE_LABELS, getPlatformPermissions } from "@mgl/types";
import { resolveOrganization } from "../../middleware/auth";

const router: ExpressRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

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

router.post("/web/login", async (req, res) => {
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
      user = await prisma.user.findFirst({
        where: { profile: { phoneNumber: identifier.trim() } },
        include: { profile: true },
      });
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

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgRole: orgInfo?.orgRole || null,
        fullName: user.profile?.fullName || "",
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

      return res.status(200).json({
        accessToken,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          fullName: updatedUser.profile?.fullName || "",
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

    return res.status(201).json({
      accessToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.profile?.fullName || "",
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

    const isPhone =
      /^[0-9+\-\s()]{7,15}$/.test(identifier.trim()) &&
      !identifier.includes("@");

    let user;
    if (isPhone) {
      user = await prisma.user.findFirst({
        where: { profile: { phoneNumber: identifier.trim() } },
        include: { profile: true },
      });
    } else {
      user = await prisma.user.findUnique({
        where: { email: identifier.trim().toLowerCase() },
        include: { profile: true },
      });
    }

    if (!user) {
      // Don't reveal whether user exists
      return res.json({ message: "Баталгаажуулах код илгээлээ" });
    }

    // Generate 4-digit code
/*     const code = crypto.randomInt(1000, 9999).toString(); */
    const code = "1234";
    const tokenHash = crypto.createHash("sha256").update(code).digest("hex");

    // Expire old tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Save hashed token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // ── DEV: Print code to terminal + return in response ──
    console.log(`\n[DEV] Password reset → ${isPhone ? 'phone: ' + identifier.trim() : 'email: ' + identifier.trim()} | code: ${code}\n`);

    return res.json({
      message: "Баталгаажуулах код илгээлээ",
      devCode: code, // DEV ONLY — production-д устгах
    });
  } catch (error) {
    console.error("[forgot-password error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
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
    const { code, password } = req.body;

    if (!code || !password) {
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
      .update(code.toString().trim())
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

export default router;
