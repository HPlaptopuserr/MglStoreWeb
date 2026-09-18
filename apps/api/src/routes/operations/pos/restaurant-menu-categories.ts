import crypto from "crypto";
import { prisma } from "@mgl/database";

export const DEFAULT_RESTAURANT_MENU_CATEGORIES = [
  { code: "SOUP", name: "1-Ñ€ Ñ…Ð¾Ð¾Ð»", sortOrder: 10 },
  { code: "HOT", name: "2-Ñ€ Ñ…Ð¾Ð¾Ð»", sortOrder: 20 },
  { code: "DRINK", name: "Ð£ÑƒÑ… Ð·Ò¯Ð¹Ð»Ñ", sortOrder: 30 },
  { code: "SET_MENU", name: "Ð¡ÐµÑ‚ Ñ…Ð¾Ð¾Ð»", sortOrder: 40 },
  { code: "GRILL", name: "Ð“Ñ€Ð¸Ð»Ð»", sortOrder: 50 },
  { code: "APPETIZER", name: "Ð—ÑƒÑƒÑˆ", sortOrder: 60 },
  { code: "COLD", name: "Ð¥Ò¯Ð¹Ñ‚ÑÐ½ Ñ…Ð¾Ð¾Ð»", sortOrder: 70 },
  { code: "DESSERT", name: "ÐÐ¼Ñ‚Ñ‚Ð°Ð½", sortOrder: 80 },
] as const;

export const normalizeRestaurantMenuCategoryName = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);

export const createRestaurantMenuCategoryCode = () =>
  `CUSTOM_${crypto.randomBytes(8).toString("hex").toUpperCase()}`;

export async function listRestaurantMenuCategories(organizationId: string) {
  const currentCount = await prisma.restaurantMenuCategory.count({
    where: { organizationId },
  });

  if (currentCount === 0) {
    await prisma.restaurantMenuCategory.createMany({
      data: DEFAULT_RESTAURANT_MENU_CATEGORIES.map((category) => ({
        organizationId,
        ...category,
      })),
      skipDuplicates: true,
    });
  }

  const [categories, usage] = await Promise.all([
    prisma.restaurantMenuCategory.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.product.groupBy({
      by: ["menuCategory"],
      where: {
        organizationId,
        deletedAt: null,
        isRestaurantMenuItem: true,
        menuCategory: { not: null },
      },
      _count: { _all: true },
    }),
  ]);

  const usageByCode = new Map(
    usage.map((item) => [item.menuCategory, item._count._all]),
  );

  return categories.map((category) => ({
    id: category.id,
    code: category.code,
    name: category.name,
    sortOrder: category.sortOrder,
    productCount: usageByCode.get(category.code) || 0,
  }));
}
