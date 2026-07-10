import "./config/env";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { prisma } from "@mgl/database";
import contractRoutes from "./routes/contract/contract.routes";
import {
  authRoutes,
  associationRoutes,
  businessDashboardRoutes,
  investorRoutes,
  orgJoinRoutes,
  orgMemberRoutes,
  orgTaskRoutes,
  partnerRequestRoutes,
  partnerRoutes,
  personalOrganizationRoutes,
  vendorSetupRoutes,
  warehouseSetupRoutes,
  businessCategoriesRoutes,
  productsRoutes,
  reelsRoutes,
  servicePostsRoutes,
  postsRoutes,
  vendorContentReviewRoutes,
  jobApplicationRoutes,
  jobPositionRoutes,
  posRoutes,
  serviceRequestsRoutes,
  stockRequestsRoutes,
  warehousesRoutes,
  deliveriesRoutes,
  dashboardRoutes,
  siteSettingsRoutes,
  teamRoutes,
  formRoutes,
  attendanceRoutes,
  chatRoutes,
  dmRoutes,
  storeCheckoutRoutes,
  vendorOrderRoutes,
  storeLoyaltyRoutes,
  storeBranchRoutes,
  vendorMerchantRoutes,
  vendorUpgradeRoutes,
  vendorCardTerminalRoutes,
  upgradePlansRoutes,
  adminGrantPlanRoutes,
} from "./routes";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Render sits behind a reverse proxy — trust it so rate-limit can see real IPs
if (isProduction) {
  app.set("trust proxy", 1);
}
const isLocalRequest = (ip?: string) =>
  ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

const defaultAllowedOrigins = [
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
  "https://www.mglstore.mn",
  "https://admin.mglstore.mn",
  "https://vendor.mglstore.mn",
  "https://warehouse.mglstore.mn",
  "https://org.mglstore.mn",
  "https://mgl-org.onrender.com",
];

const envAllowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
      .map((o) => o.trim())
      .filter(Boolean)
  : [];

const allowedOrigins = Array.from(
  new Set([...defaultAllowedOrigins, ...envAllowedOrigins]),
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      // Allow localhost only in development
      if (!isProduction && origin.startsWith("http://localhost:"))
        return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// The mobile apps keep chat/call state fresh while they are in the foreground.
// A small IP-only limit also groups every employee behind the same office/NAT IP,
// so 200 requests was exhausted by a single active chat in a few minutes.
const globalRateLimitMax = Number(process.env.GLOBAL_RATE_LIMIT_MAX || 3000);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: globalRateLimitMax,
    skip: (req) =>
      req.method === "OPTIONS" || (!isProduction && isLocalRequest(req.ip)),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Хэт олон хүсэлт илгээлээ. Түр хүлээнэ үү." },
  }),
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

app.use("/api", partnerRequestRoutes);
app.use("/api", associationRoutes);
app.use("/api", businessDashboardRoutes);
app.use("/api", partnerRoutes);
app.use("/api", orgJoinRoutes);
app.use("/api", orgMemberRoutes);
app.use("/api", orgTaskRoutes);
app.use("/api", personalOrganizationRoutes);
app.use("/api", businessCategoriesRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", jobApplicationRoutes);
app.use("/api", jobPositionRoutes);
app.use("/api", posRoutes);
app.use("/api", serviceRequestsRoutes);
app.use("/api", warehousesRoutes);
app.use("/api", deliveriesRoutes);
app.use("/api", stockRequestsRoutes);
app.use("/api", vendorSetupRoutes);
app.use("/api", warehouseSetupRoutes);
app.use("/api", investorRoutes);
app.use("/api", siteSettingsRoutes);
app.use("/api", teamRoutes);
app.use("/api", productsRoutes);
app.use("/api", reelsRoutes);
app.use("/api", servicePostsRoutes);
app.use("/api", postsRoutes);
app.use("/api", vendorContentReviewRoutes);
app.use("/api", formRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", chatRoutes);
app.use("/api", dmRoutes);
app.use("/api", storeCheckoutRoutes);
app.use("/api", vendorOrderRoutes);
app.use("/api", storeLoyaltyRoutes);
app.use("/api", storeBranchRoutes);
app.use("/api", vendorMerchantRoutes);
app.use("/api", vendorUpgradeRoutes);
app.use("/api", vendorCardTerminalRoutes);
app.use("/api", upgradePlansRoutes);
app.use("/api", adminGrantPlanRoutes);
app.use("/api", contractRoutes);

app.get("/", (_req, res) => {
  res.send("API is running...");
});

app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);

const port = process.env.PORT || 4000;

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`[api] Application is running on: http://0.0.0.0:${port}`);
  if (!isProduction) {
    prisma.organization
      .findMany({
        where: { deletedAt: null, status: "ACTIVE" },
        select: { id: true, name: true },
      })
      .then(async (orgs) => {
        for (const org of orgs) {
          const key = `web-products-enabled-${org.id}`;
          await prisma.siteSetting.upsert({
            where: { key },
            update: {},
            create: { key, value: "true" },
          });
        }
        console.log(
          `[api] [dev-init] Ensured web-products-enabled setting for ${orgs.length} active organizations.`,
        );
      })
      .catch((err) => {
        console.error(
          "[api] [dev-init] Failed to auto-enable web products in dev:",
          err,
        );
      });
  }
});
