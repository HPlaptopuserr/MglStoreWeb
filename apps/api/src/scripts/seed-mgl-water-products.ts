import path from "path";
import dotenv from "dotenv";
import { prisma } from "@mgl/database";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

const DEFAULT_ORG_NAME = "mgl bmbch steppe";
const ASSET_BASE_URL =
  process.env.MGL_WATER_ASSET_BASE_URL?.replace(/\/+$/, "") ||
  "https://mglstore.mn/mgl-water";
const PREORDER_NOTE =
  "MGL төслийн хүрээнд усны үйлдвэр байгуулагдаж байгаа бөгөөд бүтээгдэхүүний үйлдвэрлэл 2026 оны 7 сарын 1-нээс эхэлнэ. Урьдчилсан захиалга авч байна.";

type WaterProductSeed = {
  sku: string;
  name: string;
  volume: string;
  image: string;
  priceEnv: string;
};

const PRODUCTS: WaterProductSeed[] = [
  {
    sku: "MGL-WATER-330ML",
    name: "MGL Цэвэр ус 330 мл",
    volume: "330 мл",
    image: "1-1.jpg",
    priceEnv: "MGL_WATER_PRICE_330ML",
  },
  {
    sku: "MGL-WATER-500ML",
    name: "MGL Цэвэр ус 500 мл",
    volume: "500 мл",
    image: "1-3.jpg",
    priceEnv: "MGL_WATER_PRICE_500ML",
  },
  {
    sku: "MGL-WATER-900ML",
    name: "MGL Цэвэр ус 900 мл",
    volume: "900 мл",
    image: "1-2.jpg",
    priceEnv: "MGL_WATER_PRICE_900ML",
  },
  {
    sku: "MGL-WATER-5L",
    name: "MGL Цэвэр ус 5 л",
    volume: "5 л",
    image: "1-4.jpg",
    priceEnv: "MGL_WATER_PRICE_5L",
  },
  {
    sku: "MGL-WATER-10L",
    name: "MGL Цэвэр ус 10 л",
    volume: "10 л",
    image: "1-6.jpg",
    priceEnv: "MGL_WATER_PRICE_10L",
  },
  {
    sku: "MGL-WATER-18_9L",
    name: "MGL Цэвэр ус 18.9 л",
    volume: "18.9 л",
    image: "1-5.jpg",
    priceEnv: "MGL_WATER_PRICE_18_9L",
  },
];

function parsePrice(envKey: string) {
  const raw = process.env[envKey];
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${envKey} must be a non-negative number`);
  }
  return value;
}

function toSlug(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9а-яёөү]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return normalized || "mgl-water";
}

async function uniqueOrganizationSlug(name: string) {
  const base = toSlug(name);
  for (let i = 0; i < 100; i += 1) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return slug;
  }
  return `${base}-${Date.now()}`;
}

async function uniqueOrganizationTaxId() {
  const base = "MGLWATER";
  for (let i = 0; i < 100; i += 1) {
    const taxId = i === 0 ? base : `${base}${String(i + 1).padStart(2, "0")}`;
    const existing = await prisma.organization.findUnique({
      where: { taxId },
      select: { id: true },
    });
    if (!existing) return taxId;
  }
  return `${base}${Date.now()}`;
}

async function findOrCreateOrganization() {
  const explicitOrgId = process.env.MGL_WATER_ORG_ID?.trim();
  if (explicitOrgId) {
    const organization = await prisma.organization.findUnique({
      where: { id: explicitOrgId },
      select: { id: true, name: true },
    });
    if (!organization) {
      throw new Error(`Organization not found for MGL_WATER_ORG_ID=${explicitOrgId}`);
    }
    return organization;
  }

  const orgName = process.env.MGL_WATER_ORG_NAME?.trim() || DEFAULT_ORG_NAME;
  const organization =
    (await prisma.organization.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { name: { equals: orgName, mode: "insensitive" } },
          { name: { contains: "bmbch", mode: "insensitive" } },
          { name: { contains: "steppe", mode: "insensitive" } },
          { name: { contains: "бмбч", mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    })) ||
    (await prisma.organization.create({
      data: {
        name: orgName,
        slug: await uniqueOrganizationSlug(orgName),
        taxId: await uniqueOrganizationTaxId(),
        type: "SUPPLIER",
        status: "ACTIVE",
        isVerified: true,
        businessCategory: "food-beverage",
        shortDescription: "MGL төслийн цэвэр усны үйлдвэр",
        description: PREORDER_NOTE,
        openingHours: ["Захиалга авч байна"],
        customerCount: "0",
        rating: 5,
        reviewCount: 0,
      },
      select: { id: true, name: true },
    }));

  return organization;
}

async function getCategoryIds() {
  const [businessCategory, category] = await Promise.all([
    prisma.businessCategory.findFirst({
      where: {
        OR: [
          { slug: "beverage-shop" },
          { slug: "food-beverage" },
          { name: { contains: "Ундаа", mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true },
      orderBy: [{ level: "desc" }, { sortOrder: "asc" }],
    }),
    prisma.category.findFirst({
      where: {
        OR: [
          { slug: "food-grocery-ундаа-ус" },
          { name: { contains: "Ундаа, ус", mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true },
    }),
  ]);

  return {
    businessCategoryId: businessCategory?.id ?? null,
    categoryId: category?.id ?? null,
  };
}

async function main() {
  const organization = await findOrCreateOrganization();
  const { businessCategoryId, categoryId } = await getCategoryIds();

  await prisma.siteSetting.upsert({
    where: { key: `web-products-enabled-${organization.id}` },
    update: { value: "true" },
    create: { key: `web-products-enabled-${organization.id}`, value: "true" },
  });

  const results = [];

  for (const item of PRODUCTS) {
    const imageUrl = `${ASSET_BASE_URL}/${item.image}`;
    const product = await prisma.product.upsert({
      where: {
        organizationId_sku: {
          organizationId: organization.id,
          sku: item.sku,
        },
      },
      update: {
        name: item.name,
        description: `${PREORDER_NOTE}\n\nСавлагааны хэмжээ: ${item.volume}.`,
        unit: "ш",
        price: parsePrice(item.priceEnv),
        stock: 0,
        supplyType: "CHINA_PREORDER",
        preorderLeadTimeDays: 5,
        preorderNote: PREORDER_NOTE,
        isActive: true,
        reviewStatus: "APPROVED",
        reviewedAt: new Date(),
        categoryId,
        businessCategoryId,
        deletedAt: null,
        images: {
          deleteMany: {},
          create: [{ url: imageUrl }],
        },
      },
      create: {
        organizationId: organization.id,
        sku: item.sku,
        name: item.name,
        description: `${PREORDER_NOTE}\n\nСавлагааны хэмжээ: ${item.volume}.`,
        unit: "ш",
        price: parsePrice(item.priceEnv),
        stock: 0,
        supplyType: "CHINA_PREORDER",
        preorderLeadTimeDays: 5,
        preorderNote: PREORDER_NOTE,
        isActive: true,
        reviewStatus: "APPROVED",
        reviewedAt: new Date(),
        categoryId,
        businessCategoryId,
        images: {
          create: [{ url: imageUrl }],
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
      },
    });

    results.push({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: Number(product.price),
      imageUrl,
    });
  }

  console.log(
    JSON.stringify(
      {
        organization,
        assetBaseUrl: ASSET_BASE_URL,
        products: results,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
