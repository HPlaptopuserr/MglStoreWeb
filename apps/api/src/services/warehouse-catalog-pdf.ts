import path from "node:path";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { prisma, Prisma } from "@mgl/database";
import { buildProductSearchWhere } from "./product-discovery.service";
import { warehouseProductOwnerScope } from "./warehouse-product-scope";
import { productImageOrderBy } from "../lib/product-images";
import type { CatalogDownloadScope } from "./warehouse-catalog-ticket";

export const CATALOG_FONT = path.resolve(
  __dirname,
  "../../assets/fonts/NotoSans-Regular.ttf",
);

export interface CatalogItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    price: Prisma.Decimal | string;
    unit: string | null;
    businessCategory: { name: string; parent: { name: string } | null } | null;
  };
  imageUrl?: string;
}

export function catalogWhere(
  scope: CatalogDownloadScope,
): Prisma.WarehouseInventoryWhereInput {
  return {
    warehouseId: scope.warehouseId,
    product: {
      deletedAt: null,
      isActive: true,
      ...warehouseProductOwnerScope(scope.warehouseId),
    },
    AND: [
      ...(scope.search
        ? [
            {
              OR: [
                { product: { OR: buildProductSearchWhere(scope.search) } },
                {
                  location: {
                    contains: scope.search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          ]
        : []),
      ...(scope.inStockOnly ? [{ quantity: { gt: 0 } }] : []),
      ...(scope.status === "out"
        ? [{ quantity: 0 }]
        : scope.status === "low"
          ? [
              {
                quantity: {
                  gt: 0,
                  lte: prisma.warehouseInventory.fields.minQuantity,
                },
              },
            ]
          : scope.status === "healthy"
            ? [
                {
                  quantity: {
                    gt: prisma.warehouseInventory.fields.minQuantity,
                  },
                },
              ]
            : []),
    ],
  };
}

export async function fetchCatalogItems(
  scope: CatalogDownloadScope,
): Promise<CatalogItem[]> {
  const items = await prisma.warehouseInventory.findMany({
    where: catalogWhere(scope),
    select: {
      id: true,
      quantity: true,
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          price: true,
          unit: true,
          businessCategory: {
            select: { name: true, parent: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: [{ product: { name: "asc" } }, { id: "asc" }],
  });
  const images = items.length
    ? await prisma.productImage.findMany({
        where: { productId: { in: items.map((item) => item.product.id) } },
        select: { productId: true, url: true },
        orderBy: productImageOrderBy(),
      })
    : [];
  const firstImages = new Map<string, string>();
  for (const image of images)
    if (!firstImages.has(image.productId))
      firstImages.set(image.productId, image.url);
  return items.map((item) => ({
    ...item,
    imageUrl: firstImages.get(item.product.id),
  }));
}

export function catalogGroups(items: CatalogItem[]) {
  const groups = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const category = item.product.businessCategory;
    const name = category
      ? [category.parent?.name, category.name].filter(Boolean).join(" / ")
      : "Ангилалгүй";
    const group = groups.get(name) ?? [];
    group.push(item);
    groups.set(name, group);
  }
  return [...groups.entries()].sort(([left], [right]) =>
    left.localeCompare(right, "mn"),
  );
}

function allowedImageUrl(raw: string): URL {
  const url = new URL(raw);
  const hosts = new Set([
    "mgl-api.onrender.com",
    "api.mglstore.mn",
    "mglstore.mn",
    "warehouse.mglstore.mn",
  ]);
  if (process.env.SUPABASE_URL)
    hosts.add(new URL(process.env.SUPABASE_URL).hostname);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !hosts.has(url.hostname)
  )
    throw new Error("Unsupported catalog image host");
  return url;
}

export async function loadCatalogImage(
  raw: string,
  signal: AbortSignal,
): Promise<Buffer> {
  const url = allowedImageUrl(raw);
  if (url.pathname.includes("/storage/v1/object/public/")) {
    url.pathname = url.pathname.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/",
    );
    url.searchParams.set("width", "240");
    url.searchParams.set("quality", "80");
    url.searchParams.set("resize", "contain");
  }
  // Redirects are rejected so an allowed image cannot redirect into a private network.
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
    redirect: "error",
  });
  if (!response.ok || !response.body)
    throw new Error("Catalog image unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 5 * 1024 * 1024) throw new Error("Catalog image too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return sharp(Buffer.concat(chunks), { limitInputPixels: 16_000_000 })
    .rotate()
    .resize(240, 240, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "white" })
    .jpeg({ quality: 80 })
    .toBuffer();
}

interface RenderOptions {
  document: PDFKit.PDFDocument;
  items: CatalogItem[];
  warehouseName: string;
  scopeLabel: string;
  signal: AbortSignal;
  generatedAt?: Date;
  loadImage?: typeof loadCatalogImage;
}

export async function renderCatalogPdf({
  document: doc,
  items,
  warehouseName,
  scopeLabel,
  signal,
  generatedAt = new Date(),
  loadImage = loadCatalogImage,
}: RenderOptions) {
  const groups = catalogGroups(items);
  const totalPages = groups.reduce(
    (total, [, group]) => total + Math.ceil(group.length / 12),
    0,
  );
  const date = generatedAt.toLocaleDateString("mn-MN", {
    timeZone: "Asia/Ulaanbaatar",
  });
  let pageNumber = 0;
  let missingImages = 0;
  doc.info.Title = `${warehouseName} - Худалдааны каталог`;
  doc.info.CreationDate = generatedAt;
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    width: number,
    height = 16,
    color = "#17243d",
  ) => {
    doc
      .fillColor(color)
      .fontSize(size)
      .text(value.replace(/[\r\n\t]/g, " "), x, y, {
        width,
        height,
        ellipsis: true,
        lineGap: 2,
      });
  };
  if (!items.length) {
    doc.addPage();
    text("Худалдааны каталог", 28, 28, 18, 540, 28, "#294ab8");
    text(
      "Сонгосон хайлт, шүүлтүүрт тохирох идэвхтэй бараа олдсонгүй.",
      28,
      80,
      12,
      540,
      60,
    );
  }
  for (const [category, group] of groups) {
    for (let start = 0; start < group.length; start += 12) {
      signal.throwIfAborted();
      doc.addPage();
      pageNumber += 1;
      text("MGL STORE / ХУДАЛДААНЫ КАТАЛОГ", 28, 20, 16, 540, 25, "#294ab8");
      text(
        `${warehouseName} | ${date} | ${items.length} бараа`,
        28,
        49,
        9,
        540,
      );
      text(scopeLabel, 28, 66, 8, 540, 20, "#627080");
      text(
        "Харилцагч: ____________________  Утас: ______________  Төлөөлөгч: ______________",
        28,
        86,
        9,
        540,
      );
      text(category, 28, 108, 11, 540, 29, "#294ab8");
      const batch = group.slice(start, start + 12);
      for (let offset = 0; offset < batch.length; offset += 4) {
        const images = await Promise.all(
          batch.slice(offset, offset + 4).map(async (item) => {
            if (!item.imageUrl) return null;
            try {
              return await loadImage(item.imageUrl, signal);
            } catch {
              signal.throwIfAborted();
              return null;
            }
          }),
        );
        for (let j = 0; j < images.length; j += 1) {
          signal.throwIfAborted();
          const index = offset + j;
          const item = batch[index];
          const x = 28 + (index % 2) * 274;
          const y = 142 + Math.floor(index / 2) * 108;
          doc
            .lineWidth(0.5)
            .strokeColor("#d9e0eb")
            .rect(x, y, 265, 100)
            .stroke();
          const image = images[j];
          if (image)
            doc.image(image, x + 8, y + 8, {
              fit: [66, 72],
              align: "center",
              valign: "center",
            });
          else {
            missingImages += 1;
            text(
              item.imageUrl ? "Зураг ачаалсангүй" : "Зураггүй",
              x + 8,
              y + 35,
              8,
              66,
              30,
              "#627080",
            );
          }
          text(item.product.name, x + 82, y + 7, 9, 174, 39);
          text(
            `Код: ${item.product.sku || item.product.barcode || "-"}`,
            x + 82,
            y + 49,
            7.5,
            174,
            12,
            "#627080",
          );
          const price = Number(item.product.price);
          text(
            Number.isFinite(price) && price >= 0
              ? `${price.toLocaleString("mn-MN")} ₮ / ${item.product.unit || "ш"}`
              : "Үнэ тодруулах",
            x + 82,
            y + 65,
            11,
            174,
            18,
            "#294ab8",
          );
          text(
            `Захиалах тоо: __________ ${item.product.unit || "ш"}`,
            x + 8,
            y + 86,
            8,
            249,
            12,
          );
        }
      }
      text(
        "Үнэ, нөөцийг захиалга баталгаажуулах үед нягтална.",
        28,
        808,
        8,
        450,
        12,
        "#627080",
      );
      text(`${pageNumber} / ${totalPages}`, 515, 808, 8, 52, 12, "#627080");
      doc.flushPages();
    }
  }
  return { itemCount: items.length, missingImages };
}

export function createCatalogDocument() {
  return new PDFDocument({
    autoFirstPage: false,
    size: "A4",
    margin: 0,
    font: CATALOG_FONT,
    compress: true,
  });
}
