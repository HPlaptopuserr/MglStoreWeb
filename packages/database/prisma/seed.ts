import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import {
  PrismaClient,
  PlatformRole,
  OrgType,
  OrgStatus,
  OnboardingSource,
} from "@prisma/client";

const prisma = new PrismaClient();

const BUSINESS_CATEGORY_TREE = [
  {
    slug: "retail-commerce",
    name: "Худалдаа",
    icon: "🛒",
    children: [
      ["supermarket", "Супермаркет", "🛍️"],
      ["convenience-store", "Мини маркет", "🏪"],
      ["department-store", "Их дэлгүүр", "🏬"],
      ["wholesale", "Бөөний худалдаа", "📦"],
      ["online-shop", "Онлайн дэлгүүр", "💻"],
      ["import-export", "Импорт экспорт", "🚢"],
    ],
  },
  {
    slug: "food-beverage",
    name: "Хоол хүнс",
    icon: "🍽️",
    children: [
      ["restaurant", "Ресторан", "🍽️"],
      ["cafe", "Кафе", "☕"],
      ["bakery", "Талх нарийн боов", "🥐"],
      ["fast-food", "Түргэн хоол", "🍔"],
      ["catering", "Катеринг", "🍱"],
      ["beverage-shop", "Ундаа, кофе, цай", "🥤"],
    ],
  },
  {
    slug: "fashion-beauty",
    name: "Загвар, гоо сайхан",
    icon: "✨",
    children: [
      ["clothing-store", "Хувцас", "👕"],
      ["shoes-bags", "Гутал, цүнх", "👟"],
      ["jewelry-accessories", "Гоёл, аксессуар", "💍"],
      ["cosmetics", "Гоо сайхны бүтээгдэхүүн", "💄"],
      ["salon-spa", "Салон, SPA", "💆"],
      ["barber", "Үсчин, barber", "💈"],
    ],
  },
  {
    slug: "electronics-technology",
    name: "Цахилгаан бараа, технологи",
    icon: "📱",
    children: [
      ["mobile-devices", "Гар утас, таблет", "📱"],
      ["computers", "Компьютер, laptop", "💻"],
      ["home-appliances", "Гэр ахуйн цахилгаан", "🔌"],
      ["gaming", "Gaming, console", "🎮"],
      ["camera-audio", "Камер, аудио", "📷"],
      ["repair-tech", "Засвар үйлчилгээ", "🛠️"],
    ],
  },
  {
    slug: "home-living",
    name: "Гэр ахуй, тавилга",
    icon: "🏠",
    children: [
      ["furniture", "Тавилга", "🛋️"],
      ["home-decor", "Гэрийн чимэглэл", "🖼️"],
      ["kitchenware", "Гал тогооны хэрэгсэл", "🍳"],
      ["cleaning-supplies", "Цэвэрлэгээний хэрэгсэл", "🧽"],
      ["bedding-textile", "Ор дэр, текстиль", "🛏️"],
      ["garden-outdoor", "Цэцэрлэг, outdoor", "🌿"],
    ],
  },
  {
    slug: "health-medical",
    name: "Эрүүл мэнд",
    icon: "🏥",
    children: [
      ["pharmacy", "Эмийн сан", "💊"],
      ["clinic", "Эмнэлэг, клиник", "🩺"],
      ["dental", "Шүдний эмнэлэг", "🦷"],
      ["fitness-wellness", "Фитнес, wellness", "🏋️"],
      ["medical-equipment", "Эмнэлгийн хэрэгсэл", "🧪"],
      ["supplements", "Витамин, нэмэлт", "🌿"],
    ],
  },
  {
    slug: "education-training",
    name: "Боловсрол, сургалт",
    icon: "🎓",
    children: [
      ["school", "Сургууль", "🏫"],
      ["kindergarten", "Цэцэрлэг", "🧸"],
      ["language-center", "Хэлний төв", "🗣️"],
      ["it-training", "IT сургалт", "⌨️"],
      ["professional-course", "Мэргэжлийн сургалт", "📚"],
      ["online-education", "Онлайн сургалт", "🧑‍💻"],
    ],
  },
  {
    slug: "finance-insurance",
    name: "Санхүү, даатгал",
    icon: "💳",
    children: [
      ["banking", "Банк, ББСБ", "🏦"],
      ["insurance", "Даатгал", "🛡️"],
      ["accounting-tax", "Нягтлан, татвар", "🧾"],
      ["audit", "Аудит", "📊"],
      ["investment", "Хөрөнгө оруулалт", "📈"],
      ["fintech", "Fintech", "💸"],
    ],
  },
  {
    slug: "professional-services",
    name: "Мэргэжлийн үйлчилгээ",
    icon: "💼",
    children: [
      ["legal-service", "Хууль", "⚖️"],
      ["marketing-agency", "Маркетинг", "📣"],
      ["hr-consulting", "Хүний нөөц", "👥"],
      ["consulting", "Зөвлөх үйлчилгээ", "🧭"],
      ["design-studio", "Дизайн студи", "🎨"],
      ["translation", "Орчуулга", "🌐"],
    ],
  },
  {
    slug: "auto-transport",
    name: "Авто, тээвэр",
    icon: "🚗",
    children: [
      ["car-sales", "Авто худалдаа", "🚘"],
      ["auto-parts", "Сэлбэг", "⚙️"],
      ["car-service", "Засвар үйлчилгээ", "🔧"],
      ["car-wash", "Авто угаалга", "🫧"],
      ["logistics", "Ложистик", "🚚"],
      ["taxi-delivery", "Такси, хүргэлт", "🚕"],
    ],
  },
  {
    slug: "construction-real-estate",
    name: "Барилга, үл хөдлөх",
    icon: "🏗️",
    children: [
      ["construction-company", "Барилгын компани", "🏢"],
      ["building-materials", "Барилгын материал", "🧱"],
      ["real-estate", "Үл хөдлөх", "🏘️"],
      ["interior-design", "Интерьер", "📐"],
      ["plumbing-electric", "Сантехник, цахилгаан", "🔩"],
      ["property-management", "СӨХ, property management", "🏙️"],
    ],
  },
  {
    slug: "travel-hospitality",
    name: "Аялал, зочлох үйлчилгээ",
    icon: "✈️",
    children: [
      ["hotel", "Зочид буудал", "🏨"],
      ["resort-camp", "Амралтын газар", "⛺"],
      ["travel-agency", "Аяллын агентлаг", "🧳"],
      ["ticketing", "Тасалбар, booking", "🎫"],
      ["tour-guide", "Хөтөч, аялал", "🗺️"],
      ["event-venue", "Event venue", "🎪"],
    ],
  },
  {
    slug: "entertainment-media",
    name: "Энтертайнмент, медиа",
    icon: "🎬",
    children: [
      ["cinema", "Кино театр", "🎥"],
      ["music-production", "Хөгжим, продакшн", "🎧"],
      ["photography", "Фото, видео", "📸"],
      ["event-service", "Эвент үйлчилгээ", "🎤"],
      ["gaming-esport", "E-sport, game", "🕹️"],
      ["media-publishing", "Медиа, хэвлэл", "📰"],
    ],
  },
  {
    slug: "sports-outdoor",
    name: "Спорт, outdoor",
    icon: "🏆",
    children: [
      ["fitness-club", "Фитнес клуб", "🏋️"],
      ["sports-store", "Спорт бараа", "⚽"],
      ["outdoor-gear", "Аяллын хэрэгсэл", "🎒"],
      ["bike-moto", "Дугуй, мото", "🚴"],
      ["sports-training", "Спорт сургалт", "🥋"],
      ["pool-sauna", "Бассейн, саун", "🏊"],
    ],
  },
  {
    slug: "kids-family",
    name: "Хүүхэд, гэр бүл",
    icon: "🧸",
    children: [
      ["baby-products", "Хүүхдийн бараа", "🍼"],
      ["toys", "Тоглоом", "🧩"],
      ["kids-clothing", "Хүүхдийн хувцас", "👶"],
      ["family-service", "Гэр бүлийн үйлчилгээ", "👨‍👩‍👧"],
      ["kids-education", "Хүүхдийн сургалт", "🎒"],
      ["playground", "Тоглоомын төв", "🎡"],
    ],
  },
  {
    slug: "pets-veterinary",
    name: "Амьтан",
    icon: "🐾",
    children: [
      ["pet-shop", "Амьтны дэлгүүр", "🐶"],
      ["pet-food", "Амьтны хоол", "🥫"],
      ["veterinary", "Мал эмнэлэг", "🏥"],
      ["grooming", "Grooming", "🛁"],
      ["pet-hotel", "Амьтны зочид буудал", "🏡"],
      ["livestock", "Мал аж ахуй", "🐄"],
    ],
  },
  {
    slug: "agriculture-industrial",
    name: "Хөдөө аж ахуй, үйлдвэр",
    icon: "🌾",
    children: [
      ["farm-products", "Фермийн бүтээгдэхүүн", "🥚"],
      ["meat-dairy", "Мах, сүү", "🥛"],
      ["agro-equipment", "ХАА тоног төхөөрөмж", "🚜"],
      ["manufacturing", "Үйлдвэрлэл", "🏭"],
      ["packaging", "Сав баглаа боодол", "📦"],
      ["raw-materials", "Түүхий эд", "🧵"],
    ],
  },
  {
    slug: "government-ngo",
    name: "Төр, ТББ, холбоо",
    icon: "🏛️",
    children: [
      ["government-service", "Төрийн үйлчилгээ", "🏛️"],
      ["ngo", "ТББ", "🤝"],
      ["association", "Холбоо", "🏅"],
      ["community", "Нийгэмлэг", "👥"],
      ["public-project", "Төсөл, хөтөлбөр", "📌"],
      ["charity", "Сайн үйлс", "💛"],
    ],
  },
];

const PRODUCT_CATEGORY_TREE = [
  [
    "food-grocery",
    "Хүнс, өдөр тутам",
    [
      "Хүнсний ногоо",
      "Мах, махан бүтээгдэхүүн",
      "Сүү, цагаан идээ",
      "Гурил, будаа",
      "Амттан, snack",
      "Ундаа, ус",
    ],
  ],
  [
    "electronics",
    "Цахилгаан бараа",
    [
      "Гар утас",
      "Компьютер",
      "TV, аудио",
      "Гэр ахуйн цахилгаан",
      "Камер",
      "Дагалдах хэрэгсэл",
    ],
  ],
  [
    "fashion",
    "Хувцас, загвар",
    [
      "Эмэгтэй хувцас",
      "Эрэгтэй хувцас",
      "Гутал",
      "Цүнх",
      "Аксессуар",
      "Спорт хувцас",
    ],
  ],
  [
    "beauty-health",
    "Гоо сайхан, эрүүл мэнд",
    [
      "Арьс арчилгаа",
      "Нүүр будалт",
      "Үс арчилгаа",
      "Үнэртэн",
      "Витамин",
      "Эмнэлгийн хэрэгсэл",
    ],
  ],
  [
    "home-furniture",
    "Гэр ахуй, тавилга",
    [
      "Тавилга",
      "Гал тогоо",
      "Ор дэр",
      "Гэрийн чимэглэл",
      "Цэвэрлэгээ",
      "Цэцэрлэг",
    ],
  ],
  [
    "kids-baby",
    "Хүүхэд, нярай",
    [
      "Живх, арчилгаа",
      "Хүүхдийн хувцас",
      "Тоглоом",
      "Сургалтын хэрэгсэл",
      "Тэрэг, суудал",
      "Хүүхдийн хоол",
    ],
  ],
  [
    "auto-parts",
    "Авто, сэлбэг",
    [
      "Дугуй",
      "Тос, шингэн",
      "Сэлбэг",
      "Аксессуар",
      "Арчилгаа",
      "Мото хэрэгсэл",
    ],
  ],
  [
    "sports-outdoor-products",
    "Спорт, аялал",
    [
      "Фитнес хэрэгсэл",
      "Бөмбөг, спорт",
      "Аяллын хэрэгсэл",
      "Дугуй",
      "Загасчлал",
      "Outdoor хувцас",
    ],
  ],
  [
    "books-office",
    "Ном, бичиг хэрэг",
    [
      "Ном",
      "Сурах бичиг",
      "Бичиг хэрэг",
      "Оффис хэрэгсэл",
      "Принтер",
      "Бэлэг дурсгал",
    ],
  ],
  [
    "pet-products",
    "Амьтны бараа",
    [
      "Амьтны хоол",
      "Арчилгаа",
      "Тоглоом",
      "Үүр, ор",
      "Эмчилгээ",
      "Дагалдах хэрэгсэл",
    ],
  ],
  [
    "construction-tools",
    "Барилга, багаж",
    [
      "Барилгын материал",
      "Гар багаж",
      "Цахилгаан багаж",
      "Сантехник",
      "Цахилгаан хэрэгсэл",
      "Хамгаалах хэрэгсэл",
    ],
  ],
  [
    "industrial-supply",
    "Үйлдвэр, агуулах",
    [
      "Тоног төхөөрөмж",
      "Сав баглаа",
      "Агуулах хэрэгсэл",
      "Түүхий эд",
      "Аюулгүй ажиллагаа",
      "Сэлбэг",
    ],
  ],
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яөөгүё\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function seedBusinessCategories() {
  for (const [rootIndex, root] of BUSINESS_CATEGORY_TREE.entries()) {
    const rootCategory = await prisma.businessCategory.upsert({
      where: { slug: root.slug },
      update: {
        name: root.name,
        icon: root.icon,
        sortOrder: rootIndex * 100,
        parentId: null,
        level: 0,
        isActive: true,
      },
      create: {
        slug: root.slug,
        name: root.name,
        icon: root.icon,
        sortOrder: rootIndex * 100,
        parentId: null,
        level: 0,
        isActive: true,
      },
    });

    for (const [childIndex, [slug, name, icon]] of root.children.entries()) {
      await prisma.businessCategory.upsert({
        where: { slug },
        update: {
          name,
          icon,
          sortOrder: rootIndex * 100 + childIndex + 1,
          parentId: rootCategory.id,
          level: 1,
          isActive: true,
        },
        create: {
          slug,
          name,
          icon,
          sortOrder: rootIndex * 100 + childIndex + 1,
          parentId: rootCategory.id,
          level: 1,
          isActive: true,
        },
      });
    }
  }
}

async function seedProductCategories() {
  for (const [rootSlug, rootName, children] of PRODUCT_CATEGORY_TREE) {
    const root = await prisma.category.upsert({
      where: { slug: rootSlug },
      update: { name: rootName, parentId: null },
      create: { slug: rootSlug, name: rootName, parentId: null },
    });

    for (const childName of children) {
      const childSlug = `${rootSlug}-${slugify(childName)}`;
      await prisma.category.upsert({
        where: { slug: childSlug },
        update: { name: childName, parentId: root.id },
        create: { slug: childSlug, name: childName, parentId: root.id },
      });
    }
  }
}

export async function seedCategoriesOnly() {
  await seedBusinessCategories();
  await seedProductCategories();
}

export async function disconnectSeedPrisma() {
  await prisma.$disconnect();
}

async function getUniqueOrganizationTaxId(baseTaxId: string) {
  let taxId = baseTaxId;
  let suffix = 1;

  while (true) {
    const existing = await prisma.organization.findUnique({
      where: { taxId },
      select: { id: true },
    });

    if (!existing) return taxId;

    taxId = `${baseTaxId}-${suffix}`;
    suffix += 1;
  }
}

type SeedFormField = {
  id: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "dropdown"
    | "checkbox"
    | "radio"
    | "date"
    | "label";
  label: string;
  required: boolean;
  placeholder?: string;
  options?: { id: string; value: string }[];
};

const ENVIRONMENT_SURVEY_FORM_SLUG = "neg-huudastai-orchnii-sudalgaa";
const ENVIRONMENT_SURVEY_PDF_FILE =
  "neg_huudastai_orchnii_sudalgaanii_mayagt.pdf";

function formField(
  id: string,
  type: SeedFormField["type"],
  label: string,
  required = false,
  options?: string[],
  placeholder?: string,
): SeedFormField {
  return {
    id,
    type,
    label,
    required,
    placeholder,
    options: options?.map((value, index) => ({
      id: `${id}-option-${index + 1}`,
      value,
    })),
  };
}

function getSeedApiBaseUrl() {
  const configured =
    process.env.API_PUBLIC_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000";
  const normalized = configured
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");

  return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
}

function ensureEnvironmentSurveyPdfAsset() {
  const source = path.resolve(__dirname, "assets", ENVIRONMENT_SURVEY_PDF_FILE);
  const destination = path.resolve(
    __dirname,
    "../../..",
    "apps/api/uploads/site-settings/project-pdfs",
    ENVIRONMENT_SURVEY_PDF_FILE,
  );

  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function getEnvironmentSurveyPdfUrl() {
  return `${getSeedApiBaseUrl()}/api/site-settings/uploads/project-pdfs/${ENVIRONMENT_SURVEY_PDF_FILE}`;
}

function environmentSurveyFields(): SeedFormField[] {
  return [
    formField(
      "survey-meta",
      "label",
      "Ерөнхий мэдээлэл",
      false,
      undefined,
      "PDF маягтын дээд мөр: огноо, цаг, объект/байршил, судлаач, оролцогчийн төрөл, дугаар.",
    ),
    formField("survey-date", "date", "Огноо", true),
    formField("survey-time", "text", "Цаг", true, undefined, "Жишээ: 10:30"),
    formField(
      "survey-location",
      "text",
      "Объект / байршил",
      true,
      undefined,
      "Судалгаа хийсэн объект, байрлал",
    ),
    formField("researcher", "text", "Судлаач", true),
    formField("participant-type", "dropdown", "Оролцогчийн төрөл", true, [
      "Иргэн",
      "Ажилтан",
      "Түрээслэгч",
      "Бизнес эрхлэгч",
      "Бусад",
    ]),
    formField("survey-number", "text", "Дугаар", false),

    formField(
      "section-needed-goods",
      "label",
      "1. Ойр орчимд хэрэгцээтэй бараа",
      false,
      undefined,
      "3 хүртэл сонгож, нэмэлт санал байвал доор бичнэ.",
    ),
    formField(
      "needed-goods",
      "checkbox",
      "Ойр орчимд хэрэгцээтэй бараа",
      true,
      [
        "Өрөө тутмын хүнс, ус/ундаа",
        "Эрүүл мэндийн хэрэгсэл, эм",
        "Хүүхдийн бараа, жижиг тоглоом",
        "Гэр ахуйн жижиг материал, багаж",
        "Түлхүүрийн бөглөө, бэлэн хоол",
        "Гялгар/картон/сав баглаа",
        "Гар утасны цэнэглэгч, кабель",
        "Гоо сайхан, ариун цэвэр",
        "Автомашины жижиг хэрэгсэл",
        "Амьтны хоол, хэрэгсэл",
      ],
    ),
    formField(
      "needed-goods-other",
      "text",
      "Бусад хэрэгцээтэй бараа",
      false,
      undefined,
      "Хэрэв жагсаалтад байхгүй бол бичнэ үү",
    ),

    formField(
      "section-missing-services",
      "label",
      "2. Дутмаг үйлчилгээ",
      false,
      undefined,
      "0-3 оноогоор үнэлнэ. 0 = шаардлагагүй, 3 = маш их хэрэгтэй.",
    ),
    ...[
      "Хүнсний мини маркет",
      "Кофе/түргэн хоол/цайны газар",
      "Фитнес сан/эрүүл мэнд",
      "Угаалга/хими цэвэрлэгээ",
      "Үсчин/гоо сайхан",
      "Канон/хэвлэл/бичиг хэрэг",
      "ATM/төлбөр/мөнгө шилжүүлэх",
      "Хүргэлт авах цэг/pick-up",
      "Авто жижиг үйлчилгээ/засвар",
      "Тоглоом/түрээс/хүүхэд",
      "Хүүхдийн булан/сургалт",
      "Ариун цэврийн өрөө/амрах хэсэг",
    ].map((label, index) =>
      formField(`missing-service-${index + 1}`, "dropdown", label, false, [
        "0",
        "1",
        "2",
        "3",
      ]),
    ),

    formField(
      "section-traffic",
      "label",
      "3. Явган хүн, машины урсгалын ажиглалт",
      false,
      undefined,
      "15-30 минутын ажиглалтын мэдээлэл.",
    ),
    formField("foot-traffic-peak", "number", "Явган хүн / оргил", false),
    formField("foot-traffic-normal", "number", "Явган хүн / энгийн", false),
    formField("car-count", "number", "Машин тоо", false),
    formField("parking-availability", "radio", "Зогсоолын байдал", false, [
      "сайн",
      "дунд",
      "хүнд",
    ]),
    formField("payment-option", "radio", "Төлбөр/түрээсийн боломж", false, [
      "бага",
      "дунд",
      "өндөр",
    ]),
    formField(
      "nearest-stop",
      "text",
      "Ойролцоох такси цэг",
      false,
      undefined,
      "Байгаа бол нэр/байршлыг бичнэ",
    ),
    formField(
      "public-transport",
      "checkbox",
      "Нийтийн тээвэр / явган хүний нөхцөл",
      false,
      [
        "Ойрхон автобусны буудал",
        "Орон сууц/ажлын байр ойр",
        "Зам гарц сайн",
        "Гэрэлтүүлэг сайн",
        "Өдөр хүн их",
        "Орой хүн их",
      ],
    ),
    formField("traffic-risk", "checkbox", "Эрсдэл, саад", false, [
      "Хэт их өрсөлдөгч",
      "Зогсоол хэцүү",
      "Аюулгүй байдал бага",
      "Зардал их",
    ]),

    formField(
      "section-required-items",
      "label",
      "4. Зөрж өнгөрөгч / жолооч нарт хэрэгцээтэй байж болох зүйл",
      false,
    ),
    formField("driver-needs", "checkbox", "Хэрэгцээтэй зүйлс", false, [
      "Ус, ундаа, кофе",
      "Утас цэнэглэх/кабель",
      "ATM/төлбөр",
      "Ариун цэврийн өрөө",
      "Сарвис/гар утасны хэрэгсэл",
      "Бичиг хэрэг/хэвлэл",
      "Авто хэрэгсэл/шил арчигч",
      "Амрах сандал/хүлээлгийн хэсэг",
      "Талх, амттан",
      "Хүргэлт авах цэг",
      "Түр зогсоол",
    ]),
    formField("driver-needs-other", "text", "Бусад хэрэгцээ", false),

    formField(
      "section-final",
      "label",
      "5. Дүгнэлт, бизнесийн санал",
      false,
      undefined,
      "Гурван өндөр оноотой үйлчилгээ, санал, шийдвэрээ тэмдэглэнэ.",
    ),
    formField("top-suggestion-1", "text", "Хамгийн өндөр оноотой үйлчилгээ #1"),
    formField("top-suggestion-2", "text", "Хамгийн өндөр оноотой үйлчилгээ #2"),
    formField("top-suggestion-3", "text", "Хамгийн өндөр оноотой үйлчилгээ #3"),
    formField(
      "feasible-businesses",
      "checkbox",
      "Санал болгож болох бизнес",
      false,
      [
        "Мини маркет",
        "Кофе/хоол",
        "Авто/зогсоол",
        "Үйлчилгээ",
        "Салбарлуулах боломжтой",
      ],
    ),
    formField(
      "next-actions",
      "textarea",
      "Нэмэлт ажиглалт / эрсдэл / дараагийн алхам",
      false,
    ),
    formField("total-score", "number", "Нийт оноо", false),
    formField("decision", "radio", "Шийдвэр", false, [
      "Нээх",
      "Турших",
      "Судлах",
    ]),
    formField("signature", "text", "Судлаачийн гарын үсэг", false),
    formField("completed-date", "date", "Дууссан огноо", false),
  ];
}

async function seedEnvironmentSurveyHrMaterial(createdById: string) {
  ensureEnvironmentSurveyPdfAsset();

  const pdfUrl = getEnvironmentSurveyPdfUrl();
  const form = await prisma.form.upsert({
    where: { slug: ENVIRONMENT_SURVEY_FORM_SLUG },
    update: {
      title: "Нэг хуудастай орчны судалгааны маягт",
      description:
        "Байршлын орчин, хэрэглэгчийн хэрэгцээ, үйлчилгээний дутмаг байдал, явган хүн/машины урсгал болон бизнесийн боломжийг нэг дор бүртгэх судалгааны маягт.",
      fields: environmentSurveyFields(),
      isActive: true,
      createdById,
    },
    create: {
      slug: ENVIRONMENT_SURVEY_FORM_SLUG,
      title: "Нэг хуудастай орчны судалгааны маягт",
      description:
        "Байршлын орчин, хэрэглэгчийн хэрэгцээ, үйлчилгээний дутмаг байдал, явган хүн/машины урсгал болон бизнесийн боломжийг нэг дор бүртгэх судалгааны маягт.",
      fields: environmentSurveyFields(),
      isActive: true,
      createdById,
    },
  });

  const headingId = "hr-environment-survey";
  const materialId = "hr-environment-survey-form";
  const setting = await prisma.siteSetting.findUnique({
    where: { key: "hr-services" },
  });
  let hrServices: any[] = [];

  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed)) hrServices = parsed;
    } catch {
      hrServices = [];
    }
  }

  const surveyHeading = {
    id: headingId,
    title: "Судалгааны маягтууд",
    description:
      "Объект, байршил болон орчны бизнес боломжийг үнэлэх HR үйлчилгээний маягтууд.",
    icon: "ClipboardList",
    subCategories: [
      {
        id: "hr-environment-survey-files",
        title: "Судалгааны материалууд",
        description: "",
        items: [
          {
            id: materialId,
            name: "Нэг хуудастай орчны судалгааны маягт",
            description:
              "PDF загвар болон web дээр шууд бөглөх маягттай орчны судалгааны материал.",
            price: 0,
            priceLabel: "Үнэгүй",
            fileUrl: pdfUrl,
            fileName: ENVIRONMENT_SURVEY_PDF_FILE,
            hasForm: true,
            formSlug: form.slug,
            formTitle: form.title,
            features: [
              "Огноо, цаг, объект/байршил, судлаачийн мэдээлэл бүртгэнэ.",
              "Ойр орчимд хэрэгцээтэй бараа болон дутмаг үйлчилгээг оноогоор үнэлнэ.",
              "Явган хүн, машины урсгал болон жолооч нарт хэрэгцээтэй зүйлсийг тэмдэглэнэ.",
              "Эцэст нь санал болгож болох бизнес, эрсдэл, шийдвэрийг нэгтгэнэ.",
            ],
            options: [],
          },
        ],
      },
    ],
  };

  const withoutSeedHeading = hrServices.filter(
    (heading) => heading?.id !== headingId,
  );
  await prisma.siteSetting.upsert({
    where: { key: "hr-services" },
    update: { value: JSON.stringify([...withoutSeedHeading, surveyHeading]) },
    create: { key: "hr-services", value: JSON.stringify([surveyHeading]) },
  });

  return { formTitle: form.title, pdfUrl };
}

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

  await prisma.siteSetting.upsert({
    where: { key: `web-products-enabled-${org.id}` },
    update: {},
    create: {
      key: `web-products-enabled-${org.id}`,
      value: "true",
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

  const environmentSurveySeed = await seedEnvironmentSurveyHrMaterial(admin.id);

  // Ensure admin has OWNER membership in the default org
  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: { userId: admin.id, organizationId: org.id },
    },
    update: { role: "OWNER", isPrimary: true, isActive: true },
    create: {
      userId: admin.id,
      organizationId: org.id,
      role: "OWNER",
      isPrimary: true,
      isActive: true,
    },
  });

  await seedCategoriesOnly();

  const activeBusinessCategories = await prisma.businessCategory.findMany({
    where: { isActive: true, level: 0 },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { slug: true, name: true },
  });

  let mockOrganizationsUpserted = 0;

  for (const [categoryIndex, category] of activeBusinessCategories.entries()) {
    for (let i = 1; i <= 10; i++) {
      const indexPart = String(i).padStart(2, "0");
      const categoryPart = String(categoryIndex + 1).padStart(3, "0");
      const slug = `${category.slug}-mock-org-${indexPart}`;
      const baseTaxId = `MOCK-${categoryPart}-${indexPart}`;

      const existingMockOrg = await prisma.organization.findUnique({
        where: { slug },
        select: { id: true },
      });

      const mockOrg = existingMockOrg
        ? await prisma.organization.update({
            where: { id: existingMockOrg.id },
            data: {
              name: `${category.name} Mock Org ${i}`,
              slug,
              businessCategory: category.slug,
              type: OrgType.SUPPLIER,
              status: OrgStatus.ACTIVE,
              deletedAt: null,
              isVerified: true,
            },
          })
        : await prisma.organization.create({
            data: {
              name: `${category.name} Mock Org ${i}`,
              slug,
              taxId: await getUniqueOrganizationTaxId(baseTaxId),
              businessCategory: category.slug,
              type: OrgType.SUPPLIER,
              status: OrgStatus.ACTIVE,
              isVerified: true,
            },
          });

      await prisma.siteSetting.upsert({
        where: { key: `web-products-enabled-${mockOrg.id}` },
        update: {},
        create: {
          key: `web-products-enabled-${mockOrg.id}`,
          value: "true",
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
  const foodCategory = categories.find((c) => c.slug === "food-grocery");
  const clothingCategory = categories.find((c) => c.slug === "fashion");

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
  console.log(
    `   - Active business categories: ${activeBusinessCategories.length}`,
  );
  console.log(`   - Upserted mock organizations: ${mockOrganizationsUpserted}`);
  console.log(`   - Created warehouse: ${warehouse.name}`);
  console.log(`   - Created ${products.length} products`);
  console.log(
    `   - Created ${inventoryData.length} warehouse inventory entries`,
  );
  console.log(`   - Seeded HR survey form: ${environmentSurveySeed.formTitle}`);
  console.log(`   - Seeded HR survey PDF: ${environmentSurveySeed.pdfUrl}`);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error("❌ Seed failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await disconnectSeedPrisma();
    });
}
