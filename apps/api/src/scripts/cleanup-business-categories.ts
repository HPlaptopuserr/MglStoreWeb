import path from "path";
import dotenv from "dotenv";
import { prisma } from "@mgl/database";
import { normalizeDiscoveryText, tokenizeDiscoveryText } from "../services/product-discovery.service";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

type Args = {
  apply: boolean;
  limit: number;
};

type CategorySpec = {
  slug: string;
  name: string;
  icon?: string;
  parentSlug: string;
  sortOrder: number;
};

type ProductRule = {
  targetSlug: string;
  keywords: string[];
  avoid?: string[];
  reason: string;
};

const CATEGORY_REFINEMENTS: CategorySpec[] = [
  {
    slug: "dairy-products",
    name: "Сүү, цагаан идээ",
    icon: "🥛",
    parentSlug: "food-beverage",
    sortOrder: 107,
  },
  {
    slug: "grocery-staples",
    name: "Өдөр тутмын хүнс",
    icon: "🧺",
    parentSlug: "food-beverage",
    sortOrder: 108,
  },
  {
    slug: "electronics-accessories",
    name: "Дагалдах хэрэгсэл",
    icon: "🔌",
    parentSlug: "electronics-technology",
    sortOrder: 307,
  },
  {
    slug: "kitchen-cookware",
    name: "Тогоо, хуурга",
    icon: "🍲",
    parentSlug: "kitchenware",
    sortOrder: 4031,
  },
  {
    slug: "kitchen-grills-fryers",
    name: "Шарагч, грилл",
    icon: "🔥",
    parentSlug: "kitchenware",
    sortOrder: 4032,
  },
  {
    slug: "kitchen-machines",
    name: "Гал тогооны төхөөрөмж",
    icon: "⚙️",
    parentSlug: "kitchenware",
    sortOrder: 4033,
  },
  {
    slug: "kitchen-prep-machines",
    name: "Мах, ногоо бэлтгэх төхөөрөмж",
    icon: "🔪",
    parentSlug: "kitchenware",
    sortOrder: 4034,
  },
  {
    slug: "bakery-dough-equipment",
    name: "Гурил, зуурмаг, гоймон төхөөрөмж",
    icon: "🥖",
    parentSlug: "kitchenware",
    sortOrder: 4035,
  },
  {
    slug: "beverage-juice-equipment",
    name: "Жүүс, ундаа бэлтгэх төхөөрөмж",
    icon: "🥤",
    parentSlug: "kitchenware",
    sortOrder: 4036,
  },
  {
    slug: "kitchen-holding-storage",
    name: "Халаах, хадгалах төхөөрөмж",
    icon: "♨️",
    parentSlug: "kitchenware",
    sortOrder: 4037,
  },
  {
    slug: "packaging-sealing-machines",
    name: "Битүүмжлэх төхөөрөмж",
    icon: "🥫",
    parentSlug: "packaging",
    sortOrder: 16051,
  },
  {
    slug: "livestock-processing-equipment",
    name: "Мал аж ахуйн төхөөрөмж",
    icon: "🐑",
    parentSlug: "agro-equipment",
    sortOrder: 16031,
  },
];

const PRODUCT_RULES: ProductRule[] = [
  {
    targetSlug: "kitchen-grills-fryers",
    keywords: ["грилл", "шарагч", "бин"],
    reason: "Шарагч, грилл төрлийн гал тогооны төхөөрөмж.",
  },
  {
    targetSlug: "kitchen-cookware",
    keywords: ["тогоо", "хуурга", "хуурагч", "чанах", "чанагч"],
    reason: "Тогоо, хуурга, чанах төхөөрөмж.",
  },
  {
    targetSlug: "bakery-dough-equipment",
    keywords: [
      "зуурагч",
      "зуурмаг",
      "элдэгч",
      "гурил",
      "гоймон",
      "дүүргэлт",
      "хуваах машин",
      "гурил зуурагч",
      "гурил элдэгч",
      "гоймонгийн машин",
    ],
    reason: "Гурил, зуурмаг, гоймон бэлтгэх төхөөрөмж.",
  },
  {
    targetSlug: "kitchen-prep-machines",
    keywords: [
      "мах татагч",
      "мах хэрчигч",
      "ногоо хэрчигч",
      "талх хэрчигч",
      "өндөг хутгагч",
      "хэрчигч",
      "татагч",
      "хутгагч",
    ],
    avoid: ["гурил", "гоймон", "үс", "ноос"],
    reason: "Мах, ногоо болон түүхий эд бэлтгэх төхөөрөмж.",
  },
  {
    targetSlug: "beverage-juice-equipment",
    keywords: ["шүүс шахагч", "жүүс бэлтгэгч", "шахагч", "ундаа"],
    reason: "Жүүс, ундаа бэлтгэх төхөөрөмж.",
  },
  {
    targetSlug: "kitchen-holding-storage",
    keywords: ["дулаан барьдаг", "mini bar", "халаах", "хадгалах", "хөргөх"],
    reason: "Бэлэн бүтээгдэхүүн халаах, хадгалах төхөөрөмж.",
  },
  {
    targetSlug: "kitchen-machines",
    keywords: [
      "зуурагч",
      "зуурмаг",
      "элдэгч",
      "хэрчигч",
      "татагч",
      "хутгагч",
      "шахагч",
      "дүүргэлт",
      "хуваах машин",
      "жүүс бэлтгэгч",
      "шүүс шахагч",
      "дулаан барьдаг",
      "mini bar",
      "гоймонгийн машин",
      "гурил зуурагч",
      "гурил элдэгч",
      "мах татагч",
      "ногоо хэрчигч",
      "талх хэрчигч",
    ],
    avoid: ["үс", "ноос"],
    reason: "Хоол бэлтгэх, боловсруулах гал тогооны төхөөрөмж.",
  },
  {
    targetSlug: "livestock-processing-equipment",
    keywords: ["үс", "ноос", "зулгаагч", "мал", "тахиа зулгаагч"],
    reason: "ХАА, мал аж ахуйн тоног төхөөрөмж.",
  },
  {
    targetSlug: "packaging-sealing-machines",
    keywords: ["битүүмжлэх", "лааз", "кан", "савлагаа", "баглаа"],
    reason: "Сав баглаа, битүүмжлэх тоног төхөөрөмж.",
  },
  {
    targetSlug: "electronics-accessories",
    keywords: ["usb", "кабель", "цэнэглэгч", "charger", "adapter"],
    reason: "Цахилгаан барааны дагалдах хэрэгсэл.",
  },
  {
    targetSlug: "mobile-devices",
    keywords: ["iphone", "samsung phone", "гар утас", "утас"],
    reason: "Гар утас, tablet төрлийн бараа.",
  },
  {
    targetSlug: "computers",
    keywords: ["laptop", "компьютер", "notebook"],
    reason: "Компьютер, laptop төрлийн бараа.",
  },
  {
    targetSlug: "camera-audio",
    keywords: ["tv", "телевизор", "audio", "speaker"],
    reason: "TV, аудио, медиа төхөөрөмж.",
  },
  {
    targetSlug: "clothing-store",
    keywords: ["куртка", "цамц", "өмд", "хувцас", "jacket"],
    reason: "Хувцасны ангилалд илүү ойр.",
  },
  {
    targetSlug: "shoes-bags",
    keywords: ["гутал", "пүүз", "shoe", "shoes"],
    reason: "Гутал, цүнхний ангилалд илүү ойр.",
  },
  {
    targetSlug: "dairy-products",
    keywords: ["сүү", "тараг", "аарц", "бяслаг", "цагаан идээ"],
    reason: "Сүү, цагаан идээний бүтээгдэхүүн.",
  },
  {
    targetSlug: "grocery-staples",
    keywords: ["гурил", "будаа", "элсэн чихэр", "давс", "тос", "тахианы мах", "мах 1кг"],
    avoid: ["машин", "төхөөрөмж", "зуурагч", "элдэгч", "тосонд шарах"],
    reason: "Өдөр тутмын хүнсний бүтээгдэхүүн.",
  },
];

function parseArgs(): Args {
  const args = new Set(process.argv.slice(2));
  const getValue = (name: string, fallback: string) => {
    const prefix = `${name}=`;
    const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
    return found ? found.slice(prefix.length) : fallback;
  };

  return {
    apply: args.has("--apply"),
    limit: Number(getValue("--limit", "5000")),
  };
}

function keywordMatches(text: string, tokens: string[], keyword: string) {
  const normalized = normalizeDiscoveryText(keyword);
  if (!normalized) return false;
  if (normalized.includes(" ")) return text.includes(normalized);
  return tokens.includes(normalized);
}

function findProductRule(product: {
  name: string;
  description?: string | null;
  sku?: string | null;
  organization?: { name: string } | null;
}) {
  const text = normalizeDiscoveryText(
    `${product.name} ${product.description || ""} ${product.sku || ""} ${product.organization?.name || ""}`,
  );
  const tokens = tokenizeDiscoveryText(text);

  return PRODUCT_RULES.find((rule) => {
    const avoided = rule.avoid?.some((keyword) => keywordMatches(text, tokens, keyword));
    if (avoided) return false;
    return rule.keywords.some((keyword) => keywordMatches(text, tokens, keyword));
  });
}

async function main() {
  const options = parseArgs();

  const existingCategories = await prisma.businessCategory.findMany({
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      icon: true,
      parentId: true,
      level: true,
      sortOrder: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });
  const categoryBySlug = new Map(existingCategories.map((category) => [category.slug, category]));

  const categoryActions = CATEGORY_REFINEMENTS.map((spec) => {
    const parent = categoryBySlug.get(spec.parentSlug);
    const existing = categoryBySlug.get(spec.slug);
    if (!parent) {
      return {
        type: "skip" as const,
        spec,
        reason: `Parent category not found: ${spec.parentSlug}`,
      };
    }
    const nextLevel = parent.level + 1;
    return {
      type: existing ? ("update" as const) : ("create" as const),
      spec,
      parent,
      existing,
      nextLevel,
    };
  });

  if (options.apply) {
    for (const action of categoryActions) {
      if (action.type === "skip") continue;
      await prisma.businessCategory.upsert({
        where: { slug: action.spec.slug },
        update: {
          name: action.spec.name,
          icon: action.spec.icon || null,
          sortOrder: action.spec.sortOrder,
          parentId: action.parent.id,
          level: action.nextLevel,
          isActive: true,
        },
        create: {
          slug: action.spec.slug,
          name: action.spec.name,
          icon: action.spec.icon || null,
          sortOrder: action.spec.sortOrder,
          parentId: action.parent.id,
          level: action.nextLevel,
          isActive: true,
        },
      });
    }
  }

  const categoriesAfterEnsure = options.apply
    ? await prisma.businessCategory.findMany({
        select: { id: true, slug: true, name: true, parentId: true, level: true },
      })
    : [
        ...existingCategories.map(({ id, slug, name, parentId, level }) => ({
          id,
          slug,
          name,
          parentId,
          level,
        })),
        ...categoryActions.flatMap((action) => {
          if (action.type !== "create" || !("parent" in action)) return [];
          return [
            {
              id: `new:${action.spec.slug}`,
              slug: action.spec.slug,
              name: action.spec.name,
              parentId: action.parent.id,
              level: action.nextLevel,
            },
          ];
        }),
      ];
  const nextCategoryBySlug = new Map(categoriesAfterEnsure.map((category) => [category.slug, category]));

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    take: options.limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      sku: true,
      businessCategoryId: true,
      businessCategory: { select: { id: true, slug: true, name: true } },
      organization: { select: { name: true } },
    },
  });

  const productActions = products
    .map((product) => {
      const rule = findProductRule(product);
      if (!rule) return null;
      const target = nextCategoryBySlug.get(rule.targetSlug);
      if (!target || product.businessCategoryId === target.id) return null;
      return { product, rule, target };
    })
    .filter(Boolean) as Array<{
    product: (typeof products)[number];
    rule: ProductRule;
    target: { id: string; slug: string; name: string; parentId: string | null; level: number };
  }>;

  if (options.apply) {
    for (const action of productActions) {
      await prisma.product.update({
        where: { id: action.product.id },
        data: { businessCategoryId: action.target.id },
      });
    }
  }

  const categorySummary = {
    create: categoryActions.filter((action) => action.type === "create").length,
    update: categoryActions.filter((action) => action.type === "update").length,
    skip: categoryActions.filter((action) => action.type === "skip").length,
  };
  const productSummary = productActions.reduce<Record<string, number>>((acc, action) => {
    acc[action.target.name] = (acc[action.target.name] || 0) + 1;
    return acc;
  }, {});

  console.log(
    JSON.stringify(
      {
        mode: options.apply ? "apply" : "dry-run",
        categoriesSeen: existingCategories.length,
        categoryActions: categorySummary,
        productsScanned: products.length,
        productMoves: productActions.length,
        productMovesByTarget: productSummary,
      },
      null,
      2,
    ),
  );

  console.log("\nCATEGORY_ACTIONS");
  for (const action of categoryActions) {
    if (action.type === "skip") {
      console.log(`SKIP ${action.spec.slug} => ${action.reason}`);
      continue;
    }
    console.log(
      `${options.apply ? "APPLY" : "DRY"} ${action.type.toUpperCase()} ${action.spec.slug} ${action.spec.name} parent=${action.parent.slug} level=${action.nextLevel}`,
    );
  }

  console.log("\nPRODUCT_MOVES");
  for (const action of productActions.slice(0, 80)) {
    console.log(
      `${options.apply ? "APPLY" : "DRY"} ${action.product.name} | ${action.product.businessCategory?.name || "-"} => ${action.target.name} | ${action.rule.reason}`,
    );
  }
  if (productActions.length > 80) {
    console.log(`...and ${productActions.length - 80} more product moves`);
  }

  if (!options.apply) {
    console.log("\nNo database changes made. Re-run with --apply after reviewing the plan.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
