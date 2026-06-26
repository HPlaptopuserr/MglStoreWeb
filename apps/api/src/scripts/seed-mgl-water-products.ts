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
  "Урьдчилсан захиалгаар нийлүүлнэ. Захиалгаа баталгаажуулсны дараа хүргэлт болон нийлүүлэлтийн мэдээллийг холбогдох ажилтан мэдэгдэнэ.";

type WaterProductSeed = {
  sku: string;
  name: string;
  volume: string;
  image: string;
  price: number;
  description: string;
};

const PRODUCTS: WaterProductSeed[] = [
  {
    sku: "MGL-WATER-500ML-6PACK",
    name: "MGL Цэвэр ус 500 мл x 6",
    volume: "500 мл x 6",
    image: "500ml-6pack.jpg",
    price: 5400,
    description:
      "500 мл савлагаатай 6 ширхэгийн багц.\nОффис, уулзалт, сургалт болон гэр бүлийн өдөр тутмын хэрэглээнд тохиромжтой.",
  },
  {
    sku: "MGL-WATER-900ML-6PACK",
    name: "MGL Цэвэр ус 900 мл x 6",
    volume: "900 мл x 6",
    image: "900ml-6pack.jpg",
    price: 6960,
    description:
      "900 мл савлагаатай 6 ширхэгийн багц.\nИлүү урт өдрийн хэрэглээ, спорт, аялал болон байгууллагын хэрэгцээнд тохиромжтой.",
  },
  {
    sku: "MGL-WATER-330ML-12PACK",
    name: "MGL Цэвэр ус 330 мл x 12",
    volume: "330 мл x 12",
    image: "330ml-12pack.jpg",
    price: 9300,
    description:
      "330 мл савлагаатай 12 ширхэгийн багц.\nХурал, сургалт, арга хэмжээ болон оффисын жижиг хэрэглээнд тохиромжтой.",
  },
  {
    sku: "MGL-WATER-5L-6PACK",
    name: "MGL Цэвэр ус 5 л x 6",
    volume: "5 л x 6",
    image: "5l-6pack.jpg",
    price: 17100,
    description:
      "5 л савлагаатай 6 ширхэгийн багц.\nГэр бүл, оффис болон үйлчилгээний газрын өдөр тутмын ундны усны хэрэгцээнд тохиромжтой.",
  },
  {
    sku: "MGL-WATER-18_9L-3PACK",
    name: "MGL Цэвэр ус 18.9 л x 3",
    volume: "18.9 л x 3",
    image: "18-9l-3pack.jpg",
    price: 12486,
    description:
      "18.9 л савлагаатай 3 ширхэгийн багц.\nДиспенсер болон ус түгээгч төхөөрөмжтэй байгууллага, гэр бүлд тохиромжтой.",
  },
  {
    sku: "MGL-WATER-10L-4PACK",
    name: "MGL Цэвэр ус 10 л x 4",
    volume: "10 л x 4",
    image: "10l-4pack.jpg",
    price: 16000,
    description:
      "10 л савлагаатай 4 ширхэгийн багц.\nӨрх гэр, оффис, үйлчилгээний газрын тогтмол ундны усны хэрэглээнд хэмнэлттэй сонголт.",
  },
  {
    sku: "MGL-WATER-330ML",
    name: "MGL Цэвэр ус 330 мл",
    volume: "330 мл",
    image: "1-1.jpg",
    price: 775,
    description:
      "Өдөр тутмын жижиг хэрэглээнд тохиромжтой цэвэр ус.\nАвсаархан хэмжээтэй тул уулзалт, сургалт, оффис болон замд авч явахад амар.",
  },
  {
    sku: "MGL-WATER-500ML",
    name: "MGL Цэвэр ус 500 мл",
    volume: "500 мл",
    image: "1-3.jpg",
    price: 900,
    description:
      "Таны өдөр тутмын хэрэглээнд хамгийн тохиромжтой хэмжээ.\n\nЦэвэрхэн савлагаа, энгийн загвартай, ажил сургууль болон аялалд авч явахад эвтэйхэн.",
  },
  {
    sku: "MGL-WATER-900ML",
    name: "MGL Цэвэр ус 900 мл",
    volume: "900 мл",
    image: "1-2.jpg",
    price: 1160,
    description:
      "Илүү урт өдрийн хэрэглээнд зориулав.\nСпорт, аялал, ажил дээрээ хэрэглэхэд тохиромжтой, хангалттай хэмжээтэй цэвэр ус.",
  },
  {
    sku: "MGL-WATER-5L",
    name: "MGL Цэвэр ус 5 л",
    volume: "5 л",
    image: "1-4.jpg",
    price: 2850,
    description:
      "Гэр бүл болон байгууллагын өдөр тутмын хэрэглээнд.\nХоол, цай, кофе болон ундны усны хэрэгцээнд тохиромжтой том савлагаа.",
  },
  {
    sku: "MGL-WATER-10L",
    name: "MGL Цэвэр ус 10 л",
    volume: "10 л",
    image: "1-6.jpg",
    price: 4000,
    description:
      "Өрх гэр, оффис, үйлчилгээний газарт тохиромжтой сонголт.\nӨдөр тутмын ундны усны хэрэглээг илүү хэмнэлттэй, цэгцтэй шийднэ.",
  },
  {
    sku: "MGL-WATER-18_9L",
    name: "MGL Цэвэр ус 18.9 л",
    volume: "18.9 л",
    image: "1-5.jpg",
    price: 4162,
    description:
      "Албан байгууллага, гэр бүл, үйлчилгээний газрын тогтмол хэрэглээнд.\nДиспенсер болон ус түгээгч төхөөрөмжид тохиромжтой, найдвартай том савлагаа.",
  },
];

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
        shortDescription: "MGL цэвэр усны урьдчилсан захиалга",
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
          { slug: "beverages" },
          { slug: "beverage-shop" },
          { slug: "food-beverage" },
          { name: { contains: "Ундаа, ус", mode: "insensitive" } },
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
  const now = Date.now();

  for (const [index, item] of PRODUCTS.entries()) {
    const imageUrl = `${ASSET_BASE_URL}/${item.image}`;
    const featuredCreatedAt = new Date(now + (PRODUCTS.length - index) * 1000);
    const description = `${item.description}\n\n${PREORDER_NOTE}`;
    const product = await prisma.product.upsert({
      where: {
        organizationId_sku: {
          organizationId: organization.id,
          sku: item.sku,
        },
      },
      update: {
        name: item.name,
        description,
        unit: "ш",
        price: item.price,
        stock: 0,
        supplyType: "CHINA_PREORDER",
        preorderLeadTimeDays: 1,
        preorderNote: PREORDER_NOTE,
        isActive: true,
        reviewStatus: "APPROVED",
        reviewedAt: new Date(),
        categoryId,
        businessCategoryId,
        createdAt: featuredCreatedAt,
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
        description,
        unit: "ш",
        price: item.price,
        stock: 0,
        supplyType: "CHINA_PREORDER",
        preorderLeadTimeDays: 1,
        preorderNote: PREORDER_NOTE,
        isActive: true,
        reviewStatus: "APPROVED",
        reviewedAt: new Date(),
        categoryId,
        businessCategoryId,
        createdAt: featuredCreatedAt,
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
