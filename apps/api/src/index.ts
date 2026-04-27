import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import {
  authRoutes,
  investorRoutes,
  orgJoinRoutes,
  orgMemberRoutes,
  partnerRequestRoutes,
  partnerRoutes,
  vendorSetupRoutes,
  warehouseSetupRoutes,
  businessCategoriesRoutes,
  productsRoutes,
  servicePostsRoutes,
  jobApplicationRoutes,
  jobPositionRoutes,
  posRoutes,
  serviceRequestsRoutes,
  stockRequestsRoutes,
  warehousesRoutes,
  dashboardRoutes,
  siteSettingsRoutes,
  formRoutes,
  attendanceRoutes,
  chatRoutes,
  dmRoutes,
  storeCheckoutRoutes,
  vendorOrderRoutes,
  vendorMerchantRoutes,
  vendorUpgradeRoutes,
} from "./routes";

// Resolve .env from monorepo root (../../.. from src/, ../../../ from dist/)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config(); // fallback: local .env if present

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const isLocalRequest = (ip?: string) =>
  ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";

app.use(helmet());

// Global rate limiter: 200 req / 15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    skip: (req) => !isProduction && isLocalRequest(req.ip),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Хэт олон хүсэлт илгээлээ. Түр хүлээнэ үү." },
  }),
);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : [
      "http://mglstore.mn:3002",
      "http://admin.mglstore.mn:3003",
      "http://vendor.mglstore.mn:3004",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      "https://mgl-web-n7wg.onrender.com",
      "https://mgl-admin.onrender.com",
      "https://mgl-vendor.onrender.com",
      "https://mgl-warehouse.onrender.com",
      "https://mglstore.mn",
      "https://admin.mglstore.mn",
      "https://vendor.mglstore.mn",
      "https://warehouse.mglstore.mn",
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      // Allow localhost only in development
      if (!isProduction && origin.startsWith("http://localhost:")) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

app.use("/api", partnerRequestRoutes);
app.use("/api", partnerRoutes);
app.use("/api", orgJoinRoutes);
app.use("/api", orgMemberRoutes);
app.use("/api", businessCategoriesRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", jobApplicationRoutes);
app.use("/api", jobPositionRoutes);
app.use("/api", posRoutes);
app.use("/api", serviceRequestsRoutes);
app.use("/api", warehousesRoutes);
app.use("/api", stockRequestsRoutes);
app.use("/api", vendorSetupRoutes);
app.use("/api", warehouseSetupRoutes);
app.use("/api", investorRoutes);
app.use("/api", siteSettingsRoutes);
app.use("/api", productsRoutes);
app.use("/api", servicePostsRoutes);
app.use("/api", formRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", chatRoutes);
app.use("/api", dmRoutes);
app.use("/api", storeCheckoutRoutes);
app.use("/api", vendorOrderRoutes);
app.use("/api", vendorMerchantRoutes);
app.use("/api", vendorUpgradeRoutes);

app.get("/", (_req, res) => {
  res.send("API is running...");
});

// Stricter rate limit for auth endpoints: 15 req / 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Хэт олон нэвтрэх оролдлого. Түр хүлээнэ үү." },
});
app.use("/auth", authLimiter, authRoutes);

const port = process.env.PORT || 4000;

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`[api] Application is running on: http://0.0.0.0:${port}`);
});
