import crypto from "crypto";
import { prisma } from "@mgl/database";

export const DEFAULT_RESTAURANT_MENU_CATEGORIES = [
  { code: "SOUP", name: "1-р хоол", sortOrder: 10 },
  { code: "HOT", name: "2-р хоол", sortOrder: 20 },
  { code: "DRINK", name: "Уух зүйлс", sortOrder: 30 },
  { code: "SET_MENU", name: "Сет хоол", sortOrder: 40 },
  { code: "GRILL", name: "Грилл", sortOrder: 50 },
  { code: "APPETIZER", name: "Зууш", sortOrder: 60 },
  { code: "COLD", name: "Хүйтэн хоол", sortOrder: 70 },
  { code: "DESSERT", name: "Амттан", sortOrder: 80 },
] as const;

const LEGACY_MOJIBAKE_DEFAULT_NAMES: Readonly<Record<string, string>> = {
  SOUP: "\u0031\u002d\u00d1\u20ac\u0020\u00d1\u2026\u00d0\u00be\u00d0\u00be\u00d0\u00bb",
  HOT: "\u0032\u002d\u00d1\u20ac\u0020\u00d1\u2026\u00d0\u00be\u00d0\u00be\u00d0\u00bb",
  DRINK:
    "\u00d0\u00a3\u00d1\u0192\u00d1\u2026\u0020\u00d0\u00b7\u00d2\u00af\u00d0\u00b9\u00d0\u00bb\u00d1\u0081",
  SET_MENU:
    "\u00d0\u00a1\u00d0\u00b5\u00d1\u201a\u0020\u00d1\u2026\u00d0\u00be\u00d0\u00be\u00d0\u00bb",
  GRILL:
    "\u00d0\u201c\u00d1\u20ac\u00d0\u00b8\u00d0\u00bb\u00d0\u00bb",
  APPETIZER:
    "\u00d0\u2014\u00d1\u0192\u00d1\u0192\u00d1\u02c6",
  COLD:
    "\u00d0\u00a5\u00d2\u00af\u00d0\u00b9\u00d1\u201a\u00d1\u008d\u00d0\u00bd\u0020\u00d1\u2026\u00d0\u00be\u00d0\u00be\u00d0\u00bb",
  DESSERT:
    "\u00d0\u0090\u00d0\u00bc\u00d1\u201a\u00d1\u201a\u00d0\u00b0\u00d0\u00bd",
};

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

  let [categories, usage] = await Promise.all([
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

  const defaultByCode = new Map(
    DEFAULT_RESTAURANT_MENU_CATEGORIES.map((category) => [
      category.code,
      category,
    ]),
  );
  const legacyCategories = categories.flatMap((category) => {
    const defaultCategory = defaultByCode.get(
      category.code as (typeof DEFAULT_RESTAURANT_MENU_CATEGORIES)[number]["code"],
    );
    if (
      !defaultCategory ||
      category.name !== LEGACY_MOJIBAKE_DEFAULT_NAMES[category.code]
    ) {
      return [];
    }
    return [{ ...category, repairedName: defaultCategory.name }];
  });

  if (legacyCategories.length > 0) {
    await prisma.$transaction(
      legacyCategories.map((category) =>
        prisma.restaurantMenuCategory.updateMany({
          where: { id: category.id, name: category.name },
          data: { name: category.repairedName },
        }),
      ),
    );
    categories = await prisma.restaurantMenuCategory.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

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
