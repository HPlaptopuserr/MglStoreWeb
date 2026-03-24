import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  authRoutes,
  investorRoutes,
  partnerRequestRoutes,
  partnerRoutes,
  vendorSetupRoutes,
  businessCategoriesRoutes,
  productsRoutes,
  servicePostsRoutes,
  jobApplicationRoutes,
  jobPositionRoutes,
  serviceRequestsRoutes,
  stockRequestsRoutes,
  warehousesRoutes,
  dashboardRoutes,
  siteSettingsRoutes,
} from "./routes";

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
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

app.use("/api", partnerRequestRoutes);
app.use("/api", partnerRoutes);
app.use("/api", businessCategoriesRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", jobApplicationRoutes);
app.use("/api", jobPositionRoutes);
app.use("/api", serviceRequestsRoutes);
app.use("/api", warehousesRoutes);
app.use("/api", stockRequestsRoutes);
app.use("/api", vendorSetupRoutes);
app.use("/api", investorRoutes);
app.use("/api", siteSettingsRoutes);
app.use("/api", productsRoutes);
app.use("/api", servicePostsRoutes);

app.get("/", (_req, res) => {
  res.send("API is running...");
});

app.use("/auth", authRoutes);

const port = process.env.PORT || 4000;

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`[api] Application is running on: http://0.0.0.0:${port}`);
});
