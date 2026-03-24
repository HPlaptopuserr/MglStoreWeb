import { Router, type Router as ExpressRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";

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

    if (user.role !== "ADMIN") {
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
        fullName: user.profile?.fullName || "",
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
        include: { profile: true, organization: true },
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
            include: { profile: true, organization: true },
          });
        }
      }
    } else {
      user = await prisma.user.findUnique({
        where: { email: identifier.trim().toLowerCase() },
        include: { profile: true, organization: true },
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

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
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
        fullName: user.profile?.fullName || "",
        organizationId: user.organizationId,
        organizationName: user.organization?.name || "",
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
        include: { profile: true, organization: true },
      });
    } else {
      user = await prisma.user.findUnique({
        where: { email: identifier.trim().toLowerCase() },
        include: { profile: true, organization: true },
      });
    }

    if (!user) {
      return res.status(401).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Хэрэглэгч идэвхгүй байна" });
    }

    if (!["SUPPLIER", "CUSTOMER", "INDIVIDUAL"].includes(user.role)) {
      return res.status(403).json({
        message: "Энэ эрхтэй хэрэглэгч web нэвтрэлт ашиглах боломжгүй.",
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

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
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
        fullName: user.profile?.fullName || "",
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
      if (existingUser.role === "ADMIN") {
        return res.status(409).json({
          message: isPhone
            ? "Энэ утасны дугаар бүртгэгдсэн байна"
            : "Энэ и-мэйл бүртгэгдсэн байна",
        });
      }

      const existingHash = existingUser.passwordHash;
      const passwordHash = existingHash || (await bcrypt.hash(password, 10));

      if (existingHash) {
        const isValidPassword = await bcrypt.compare(password, existingHash);
        if (!isValidPassword) {
          return res.status(409).json({
            message:
              "Энэ и-мэйл/утсаар бүртгэлтэй байна. Нэвтрэхдээ тухайн бүртгэлийн нууц үгийг ашиглана уу.",
          });
        }
      }

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
        role: "CUSTOMER",
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

export default router;
