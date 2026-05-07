import bcrypt from "bcryptjs";
import {
  PrismaClient,
  PlatformRole,
  OrgType,
  OrgStatus,
  OnboardingSource,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const org = await prisma.organization.upsert({
    where: { slug: "mgl-store" },
    update: {},
    create: {
      name: "MGL Store",
      slug: "mgl-store",
      taxId: "0000001",
      type: OrgType.SUPPLIER,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@mglstore.mn" },
    update: {
      role: PlatformRole.SUPER_ADMIN,
      emailVerified: true,
      onboardingSource: OnboardingSource.ADMIN,
      isActive: true,
      passwordHash,
    },
    create: {
      email: "admin@mglstore.mn",
      passwordHash,
      role: PlatformRole.SUPER_ADMIN,
      emailVerified: true,
      onboardingSource: OnboardingSource.ADMIN,
      isActive: true,
    },
  });

  await prisma.profile.upsert({
    where: { userId: admin.id },
    update: {
      fullName: "System Admin",
      phoneNumber: "99000000",
    },
    create: {
      userId: admin.id,
      fullName: "System Admin",
      phoneNumber: "99000000",
    },
  });

  // Ensure admin has OWNER membership in the default org
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
    update: { role: "OWNER", isPrimary: true, isActive: true },
    create: {
      userId: admin.id,
      organizationId: org.id,
      role: "OWNER",
      isPrimary: true,
      isActive: true,
    },
  });

  await prisma.category.createMany({
    data: [
      { name: "Electronics", slug: "electronics" },
      { name: "Food", slug: "food" },
      { name: "Clothing", slug: "clothing" },
    ],
    skipDuplicates: true,
  });

  const activeBusinessCategories = await prisma.businessCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { slug: true, name: true },
  });

  let mockOrganizationsUpserted = 0;

  for (const [categoryIndex, category] of activeBusinessCategories.entries()) {
    for (let i = 1; i <= 10; i++) {
      const indexPart = String(i).padStart(2, "0");
      const categoryPart = String(categoryIndex + 1).padStart(3, "0");
      const slug = `${category.slug}-mock-org-${indexPart}`;
      const taxId = `MOCK-${categoryPart}-${indexPart}`;

      await prisma.organization.upsert({
        where: { slug },
        update: {
          name: `${category.name} Mock Org ${i}`,
          businessCategory: category.slug,
          type: OrgType.SUPPLIER,
          status: OrgStatus.ACTIVE,
          deletedAt: null,
        },
        create: {
          name: `${category.name} Mock Org ${i}`,
          slug,
          taxId,
          businessCategory: category.slug,
          type: OrgType.SUPPLIER,
          status: OrgStatus.ACTIVE,
          isVerified: true,
        },
      });

      mockOrganizationsUpserted += 1;
    }
  }

  // Create sample warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: { id: "wh-001" },
    update: {},
    create: {
      id: "wh-001",
      name: "Төв агуулах",
      address: "Улаанбаатар, Хан-Уул дүүрэг, 15-р хороо",
      city: "Улаанбаатар",
      district: "Хан-Уул",
      phone: "77001122",
      capacity: 10000,
      lat: 47.9184,
      lng: 106.9177,
      createdById: admin.id,
      isActive: true,
    },
  });

  // Create sample products for inventory
  const categories = await prisma.category.findMany();
  const electronicsCategory = categories.find((c) => c.slug === "electronics");
  const foodCategory = categories.find((c) => c.slug === "food");
  const clothingCategory = categories.find((c) => c.slug === "clothing");

  const sampleProducts = [
    {
      name: "Laptop Dell XPS 15",
      sku: "DELL-XPS-15",
      price: 3500000,
      categoryId: electronicsCategory?.id,
    },
    {
      name: "iPhone 15 Pro",
      sku: "IPH-15-PRO",
      price: 4200000,
      categoryId: electronicsCategory?.id,
    },
    {
      name: 'Samsung TV 55"',
      sku: "SAM-TV-55",
      price: 2800000,
      categoryId: electronicsCategory?.id,
    },
    {
      name: "Цагаан будаа 25кг",
      sku: "RICE-25KG",
      price: 75000,
      categoryId: foodCategory?.id,
    },
    {
      name: "Тахианы мах 1кг",
      sku: "CHICKEN-1KG",
      price: 12000,
      categoryId: foodCategory?.id,
    },
    {
      name: "Сүү 1л",
      sku: "MILK-1L",
      price: 3500,
      categoryId: foodCategory?.id,
    },
    {
      name: "Өвлийн куртка",
      sku: "JACKET-WNT",
      price: 350000,
      categoryId: clothingCategory?.id,
    },
    {
      name: "Хөнгөн пүүзэн гутал",
      sku: "SHOE-SNK-01",
      price: 180000,
      categoryId: clothingCategory?.id,
    },
    {
      name: "Ажлын гутал",
      sku: "SHOE-WORK",
      price: 250000,
      categoryId: clothingCategory?.id,
    },
    {
      name: "USB-C кабель 2м",
      sku: "CABLE-USBC-2M",
      price: 15000,
      categoryId: electronicsCategory?.id,
    },
  ];

  for (const prod of sampleProducts) {
    await prisma.product.upsert({
      where: { organizationId_sku: { organizationId: org.id, sku: prod.sku! } },
      update: {},
      create: {
        name: prod.name,
        sku: prod.sku,
        price: prod.price,
        stock: 100,
        isActive: true,
        organizationId: org.id,
        categoryId: prod.categoryId || null,
      },
    });
  }

  // Get created products
  const products = await prisma.product.findMany({
    where: { organizationId: org.id },
    take: 10,
  });

  // Create warehouse inventory with 10 mock data entries
  const inventoryData = [
    {
      quantity: 25,
      minQuantity: 5,
      location: "A-1-1",
      batchNumber: "BN2024001",
    },
    {
      quantity: 50,
      minQuantity: 10,
      location: "A-1-2",
      batchNumber: "BN2024002",
    },
    {
      quantity: 15,
      minQuantity: 3,
      location: "A-2-1",
      batchNumber: "BN2024003",
    },
    {
      quantity: 200,
      minQuantity: 50,
      location: "B-1-1",
      batchNumber: "BN2024004",
      expiryDate: new Date("2025-12-31"),
    },
    {
      quantity: 80,
      minQuantity: 20,
      location: "B-1-2",
      batchNumber: "BN2024005",
      expiryDate: new Date("2025-06-30"),
    },
    {
      quantity: 300,
      minQuantity: 100,
      location: "B-2-1",
      batchNumber: "BN2024006",
      expiryDate: new Date("2025-08-15"),
    },
    {
      quantity: 40,
      minQuantity: 10,
      location: "C-1-1",
      batchNumber: "BN2024007",
    },
    {
      quantity: 60,
      minQuantity: 15,
      location: "C-1-2",
      batchNumber: "BN2024008",
    },
    {
      quantity: 35,
      minQuantity: 8,
      location: "C-2-1",
      batchNumber: "BN2024009",
    },
    {
      quantity: 150,
      minQuantity: 30,
      location: "A-3-1",
      batchNumber: "BN2024010",
    },
  ];

  for (let i = 0; i < Math.min(products.length, inventoryData.length); i++) {
    const product = products[i];
    const inv = inventoryData[i];

    await prisma.warehouseInventory.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: warehouse.id,
          productId: product.id,
        },
      },
      update: {
        quantity: inv.quantity,
        minQuantity: inv.minQuantity,
        location: inv.location,
        batchNumber: inv.batchNumber,
        expiryDate: inv.expiryDate || null,
        lastRestockedAt: new Date(),
      },
      create: {
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: inv.quantity,
        minQuantity: inv.minQuantity,
        location: inv.location,
        batchNumber: inv.batchNumber,
        expiryDate: inv.expiryDate || null,
        lastRestockedAt: new Date(),
        note: `${product.name} - Байршил: ${inv.location}`,
      },
    });
  }

  // Assign warehouse to organization
  await prisma.warehouseOrganization.upsert({
    where: {
      warehouseId_organizationId: {
        warehouseId: warehouse.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      warehouseId: warehouse.id,
      organizationId: org.id,
      assignedById: admin.id,
    },
  });

  // ─── Upgrade Plans ─────────────────────────────────────────────────────
  const upgradePlanData = [
    {
      code: "trial",
      name: "Үнэгүй туршилт",
      description: null,
      price: 0,
      durationDays: 14,
      maxProducts: 30,
      maxImages: 3,
      maxCategories: 5,
      hasBanner: true,
      hasAnalytics: false,
      isTrial: true,
      badge: "Үнэгүй",
      isRecommended: false,
      isActive: true,
      sortOrder: 1,
    },
    {
      code: "monthly",
      name: "1 Сар",
      description: "Шинээр эхэлж байгаа дэлгүүрт",
      price: 49900,
      durationDays: 30,
      maxProducts: 150,
      maxImages: 5,
      maxCategories: 10,
      hasBanner: true,
      hasAnalytics: true,
      isTrial: false,
      badge: null,
      isRecommended: false,
      isActive: true,
      sortOrder: 2,
    },
    {
      code: "quarterly",
      name: "3 Сар",
      description: "Тогтвортой ашиглах хамгийн тохиромжтой",
      price: 129900,
      durationDays: 90,
      maxProducts: 500,
      maxImages: 8,
      maxCategories: 20,
      hasBanner: true,
      hasAnalytics: true,
      isTrial: false,
      badge: "Хамгийн тохиромжтой",
      isRecommended: true,
      isActive: true,
      sortOrder: 3,
    },
    {
      code: "half_year",
      name: "6 Сар",
      description: "Борлуулалт идэвхтэй дэлгүүрт",
      price: 239900,
      durationDays: 180,
      maxProducts: 1000,
      maxImages: 10,
      maxCategories: 50,
      hasBanner: true,
      hasAnalytics: true,
      isTrial: false,
      badge: "Хэмнэлттэй",
      isRecommended: false,
      isActive: true,
      sortOrder: 4,
    },
    {
      code: "yearly",
      name: "1 Жил",
      description: "Брэндээ урт хугацаанд хөгжүүлэхэд",
      price: 449900,
      durationDays: 365,
      maxProducts: 3000,
      maxImages: 15,
      maxCategories: 100,
      hasBanner: true,
      hasAnalytics: true,
      isTrial: false,
      badge: "Хамгийн ашигтай",
      isRecommended: false,
      isActive: true,
      sortOrder: 5,
    },
  ];

  for (const plan of upgradePlanData) {
    await (prisma.upgradePlan as any).upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        durationDays: plan.durationDays,
        maxProducts: plan.maxProducts,
        maxImages: plan.maxImages,
        maxCategories: plan.maxCategories,
        hasBanner: plan.hasBanner,
        hasAnalytics: plan.hasAnalytics,
        isTrial: plan.isTrial,
        badge: plan.badge,
        isRecommended: plan.isRecommended,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
      },
      create: plan,
    });
  }

  console.log("✅ Seed completed");
  console.log(
    `   - Active business categories: ${activeBusinessCategories.length}`,
  );
  console.log(
    `   - Upserted mock organizations: ${mockOrganizationsUpserted}`,
  );
  console.log(`   - Created warehouse: ${warehouse.name}`);
  console.log(`   - Created ${products.length} products`);
  console.log(
    `   - Created ${inventoryData.length} warehouse inventory entries`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
