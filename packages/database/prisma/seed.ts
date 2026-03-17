import bcrypt from "bcryptjs";
import { PrismaClient, Role, OrgType, OnboardingSource } from "@prisma/client";

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
      role: Role.ADMIN,
      emailVerified: true,
      organizationId: org.id,
      onboardingSource: OnboardingSource.ADMIN,
      isActive: true,
      passwordHash,
    },
    create: {
      email: "admin@mglstore.mn",
      passwordHash,
      role: Role.ADMIN,
      emailVerified: true,
      organizationId: org.id,
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

  await prisma.category.createMany({
    data: [
      { name: "Electronics", slug: "electronics" },
      { name: "Food", slug: "food" },
      { name: "Clothing", slug: "clothing" },
    ],
    skipDuplicates: true,
  });

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

  console.log("✅ Seed completed");
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
