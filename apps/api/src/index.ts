import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import partnerRequestRoutes from "./routes/partner-request.routes";
import partnerRoutes from "./routes/partners.routes";
import businessCategoriesRoutes from "./routes/business-categories.routes";

dotenv.config();

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : [
      "http://mglstore.mn:3002",
      "http://admin.mglstore.mn:3003",
      "http://vendor.mglstore.mn:3004",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "https://mgl-web-n7wg.onrender.com",
      "https://mgl-admin.onrender.com",
      "https://mgl-vendor.onrender.com",
      "https://mglstore.mn",
      "https://admin.mglstore.mn",
      "https://vendor.mglstore.mn",
    ];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

app.use("/api", partnerRequestRoutes);
app.use("/api", partnerRoutes);
app.use("/api", businessCategoriesRoutes);

app.get("/", (_req, res) => {
  res.send("API is running...");
});

app.post("/auth/admin/login", async (req, res) => {
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
      return res.status(401).json({
        message: "Хэрэглэгч олдсонгүй",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Хэрэглэгч идэвхгүй байна",
      });
    }

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        message: "Admin эрхгүй байна",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        message: "Нууц үг буруу байна",
      });
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
      },
      process.env.JWT_SECRET || "dev-secret-change-me",
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
    return res.status(500).json({
      message: "Сервер дээр алдаа гарлаа",
    });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email болон password шаардлагатай",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { profile: true, organization: true },
    });

    if (!user) {
      return res.status(401).json({
        message: "Хэрэглэгч олдсонгүй",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Хэрэглэгч идэвхгүй байна",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        message: "Нууц үг буруу байна",
      });
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
      process.env.JWT_SECRET || "dev-secret-change-me",
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
    return res.status(500).json({
      message: "Сервер дээр алдаа гарлаа",
    });
  }
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`[api] Application is running on: http://localhost:${port}`);
});
