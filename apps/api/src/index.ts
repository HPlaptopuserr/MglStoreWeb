import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import partnerRequestRoutes from "./routes/partner-request.routes";
import partnerRoutes from "./routes/partners.routes";
import businessCategoriesRoutes from "./routes/business-categories.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import jobApplicationRoutes from "./routes/job-application.routes";
import jobPositionRoutes from "./routes/job-position.routes";
import serviceRequestsRoutes from "./routes/service-requests.routes";
import warehousesRoutes from "./routes/warehouses.routes";
import stockRequestsRoutes from "./routes/stock-requests.routes";
import vendorSetupRoutes from "./routes/vendor-setup.routes";
import investorRoutes from "./routes/investors.routes";
import authRoutes from "./routes/auth.routes";
import siteSettingsRoutes from "./routes/site-settings.routes";

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
app.use("/api", dashboardRoutes);
app.use("/api", jobApplicationRoutes);
app.use("/api", jobPositionRoutes);
app.use("/api", serviceRequestsRoutes);
app.use("/api", warehousesRoutes);
app.use("/api", stockRequestsRoutes);
app.use("/api", vendorSetupRoutes);
app.use("/api", investorRoutes);
app.use("/api", siteSettingsRoutes);

app.get("/", (_req, res) => {
  res.send("API is running...");
});

app.use("/auth", authRoutes);

const port = process.env.PORT || 4000;

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`[api] Application is running on: http://0.0.0.0:${port}`);
});
