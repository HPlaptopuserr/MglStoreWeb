import { prisma } from "@mgl/database";

async function main() {
  try {
    console.log("Testing Prisma query with 'is'...");
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        organization: { is: { deletedAt: null, status: "ACTIVE" } },
      },
      take: 1,
    });
    console.log("Success! Products count:", products.length);
  } catch (error) {
    console.error("Prisma query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
