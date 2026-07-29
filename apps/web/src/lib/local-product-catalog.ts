export const LOCAL_MOCK_CATALOG_ENABLED =
  process.env.NODE_ENV === "development";

export type LocalCatalogCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: null;
  level: number;
  productCount: number;
  directProductCount: number;
  _count: { products: number };
};

export type LocalCatalogProduct = {
  id: string;
  name: string;
  description: string;
  specifications: { label: string; value: string }[];
  sku: string;
  barcode: string;
  price: number;
  stock: number;
  supplyType: "IN_STOCK" | "CHINA_PREORDER";
  preorderLeadTimeDays: number | null;
  preorderNote: string | null;
  marketplacePriority: number;
  images: { id: string; url: string }[];
  organization: { id: string; name: string };
  discounts: { percent: number }[];
  businessCategoryId: string;
  businessCategory: {
    id: string;
    name: string;
    slug: string;
    parent: null;
  };
  createdAt: string;
};

type CatalogDefinition = {
  slug: string;
  name: string;
  products: readonly string[];
  imageKeywords: readonly string[];
  basePrice: number;
};

const CATALOG_DEFINITIONS: readonly CatalogDefinition[] = [
  {
    slug: "food",
    name: "Хүнс",
    products: [
      "Будаа",
      "Гурил",
      "Гоймон",
      "Элсэн чихэр",
      "Давс",
      "Өндөг",
      "Талх",
      "Зөгийн бал",
      "Овьёос",
      "Ургамлын тос",
    ],
    imageKeywords: [
      "rice",
      "flour",
      "pasta",
      "sugar",
      "salt",
      "eggs",
      "bread",
      "honey",
      "oatmeal",
      "cooking-oil",
    ],
    basePrice: 3_900,
  },
  {
    slug: "beverages",
    name: "Ундаа",
    products: [
      "Цэвэр ус",
      "Алимны шүүс",
      "Жүржийн шүүс",
      "Ногоон цай",
      "Хар цай",
      "Кофе",
      "Сүүтэй цай",
      "Эрч хүчний ундаа",
      "Газтай ус",
      "Какао",
    ],
    imageKeywords: [
      "bottled-water",
      "apple-juice",
      "orange-juice",
      "green-tea",
      "black-tea",
      "coffee",
      "milk-tea",
      "energy-drink",
      "sparkling-water",
      "cocoa",
    ],
    basePrice: 2_500,
  },
  {
    slug: "electronics",
    name: "Цахилгаан бараа",
    products: [
      "Чихэвч",
      "Power bank",
      "USB-C кабель",
      "Утасгүй цэнэглэгч",
      "Bluetooth speaker",
      "Ухаалаг цаг",
      "Гар",
      "Хулгана",
      "Web камер",
      "LED гэрэл",
    ],
    imageKeywords: [
      "headphones",
      "power-bank",
      "usb-cable",
      "wireless-charger",
      "bluetooth-speaker",
      "smartwatch",
      "computer-keyboard",
      "computer-mouse",
      "webcam",
      "led-light",
    ],
    basePrice: 24_900,
  },
  {
    slug: "fashion",
    name: "Хувцас, загвар",
    products: [
      "Футболк",
      "Цамц",
      "Жинсэн өмд",
      "Куртик",
      "Малгай",
      "Ороолт",
      "Оймс",
      "Спорт өмд",
      "Даашинз",
      "Цүнх",
    ],
    imageKeywords: [
      "t-shirt",
      "shirt",
      "jeans",
      "jacket",
      "hat",
      "scarf",
      "socks",
      "sweatpants",
      "dress",
      "handbag",
    ],
    basePrice: 19_900,
  },
  {
    slug: "beauty",
    name: "Гоо сайхан",
    products: [
      "Нүүрний тос",
      "Нарны тос",
      "Уруулын будаг",
      "Шампунь",
      "Ангижруулагч",
      "Үнэртэй ус",
      "Гарны тос",
      "Нүүр цэвэрлэгч",
      "Маск",
      "Биеийн тос",
    ],
    imageKeywords: [
      "face-cream",
      "sunscreen",
      "lipstick",
      "shampoo",
      "conditioner",
      "perfume",
      "hand-cream",
      "face-cleanser",
      "face-mask",
      "body-lotion",
    ],
    basePrice: 12_900,
  },
  {
    slug: "home",
    name: "Гэр ахуй",
    products: [
      "Аяга",
      "Таваг",
      "Хайруулын таваг",
      "Алчуур",
      "Дэр",
      "Орны даавуу",
      "Хадгалах сав",
      "Хогийн сав",
      "Шалны дэвсгэр",
      "Үнэртүүлэгч",
    ],
    imageKeywords: [
      "coffee-mug",
      "ceramic-plate",
      "frying-pan",
      "towel",
      "pillow",
      "bed-sheets",
      "storage-container",
      "trash-bin",
      "floor-mat",
      "home-fragrance",
    ],
    basePrice: 9_900,
  },
  {
    slug: "health",
    name: "Эрүүл мэнд",
    products: [
      "Амин дэм C",
      "Омега 3",
      "Уураг",
      "Гар ариутгагч",
      "Амны хаалт",
      "Даралт хэмжигч",
      "Халуун хэмжигч",
      "Иогийн дэвсгэр",
      "Массажны бөмбөг",
      "Анхны тусламжийн багц",
    ],
    imageKeywords: [
      "vitamin-c",
      "omega-3",
      "protein-powder",
      "hand-sanitizer",
      "medical-mask",
      "blood-pressure-monitor",
      "thermometer",
      "yoga-mat",
      "massage-ball",
      "first-aid-kit",
    ],
    basePrice: 8_900,
  },
  {
    slug: "kids",
    name: "Хүүхдийн бараа",
    products: [
      "Живх",
      "Нойтон салфетка",
      "Сүүний угж",
      "Тоглоомон машин",
      "Эвлүүлдэг тоглоом",
      "Буддаг ном",
      "Хүүхдийн аяга",
      "Зөөлөн тоглоом",
      "Үлгэрийн ном",
      "Хүүхдийн цүнх",
    ],
    imageKeywords: [
      "baby-diapers",
      "baby-wipes",
      "baby-bottle",
      "toy-car",
      "building-blocks",
      "coloring-book",
      "kids-cup",
      "plush-toy",
      "childrens-book",
      "kids-backpack",
    ],
    basePrice: 7_900,
  },
  {
    slug: "sports",
    name: "Спорт, аялал",
    products: [
      "Усны сав",
      "Дамббелл",
      "Фитнес резин",
      "Аяллын цүнх",
      "Майхан",
      "Гар чийдэн",
      "Спорт бээлий",
      "Дээс",
      "Бөмбөг",
      "Дулаан сав",
    ],
    imageKeywords: [
      "sports-water-bottle",
      "dumbbell",
      "resistance-band",
      "travel-bag",
      "camping-tent",
      "flashlight",
      "sports-gloves",
      "jump-rope",
      "sports-ball",
      "thermos",
    ],
    basePrice: 14_900,
  },
  {
    slug: "stationery",
    name: "Бичиг хэрэг",
    products: [
      "Дэвтэр",
      "Үзэг",
      "Харандаа",
      "Баллуур",
      "Тодруулагч",
      "Файлын хавтас",
      "Наадаг цаас",
      "Шугам",
      "Өнгийн харандаа",
      "Тэмдэглэлийн дэвтэр",
    ],
    imageKeywords: [
      "school-notebook",
      "pen",
      "pencil",
      "eraser",
      "highlighter",
      "file-folder",
      "sticky-notes",
      "ruler",
      "colored-pencils",
      "planner",
    ],
    basePrice: 1_900,
  },
] as const;

export const localCatalogOrganizations = [
  { id: "local-store-nomad-market", name: "Nomad Market" },
  { id: "local-store-altan-huns", name: "Алтан Хүнс" },
  { id: "local-store-smart-zone", name: "Smart Zone" },
  { id: "local-store-urban-style", name: "Urban Style Mongolia" },
  { id: "local-store-beauty-house", name: "Beauty House" },
  { id: "local-store-ger-ahui", name: "Гэр Ахуй Маркет" },
  { id: "local-store-wellness", name: "Wellness Mongolia" },
  { id: "local-store-kids-world", name: "Kids World" },
  { id: "local-store-active-life", name: "Active Life" },
  { id: "local-store-office-plus", name: "Office Plus" },
] as const;

export const localCatalogCategories: LocalCatalogCategory[] =
  CATALOG_DEFINITIONS.map(({ slug, name }) => ({
    id: `local-category-${slug}`,
    name,
    slug,
    parentId: null,
    level: 0,
    productCount: 100,
    directProductCount: 100,
    _count: { products: 100 },
  }));

export const localCatalogProducts: LocalCatalogProduct[] =
  CATALOG_DEFINITIONS.flatMap((category, categoryIndex) =>
    category.products.flatMap((productName, productIndex) =>
      Array.from({ length: 10 }, (_, variantIndex) => {
        const sequence =
          categoryIndex * 100 + productIndex * 10 + variantIndex + 1;
        const categoryId = `local-category-${category.slug}`;
        const isPreorder = variantIndex === 8;
        const organization = localCatalogOrganizations[categoryIndex];

        return {
          id: `local-product-${String(sequence).padStart(4, "0")}`,
          name: `${productName} — Загвар ${variantIndex + 1}`,
          description: `${category.name} ангиллын local орчинд зориулсан ${productName.toLocaleLowerCase("mn-MN")} туршилтын бараа.`,
          specifications: [
            { label: "Барааны төрөл", value: productName },
            { label: "Ангилал", value: category.name },
            { label: "Загвар", value: `Загвар ${variantIndex + 1}` },
            { label: "Гарал үүсэл", value: "Монгол" },
            {
              label: "Нийлүүлэлт",
              value: isPreorder ? "Урьдчилсан захиалга" : "Бэлэн бараа",
            },
            { label: "Баталгаа", value: "Борлуулагчийн нөхцөлөөр" },
          ],
          sku: `LOCAL-${String(sequence).padStart(4, "0")}`,
          barcode: `8800000${String(sequence).padStart(6, "0")}`,
          price: category.basePrice + productIndex * 1_700 + variantIndex * 350,
          stock: variantIndex === 9 ? 0 : 5 + ((sequence * 7) % 46),
          supplyType: isPreorder ? "CHINA_PREORDER" : "IN_STOCK",
          preorderLeadTimeDays: isPreorder ? 14 : null,
          preorderNote: isPreorder ? "Local mock урьдчилсан захиалга" : null,
          marketplacePriority: 1_001 - sequence,
          images: [
            {
              id: `local-image-${sequence}`,
              url: `https://loremflickr.com/640/640/${category.imageKeywords[productIndex]}?lock=${sequence}`,
            },
          ],
          organization,
          discounts:
            variantIndex % 3 === 0 ? [{ percent: 10 + categoryIndex }] : [],
          businessCategoryId: categoryId,
          businessCategory: {
            id: categoryId,
            name: category.name,
            slug: category.slug,
            parent: null,
          },
          createdAt: new Date(
            Date.UTC(2026, 0, (sequence % 28) + 1),
          ).toISOString(),
        };
      }),
    ),
  );

export type LocalCatalogQuery = {
  businessCategoryId?: string | null;
  organizationId?: string;
  search?: string;
  type?: string;
  sort?: string;
  discountOnly?: boolean;
  priceMin?: number;
  priceMax?: number;
  stock?: string;
  limit?: number;
  offset?: number;
};

export function queryLocalCatalog(query: LocalCatalogQuery = {}) {
  let products = [...localCatalogProducts];
  const category = localCatalogCategories.find(
    (item) =>
      item.id === query.businessCategoryId ||
      item.slug === query.businessCategoryId,
  );

  if (category) {
    products = products.filter(
      (product) => product.businessCategoryId === category.id,
    );
  }
  if (query.organizationId) {
    products = products.filter(
      (product) => product.organization.id === query.organizationId,
    );
  }
  if (query.search?.trim()) {
    const search = query.search.toLocaleLowerCase("mn-MN").trim();
    products = products.filter((product) =>
      [
        product.name,
        product.description,
        product.sku,
        product.businessCategory.name,
      ]
        .join(" ")
        .toLocaleLowerCase("mn-MN")
        .includes(search),
    );
  }
  if (query.type === "stock") {
    products = products.filter((product) => product.supplyType === "IN_STOCK");
  } else if (query.type === "preorder") {
    products = products.filter(
      (product) => product.supplyType === "CHINA_PREORDER",
    );
  }
  if (query.discountOnly) {
    products = products.filter((product) => product.discounts.length > 0);
  }
  if (query.priceMin !== undefined) {
    products = products.filter((product) => product.price >= query.priceMin!);
  }
  if (query.priceMax !== undefined) {
    products = products.filter((product) => product.price <= query.priceMax!);
  }
  if (query.stock === "in_stock") {
    products = products.filter((product) => product.stock > 0);
  } else if (query.stock === "low_stock") {
    products = products.filter(
      (product) => product.stock > 0 && product.stock <= 5,
    );
  } else if (query.stock === "sold_out") {
    products = products.filter((product) => product.stock === 0);
  }

  if (query.sort === "newest") {
    products.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else if (query.sort === "price_asc") {
    products.sort((a, b) => a.price - b.price);
  } else if (query.sort === "price_desc") {
    products.sort((a, b) => b.price - a.price);
  } else if (query.sort === "discount") {
    products.sort(
      (a, b) => (b.discounts[0]?.percent ?? 0) - (a.discounts[0]?.percent ?? 0),
    );
  } else if (query.sort === "name_asc") {
    products.sort((a, b) => a.name.localeCompare(b.name, "mn-MN"));
  }

  const total = products.length;
  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.max(1, query.limit ?? total);

  return {
    products: products.slice(offset, offset + limit),
    total,
    hasMore: offset + limit < total,
    limit,
    offset,
  };
}

export function findLocalCatalogProduct(id: string) {
  return localCatalogProducts.find((product) => product.id === id) ?? null;
}
