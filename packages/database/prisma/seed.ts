import { PrismaClient, Role, OrgType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
    },
    create: {
      email: "admin@mglstore.mn",
      password: "admin123",
      role: Role.ADMIN,
      emailVerified: true,
      organizationId: org.id,
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

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
