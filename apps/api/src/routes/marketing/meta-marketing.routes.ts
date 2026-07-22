import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { getWebProductsEnabledOrganizationIds } from "../../services/product-visibility.service";
import {
  isMetaConversionsConfigured,
  sendMetaConversionEvent,
  type MetaConversionEvent,
} from "../../services/meta-conversions.service";

const router: ExpressRouter = Router();
const META_EVENT_NAMES = new Set([
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "Purchase",
]);

function csvCell(value: string | number) {
  const normalized = String(value).replace(/\r?\n/g, " ");
  return `"${normalized.replace(/"/g, '""')}"`;
}

function resolvePublicUrl(pathOrUrl: string, baseUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${baseUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

router.get("/marketing/meta/catalog.csv", async (req, res) => {
  const feedToken = process.env.META_CATALOG_FEED_TOKEN?.trim();
  if (feedToken && req.query.token !== feedToken) {
    return res.status(401).json({ message: "Catalog feed token буруу байна" });
  }

  const siteUrl = (
    process.env.MGL_WEB_PUBLIC_URL || "https://mglstore.mn"
  ).replace(/\/$/, "");
  const organizationIds = await getWebProductsEnabledOrganizationIds();
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      reviewStatus: "APPROVED",
      organizationId: { in: organizationIds },
      organization: { deletedAt: null, status: "ACTIVE" },
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      stock: true,
      supplyType: true,
      images: { select: { url: true }, take: 1 },
      organization: { select: { name: true } },
    },
    orderBy: [{ marketplacePriority: "desc" }, { updatedAt: "desc" }],
  });

  const header = [
    "id",
    "title",
    "description",
    "availability",
    "condition",
    "price",
    "link",
    "image_link",
    "brand",
  ];
  const rows = products
    .filter((product) => product.images[0]?.url)
    .map((product) => [
      product.id,
      product.name,
      product.description || product.name,
      product.stock > 0 || product.supplyType === "CHINA_PREORDER"
        ? "in stock"
        : "out of stock",
      "new",
      `${Number(product.price).toFixed(2)} MNT`,
      `${siteUrl}/products/${encodeURIComponent(product.id)}`,
      resolvePublicUrl(product.images[0].url, siteUrl),
      product.organization.name,
    ]);

  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'inline; filename="mglstore-meta-catalog.csv"',
    "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
  });
  return res.send(
    `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}`,
  );
});

router.post("/marketing/meta/events", async (req, res) => {
  const body = req.body as Partial<MetaConversionEvent>;
  const eventName = String(body.eventName || "");
  const eventId = String(body.eventId || "").trim();
  const sourceUrl = String(body.sourceUrl || "").trim();
  const contentIds = body.customData?.content_ids;
  const value = Number(body.customData?.value);

  if (
    !META_EVENT_NAMES.has(eventName) ||
    !eventId ||
    !/^https?:\/\//i.test(sourceUrl) ||
    !Array.isArray(contentIds) ||
    contentIds.length === 0 ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return res.status(400).json({ message: "Meta event payload буруу байна" });
  }

  if (!isMetaConversionsConfigured()) {
    return res.status(202).json({ accepted: true, configured: false });
  }

  try {
    const result = await sendMetaConversionEvent({
      eventName: eventName as MetaConversionEvent["eventName"],
      eventId,
      sourceUrl,
      customData: {
        content_ids: contentIds.map(String).slice(0, 100),
        content_name: body.customData?.content_name,
        content_type: "product",
        currency: "MNT",
        value,
        num_items: body.customData?.num_items,
      },
      clientIpAddress: req.ip,
      clientUserAgent: req.get("user-agent"),
      fbp: body.fbp,
      fbc: body.fbc,
    });

    return res
      .status(result.configured && !result.accepted ? 502 : 202)
      .json(result);
  } catch (error) {
    console.error("[meta-conversions] event delivery failed", error);
    return res.status(502).json({ message: "Meta event илгээж чадсангүй" });
  }
});

export default router;
