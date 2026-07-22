import { Router, type Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();

const parseVersionCode = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

router.get("/app-versions/mgl-business/android", (_req, res) => {
  const latestVersionCode = parseVersionCode(
    process.env.MGL_BUSINESS_ANDROID_LATEST_VERSION_CODE,
    21,
  );
  const minimumVersionCode = Math.min(
    latestVersionCode,
    parseVersionCode(
      process.env.MGL_BUSINESS_ANDROID_MINIMUM_VERSION_CODE,
      16,
    ),
  );

  res.set("Cache-Control", "public, max-age=300");
  res.json({
    latestVersionCode,
    minimumVersionCode,
    latestVersionName:
      process.env.MGL_BUSINESS_ANDROID_LATEST_VERSION_NAME || "1.0.15",
    storeUrl:
      process.env.MGL_BUSINESS_ANDROID_STORE_URL ||
      "https://play.google.com/store/apps/details?id=mn.mglstore.business",
    releaseNotes:
      process.env.MGL_BUSINESS_ANDROID_RELEASE_NOTES ||
      "Гүйцэтгэл, чат болон мэдэгдлийн найдвартай ажиллагааг сайжрууллаа.",
  });
});

export default router;
