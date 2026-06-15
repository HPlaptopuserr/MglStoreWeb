import path from "path";
import dotenv from "dotenv";
import { prisma } from "@mgl/database";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

type Args = {
  apply: boolean;
};

type CategorySpec = {
  slug: string;
  name: string;
  icon?: string;
  parentSlug?: string | null;
  sortOrder: number;
};

type LegacyParentSpec = {
  slug: string;
  parentSlug: string;
  sortOrder: number;
};

const MARKETPLACE_CATEGORIES: CategorySpec[] = [
  { slug: "market-food-grocery", name: "Хүнс, өдөр тутмын хэрэглээ", icon: "🛒", parentSlug: null, sortOrder: 100 },
  { slug: "fresh-produce", name: "Жимс, хүнсний ногоо", icon: "🥦", parentSlug: "market-food-grocery", sortOrder: 101 },
  { slug: "meat-seafood", name: "Мах, загас, далайн бүтээгдэхүүн", icon: "🥩", parentSlug: "market-food-grocery", sortOrder: 102 },
  { slug: "dairy-products", name: "Сүү, цагаан идээ", icon: "🥛", parentSlug: "market-food-grocery", sortOrder: 103 },
  { slug: "bakery-products", name: "Талх, нарийн боов", icon: "🥐", parentSlug: "market-food-grocery", sortOrder: 104 },
  { slug: "beverages", name: "Ундаа, ус, жүүс", icon: "🥤", parentSlug: "market-food-grocery", sortOrder: 105 },
  { slug: "snacks-sweets", name: "Амттан, snack", icon: "🍫", parentSlug: "market-food-grocery", sortOrder: 106 },
  { slug: "grocery-staples", name: "Өдөр тутмын хүнс", icon: "🧺", parentSlug: "market-food-grocery", sortOrder: 107 },
  { slug: "canned-packaged-food", name: "Лаазалсан, савласан хүнс", icon: "🥫", parentSlug: "market-food-grocery", sortOrder: 108 },
  { slug: "frozen-food", name: "Хөлдөөсөн хүнс", icon: "🧊", parentSlug: "market-food-grocery", sortOrder: 109 },
  { slug: "baby-food", name: "Хүүхдийн хүнс", icon: "🍼", parentSlug: "market-food-grocery", sortOrder: 110 },

  { slug: "restaurant-cafe", name: "Ресторан, кафе", icon: "🍽️", parentSlug: null, sortOrder: 180 },
  { slug: "ready-meals", name: "Бэлэн хоол", icon: "🍱", parentSlug: "restaurant-cafe", sortOrder: 181 },
  { slug: "coffee-tea", name: "Кофе, цай", icon: "☕", parentSlug: "restaurant-cafe", sortOrder: 182 },
  { slug: "dessert-bakery-cafe", name: "Амттан, bakery cafe", icon: "🍰", parentSlug: "restaurant-cafe", sortOrder: 183 },
  { slug: "fast-food", name: "Түргэн хоол", icon: "🍔", parentSlug: "restaurant-cafe", sortOrder: 184 },
  { slug: "catering-services", name: "Кейтеринг, захиалгын хоол", icon: "🍲", parentSlug: "restaurant-cafe", sortOrder: 185 },

  { slug: "commerce-retail", name: "Худалдаа, дэлгүүр", icon: "🏬", parentSlug: null, sortOrder: 190 },
  { slug: "retail-shops", name: "Жижиглэн худалдаа", icon: "🛍️", parentSlug: "commerce-retail", sortOrder: 191 },
  { slug: "wholesale-trade", name: "Бөөний худалдаа", icon: "📦", parentSlug: "commerce-retail", sortOrder: 192 },
  { slug: "import-export", name: "Импорт, экспорт", icon: "🚢", parentSlug: "commerce-retail", sortOrder: 193 },
  { slug: "marketplace-other", name: "Бусад худалдаа", icon: "🧩", parentSlug: "commerce-retail", sortOrder: 194 },

  { slug: "fashion-beauty", name: "Загвар, гоо сайхан", icon: "🛍️", parentSlug: null, sortOrder: 200 },
  { slug: "women-clothing", name: "Эмэгтэй хувцас", icon: "👗", parentSlug: "fashion-beauty", sortOrder: 201 },
  { slug: "men-clothing", name: "Эрэгтэй хувцас", icon: "👔", parentSlug: "fashion-beauty", sortOrder: 202 },
  { slug: "kids-clothing", name: "Хүүхдийн хувцас", icon: "🧒", parentSlug: "fashion-beauty", sortOrder: 203 },
  { slug: "shoes-bags", name: "Гутал, цүнх", icon: "👟", parentSlug: "fashion-beauty", sortOrder: 204 },
  { slug: "jewelry-watches", name: "Гоёл чимэглэл, цаг", icon: "💍", parentSlug: "fashion-beauty", sortOrder: 205 },
  { slug: "beauty-skincare", name: "Арьс арчилгаа", icon: "🧴", parentSlug: "fashion-beauty", sortOrder: 206 },
  { slug: "makeup", name: "Нүүр будалт", icon: "💄", parentSlug: "fashion-beauty", sortOrder: 207 },
  { slug: "hair-care", name: "Үс арчилгаа", icon: "💇", parentSlug: "fashion-beauty", sortOrder: 208 },
  { slug: "perfume-fragrance", name: "Үнэртэн", icon: "🌸", parentSlug: "fashion-beauty", sortOrder: 209 },
  { slug: "personal-care", name: "Хувийн арчилгаа", icon: "🧼", parentSlug: "fashion-beauty", sortOrder: 210 },

  { slug: "electronics-technology", name: "Цахилгаан бараа, технологи", icon: "📱", parentSlug: null, sortOrder: 300 },
  { slug: "mobile-devices", name: "Гар утас, таблет", icon: "📱", parentSlug: "electronics-technology", sortOrder: 301 },
  { slug: "computers", name: "Компьютер, laptop", icon: "💻", parentSlug: "electronics-technology", sortOrder: 302 },
  { slug: "computer-components", name: "Компьютерийн эд анги", icon: "🧩", parentSlug: "electronics-technology", sortOrder: 303 },
  { slug: "gaming", name: "Gaming, console", icon: "🎮", parentSlug: "electronics-technology", sortOrder: 304 },
  { slug: "camera-audio", name: "Камер, аудио", icon: "🎧", parentSlug: "electronics-technology", sortOrder: 305 },
  { slug: "tv-home-theater", name: "TV, home theater", icon: "📺", parentSlug: "electronics-technology", sortOrder: 306 },
  { slug: "network-smart-home", name: "Сүлжээ, smart home", icon: "📡", parentSlug: "electronics-technology", sortOrder: 307 },
  { slug: "electronics-accessories", name: "Дагалдах хэрэгсэл", icon: "🔌", parentSlug: "electronics-technology", sortOrder: 308 },
  { slug: "pos-retail-equipment", name: "POS, кассын төхөөрөмж", icon: "🧾", parentSlug: "electronics-technology", sortOrder: 309 },

  { slug: "home-living", name: "Гэр ахуй, тавилга", icon: "🏠", parentSlug: null, sortOrder: 400 },
  { slug: "furniture", name: "Тавилга", icon: "🛋️", parentSlug: "home-living", sortOrder: 401 },
  { slug: "bedding-bedroom", name: "Унтлагын өрөө, ор дэр", icon: "🛏️", parentSlug: "home-living", sortOrder: 402 },
  { slug: "bathroom", name: "Угаалгын өрөө", icon: "🚿", parentSlug: "home-living", sortOrder: 403 },
  { slug: "cleaning-supplies", name: "Цэвэрлэгээ, ахуйн хэрэглээ", icon: "🧽", parentSlug: "home-living", sortOrder: 404 },
  { slug: "home-decor", name: "Гэрийн чимэглэл", icon: "🖼️", parentSlug: "home-living", sortOrder: 405 },
  { slug: "lighting", name: "Гэрэлтүүлэг", icon: "💡", parentSlug: "home-living", sortOrder: 406 },
  { slug: "garden-outdoor", name: "Цэцэрлэг, outdoor", icon: "🪴", parentSlug: "home-living", sortOrder: 407 },
  { slug: "tools-hardware", name: "Багаж, хэрэгсэл", icon: "🧰", parentSlug: "home-living", sortOrder: 408 },
  { slug: "kitchenware", name: "Гал тогооны хэрэгсэл", icon: "🍳", parentSlug: "home-living", sortOrder: 409 },
  { slug: "kitchen-utensils", name: "Сав суулга, хэрэгсэл", icon: "🍴", parentSlug: "kitchenware", sortOrder: 4091 },
  { slug: "dishware-tableware", name: "Аяга таваг, ширээний хэрэгсэл", icon: "🍽️", parentSlug: "kitchenware", sortOrder: 4092 },
  { slug: "kitchen-storage", name: "Гал тогооны хадгалах сав", icon: "🫙", parentSlug: "kitchenware", sortOrder: 4093 },
  { slug: "kitchen-cookware", name: "Тогоо, хуурга", icon: "🍲", parentSlug: "kitchenware", sortOrder: 4094 },
  { slug: "kitchen-grills-fryers", name: "Шарагч, грилл", icon: "🔥", parentSlug: "kitchenware", sortOrder: 4095 },
  { slug: "kitchen-machines", name: "Гал тогооны төхөөрөмж", icon: "⚙️", parentSlug: "kitchenware", sortOrder: 4096 },
  { slug: "kitchen-prep-machines", name: "Мах, ногоо бэлтгэх төхөөрөмж", icon: "🔪", parentSlug: "kitchenware", sortOrder: 4097 },
  { slug: "bakery-dough-equipment", name: "Гурил, зуурмаг, гоймон төхөөрөмж", icon: "🥖", parentSlug: "kitchenware", sortOrder: 4098 },
  { slug: "beverage-juice-equipment", name: "Жүүс, ундаа бэлтгэх төхөөрөмж", icon: "🥤", parentSlug: "kitchenware", sortOrder: 4099 },
  { slug: "kitchen-holding-storage", name: "Халаах, хадгалах төхөөрөмж", icon: "♨️", parentSlug: "kitchenware", sortOrder: 4100 },

  { slug: "baby-kids", name: "Хүүхэд, нярай", icon: "🧸", parentSlug: null, sortOrder: 500 },
  { slug: "baby-care", name: "Нярай арчилгаа", icon: "🍼", parentSlug: "baby-kids", sortOrder: 501 },
  { slug: "toys-games", name: "Тоглоом", icon: "🪁", parentSlug: "baby-kids", sortOrder: 502 },
  { slug: "school-supplies-kids", name: "Сурагчийн хэрэгсэл", icon: "🎒", parentSlug: "baby-kids", sortOrder: 503 },
  { slug: "strollers-car-seats", name: "Тэрэг, машины суудал", icon: "🚼", parentSlug: "baby-kids", sortOrder: 504 },

  { slug: "health-wellness", name: "Эрүүл мэнд, wellness", icon: "💊", parentSlug: null, sortOrder: 600 },
  { slug: "pharmacy-medicine", name: "Эм, эмийн сан", icon: "💊", parentSlug: "health-wellness", sortOrder: 601 },
  { slug: "vitamins-supplements", name: "Витамин, нэмэлт бүтээгдэхүүн", icon: "🌿", parentSlug: "health-wellness", sortOrder: 602 },
  { slug: "medical-devices", name: "Эмнэлгийн хэрэгсэл", icon: "🩺", parentSlug: "health-wellness", sortOrder: 603 },
  { slug: "fitness-recovery", name: "Фитнес, нөхөн сэргээх", icon: "💪", parentSlug: "health-wellness", sortOrder: 604 },

  { slug: "sports-outdoor", name: "Спорт, аялал", icon: "🏕️", parentSlug: null, sortOrder: 700 },
  { slug: "fitness-equipment", name: "Фитнес төхөөрөмж", icon: "🏋️", parentSlug: "sports-outdoor", sortOrder: 701 },
  { slug: "sportswear", name: "Спорт хувцас, гутал", icon: "🏃", parentSlug: "sports-outdoor", sortOrder: 702 },
  { slug: "camping-hiking", name: "Аялал, кемпинг", icon: "⛺", parentSlug: "sports-outdoor", sortOrder: 703 },
  { slug: "cycling-mobility", name: "Дугуй, хөдөлгөөнт хэрэгсэл", icon: "🚲", parentSlug: "sports-outdoor", sortOrder: 704 },

  { slug: "books-office", name: "Ном, бичиг хэрэг, оффис", icon: "📚", parentSlug: null, sortOrder: 800 },
  { slug: "books", name: "Ном", icon: "📖", parentSlug: "books-office", sortOrder: 801 },
  { slug: "stationery", name: "Бичиг хэрэг", icon: "✏️", parentSlug: "books-office", sortOrder: 802 },
  { slug: "office-supplies", name: "Оффис хэрэгсэл", icon: "📎", parentSlug: "books-office", sortOrder: 803 },
  { slug: "printing-services", name: "Хэвлэл, print service", icon: "🖨️", parentSlug: "books-office", sortOrder: 804 },

  { slug: "auto-moto", name: "Авто, мото", icon: "🚗", parentSlug: null, sortOrder: 900 },
  { slug: "auto-parts", name: "Сэлбэг", icon: "⚙️", parentSlug: "auto-moto", sortOrder: 901 },
  { slug: "tires-wheels", name: "Дугуй, обуд", icon: "🛞", parentSlug: "auto-moto", sortOrder: 902 },
  { slug: "car-care", name: "Авто арчилгаа", icon: "🧴", parentSlug: "auto-moto", sortOrder: 903 },
  { slug: "car-electronics", name: "Авто цахилгаан хэрэгсэл", icon: "🔋", parentSlug: "auto-moto", sortOrder: 904 },
  { slug: "motorcycle", name: "Мото хэрэгсэл", icon: "🏍️", parentSlug: "auto-moto", sortOrder: 905 },

  { slug: "construction-tools", name: "Барилга, засвар", icon: "🏗️", parentSlug: null, sortOrder: 1000 },
  { slug: "building-materials", name: "Барилгын материал", icon: "🧱", parentSlug: "construction-tools", sortOrder: 1001 },
  { slug: "paint-finishing", name: "Будаг, өнгөлгөө", icon: "🎨", parentSlug: "construction-tools", sortOrder: 1002 },
  { slug: "plumbing-sanitary", name: "Сантехник", icon: "🚰", parentSlug: "construction-tools", sortOrder: 1003 },
  { slug: "electrical-supplies", name: "Цахилгааны материал", icon: "🔌", parentSlug: "construction-tools", sortOrder: 1004 },
  { slug: "power-tools", name: "Цахилгаан багаж", icon: "🛠️", parentSlug: "construction-tools", sortOrder: 1005 },
  { slug: "safety-workwear", name: "ХАБЭА, ажлын хувцас", icon: "🦺", parentSlug: "construction-tools", sortOrder: 1006 },

  { slug: "agriculture-industrial", name: "ХАА, үйлдвэр", icon: "🚜", parentSlug: null, sortOrder: 1100 },
  { slug: "agro-equipment", name: "ХАА тоног төхөөрөмж", icon: "🚜", parentSlug: "agriculture-industrial", sortOrder: 1101 },
  { slug: "livestock-processing-equipment", name: "Мал аж ахуйн төхөөрөмж", icon: "🐑", parentSlug: "agro-equipment", sortOrder: 11011 },
  { slug: "seeds-fertilizer", name: "Үр, бордоо", icon: "🌱", parentSlug: "agriculture-industrial", sortOrder: 1102 },
  { slug: "industrial-equipment", name: "Үйлдвэрийн тоног төхөөрөмж", icon: "🏭", parentSlug: "agriculture-industrial", sortOrder: 1103 },
  { slug: "packaging", name: "Сав баглаа боодол", icon: "📦", parentSlug: "agriculture-industrial", sortOrder: 1104 },
  { slug: "packaging-sealing-machines", name: "Битүүмжлэх төхөөрөмж", icon: "🥫", parentSlug: "packaging", sortOrder: 11041 },
  { slug: "raw-materials", name: "Түүхий эд, материал", icon: "🧪", parentSlug: "agriculture-industrial", sortOrder: 1105 },

  { slug: "services-marketplace", name: "Үйлчилгээ", icon: "🤝", parentSlug: null, sortOrder: 1200 },
  { slug: "repair-maintenance", name: "Засвар, үйлчилгээ", icon: "🔧", parentSlug: "services-marketplace", sortOrder: 1201 },
  { slug: "delivery-logistics", name: "Хүргэлт, логистик", icon: "🚚", parentSlug: "services-marketplace", sortOrder: 1202 },
  { slug: "education-consulting", name: "Сургалт, зөвлөх үйлчилгээ", icon: "🎓", parentSlug: "services-marketplace", sortOrder: 1203 },
  { slug: "travel-hotel", name: "Аялал, байр үйлчилгээ", icon: "🏨", parentSlug: "services-marketplace", sortOrder: 1204 },
  { slug: "event-services", name: "Event, арга хэмжээ", icon: "🎤", parentSlug: "services-marketplace", sortOrder: 1205 },

  { slug: "pets", name: "Амьтны хэрэгсэл", icon: "🐾", parentSlug: null, sortOrder: 1300 },
  { slug: "pet-food", name: "Амьтны хоол", icon: "🐶", parentSlug: "pets", sortOrder: 1301 },
  { slug: "pet-care-accessories", name: "Амьтны арчилгаа, хэрэгсэл", icon: "🐾", parentSlug: "pets", sortOrder: 1302 },
];

const LEGACY_PARENT_REFINEMENTS: LegacyParentSpec[] = [
  { slug: "food", parentSlug: "market-food-grocery", sortOrder: 111 },
  { slug: "-", parentSlug: "restaurant-cafe", sortOrder: 186 },
  { slug: "restaurant", parentSlug: "commerce-retail", sortOrder: 195 },
  { slug: "-foreign-trade", parentSlug: "commerce-retail", sortOrder: 196 },
  { slug: "tourism-and-accommodation-services-", parentSlug: "services-marketplace", sortOrder: 1206 },
  { slug: "services", parentSlug: "services-marketplace", sortOrder: 1207 },
  { slug: "construction", parentSlug: "construction-tools", sortOrder: 1007 },
  { slug: "-building-material", parentSlug: "construction-tools", sortOrder: 1008 },
  { slug: "production", parentSlug: "agriculture-industrial", sortOrder: 1106 },
  { slug: "-agriculture", parentSlug: "agriculture-industrial", sortOrder: 1107 },
  { slug: "-medical", parentSlug: "health-wellness", sortOrder: 605 },
  { slug: "-pharmacy", parentSlug: "health-wellness", sortOrder: 606 },
  { slug: "-education", parentSlug: "services-marketplace", sortOrder: 1208 },
  { slug: "transportation-and-logistics-", parentSlug: "services-marketplace", sortOrder: 1209 },
];

function parseArgs(): Args {
  return {
    apply: process.argv.slice(2).includes("--apply"),
  };
}

async function main() {
  const options = parseArgs();
  const existing = await prisma.businessCategory.findMany({
    select: { id: true, slug: true, name: true, parentId: true, level: true },
  });
  const categoryBySlug = new Map(existing.map((category) => [category.slug, category]));
  const actions: Array<{
    type: "create" | "update" | "skip";
    spec: CategorySpec;
    parent?: { id: string; slug: string; level: number } | null;
    reason?: string;
  }> = [];

  for (const spec of MARKETPLACE_CATEGORIES) {
    const parent = spec.parentSlug ? categoryBySlug.get(spec.parentSlug) : null;
    if (parent === undefined) {
      actions.push({ type: "skip", spec, reason: `Parent not found: ${spec.parentSlug}` });
      continue;
    }

    const existingCategory = categoryBySlug.get(spec.slug);
    actions.push({
      type: existingCategory ? "update" : "create",
      spec,
      parent,
    });

    if (!existingCategory) {
      categoryBySlug.set(spec.slug, {
        id: `new:${spec.slug}`,
        slug: spec.slug,
        name: spec.name,
        parentId: parent?.id || null,
        level: parent ? parent.level + 1 : 0,
      });
    }
  }

  if (options.apply) {
    const savedBySlug = new Map(existing.map((category) => [category.slug, category]));
    for (const action of actions) {
      if (action.type === "skip") continue;
      const parent = action.spec.parentSlug ? savedBySlug.get(action.spec.parentSlug) : null;
      if (parent === undefined) {
        throw new Error(`Parent not found during apply: ${action.spec.parentSlug}`);
      }
      const saved = await prisma.businessCategory.upsert({
        where: { slug: action.spec.slug },
        update: {
          name: action.spec.name,
          icon: action.spec.icon || null,
          sortOrder: action.spec.sortOrder,
          parentId: parent?.id || null,
          level: parent ? parent.level + 1 : 0,
          isActive: true,
        },
        create: {
          slug: action.spec.slug,
          name: action.spec.name,
          icon: action.spec.icon || null,
          sortOrder: action.spec.sortOrder,
          parentId: parent?.id || null,
          level: parent ? parent.level + 1 : 0,
          isActive: true,
        },
      });
      savedBySlug.set(saved.slug, saved);
    }

    for (const legacy of LEGACY_PARENT_REFINEMENTS) {
      const category = savedBySlug.get(legacy.slug);
      const parent = savedBySlug.get(legacy.parentSlug);
      if (!category || !parent || category.id === parent.id) continue;
      const saved = await prisma.businessCategory.update({
        where: { id: category.id },
        data: {
          parentId: parent.id,
          level: parent.level + 1,
          sortOrder: legacy.sortOrder,
          isActive: true,
        },
      });
      savedBySlug.set(saved.slug, saved);
    }
  }

  const summary = actions.reduce(
    (acc, action) => {
      acc[action.type] += 1;
      return acc;
    },
    { create: 0, update: 0, skip: 0 },
  );

  console.log(
    JSON.stringify(
      {
        mode: options.apply ? "apply" : "dry-run",
        categoriesPlanned: MARKETPLACE_CATEGORIES.length,
        actions: summary,
        legacyReparentsPlanned: LEGACY_PARENT_REFINEMENTS.length,
      },
      null,
      2,
    ),
  );

  for (const action of actions) {
    const parentSlug = action.parent === null ? "root" : action.spec.parentSlug;
    const prefix = options.apply ? "APPLY" : "DRY";
    if (action.type === "skip") {
      console.log(`SKIP ${action.spec.slug} ${action.spec.name} - ${action.reason}`);
    } else {
      console.log(`${prefix} ${action.type.toUpperCase()} ${action.spec.slug} ${action.spec.name} parent=${parentSlug}`);
    }
  }

  console.log("\nLEGACY_REPARENTS");
  for (const legacy of LEGACY_PARENT_REFINEMENTS) {
    const category = categoryBySlug.get(legacy.slug);
    const parent = categoryBySlug.get(legacy.parentSlug);
    if (!category) {
      console.log(`SKIP ${legacy.slug} - legacy category not found`);
    } else if (!parent) {
      console.log(`SKIP ${legacy.slug} - parent not found: ${legacy.parentSlug}`);
    } else {
      console.log(`${options.apply ? "APPLY" : "DRY"} REPARENT ${category.name} parent=${parent.name}`);
    }
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
