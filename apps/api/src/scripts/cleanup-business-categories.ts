import path from "path";
import dotenv from "dotenv";
import { prisma } from "@mgl/database";
import { normalizeDiscoveryText, tokenizeDiscoveryText } from "../services/product-discovery.service";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

type Args = {
  apply: boolean;
  limit: number;
  previewLimit: number;
};

type CategorySpec = {
  slug: string;
  name: string;
  icon?: string;
  parentSlug?: string | null;
  parentSlugAlternatives?: string[];
  sortOrder: number;
};

type ProductRule = {
  targetSlug: string;
  keywords: string[];
  avoid?: string[];
  reason: string;
};

const CATEGORY_FOUNDATIONS: CategorySpec[] = [
  {
    slug: "home-living",
    name: "Гэр ахуй, тавилга",
    icon: "🏠",
    parentSlug: null,
    sortOrder: 400,
  },
  {
    slug: "kitchenware",
    name: "Гал тогооны хэрэгсэл",
    icon: "🍳",
    parentSlug: "home-living",
    parentSlugAlternatives: ["food"],
    sortOrder: 403,
  },
  {
    slug: "electronics-technology",
    name: "Цахилгаан бараа, технологи",
    icon: "📱",
    parentSlug: null,
    sortOrder: 300,
  },
  {
    slug: "packaging",
    name: "Сав баглаа боодол",
    icon: "📦",
    parentSlug: "agriculture-industrial",
    parentSlugAlternatives: ["production"],
    sortOrder: 1605,
  },
  {
    slug: "agro-equipment",
    name: "ХАА тоног төхөөрөмж",
    icon: "🚜",
    parentSlug: "agriculture-industrial",
    parentSlugAlternatives: ["-agriculture"],
    sortOrder: 1603,
  },
];

const CATEGORY_REFINEMENTS: CategorySpec[] = [
  {
    slug: "dairy-products",
    name: "Сүү, цагаан идээ",
    icon: "🥛",
    parentSlug: "market-food-grocery",
    parentSlugAlternatives: ["food-beverage", "food"],
    sortOrder: 107,
  },
  {
    slug: "grocery-staples",
    name: "Өдөр тутмын хүнс",
    icon: "🧺",
    parentSlug: "market-food-grocery",
    parentSlugAlternatives: ["food-beverage", "food"],
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
    slug: "pos-retail-equipment",
    name: "POS, кассын төхөөрөмж",
    icon: "🧾",
    parentSlug: "electronics-technology",
    sortOrder: 308,
  },
  {
    slug: "traditional-clothing",
    name: "Үндэсний хувцас, дээл",
    icon: "🇲🇳",
    parentSlug: "fashion-beauty",
    sortOrder: 204,
  },
  {
    slug: "real-estate",
    name: "Үл хөдлөх, орон сууц",
    icon: "🏘️",
    parentSlug: "construction-tools",
    sortOrder: 1001,
  },
  {
    slug: "heating-cooling",
    name: "Халаалт, агааржуулалт",
    icon: "♨️",
    parentSlug: "construction-tools",
    sortOrder: 1005,
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
    name: "Кофе, ундаа бэлтгэх төхөөрөмж",
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

const ALL_CATEGORY_SPECS = [...CATEGORY_FOUNDATIONS, ...CATEGORY_REFINEMENTS];

const PRODUCT_RULES: ProductRule[] = [
  {
    targetSlug: "kids-clothing",
    keywords: ["хүүхдийн хувцас", "хүүхдийн гутал", "хүүхдийн бойтог", "бойтог"],
    reason: "Хүүхдийн хувцас, бойтог.",
  },
  {
    targetSlug: "fitness-recovery",
    keywords: ["массажны сандал", "massage chair", "массаж"],
    reason: "Wellness, массаж, нөхөн сэргээх төхөөрөмж.",
  },
  {
    targetSlug: "car-care",
    keywords: ["машин угаалгын төхөөрөмж", "машин угаалга", "car wash"],
    reason: "Авто арчилгаа, машин угаалгын төхөөрөмж.",
  },
  {
    targetSlug: "traditional-clothing",
    keywords: ["монгол үндэсний дээл", "үндэсний дээл", "дээл", "ууж", "монгол хувцас"],
    reason: "Үндэсний хувцас, дээл.",
  },
  {
    targetSlug: "heating-cooling",
    keywords: ["нам даралтын", "нам даралтын зуух", "хавтан халаалт", "пилёнкон халаалт", "пленкан халаалт", "халаалтын зуух", "халаалт"],
    reason: "Халаалт, агааржуулалтын бүтээгдэхүүн.",
  },
  {
    targetSlug: "industrial-equipment",
    keywords: ["ус боловсруулах", "үйлдвэрийн тоног төхөөрөмж", "цагт 4 тонн", "цагт 2 тонн"],
    avoid: ["гурил зуурагч", "гоймон", "банш", "бууз", "мантуу"],
    reason: "Үйлдвэрийн зориулалттай тоног төхөөрөмж.",
  },
  {
    targetSlug: "dishware-tableware",
    keywords: ["цаасан аяга", "аяга", "таваг", "сав суулга"],
    avoid: ["хогийн сав"],
    reason: "Аяга таваг, ширээний хэрэглээ.",
  },
  {
    targetSlug: "snacks-sweets",
    keywords: ["шоколад", "спартак", "амттан", "snack", "чипс", "candy", "чихэр"],
    avoid: ["printer", "machine"],
    reason: "Амттан, snack төрлийн бүтээгдэхүүн.",
  },
  {
    targetSlug: "pos-retail-equipment",
    keywords: [
      "barcode",
      "receipt printer",
      "label printer",
      "thermal printer",
      "ticket",
      "customer display",
      "pos",
      "касс",
      "кассын машин",
      "кассын лангуу",
      "баркод",
      "принтер",
      "injet printer",
    ],
    avoid: ["кассын лангуу"],
    reason: "POS, кассын болон barcode хэвлэх төхөөрөмж.",
  },
  {
    targetSlug: "beverages",
    keywords: [
      "ундаа",
      "ус",
      "жүүс",
      "чацаргана",
      "аньс",
      "fanta",
      "sprite",
      "cola",
      "кола",
      "redbull",
      "red bull",
      "aloe",
      "dawn",
      "kangaroo",
      "millenia",
      "miilenia",
      "powerade",
      "bonaqua",
      "nectar",
      "ooha",
      "schwippes",
      "green tea",
      "target original",
      "target mango",
      "target sugar",
      "target maximum",
      "target active",
    ],
    avoid: ["шүүс шахагч", "жүүс бэлтгэгч", "ус шүүгч машин", "тоног төхөөрөмж", "машин", "printer", "system"],
    reason: "Уух бүтээгдэхүүн, савласан ундааны ангилал.",
  },
  {
    targetSlug: "coffee-tea",
    keywords: ["кофе", "coffee", "latte", "cafe latte", "hazelnut latte", "caramel latte", "vanilla latte", "сүүтэй цай"],
    avoid: ["кофены машин", "коффены машин", "machine"],
    reason: "Кофе, цай болон cafe төрлийн бүтээгдэхүүн.",
  },
  {
    targetSlug: "bakery-products",
    keywords: ["талх", "торт", "рулет", "мантуу", "нарийн боов", "bakery", "panie"],
    avoid: ["машин", "төхөөрөмж", "зуурагч", "элдэгч", "үйлдвэрлэх", "хөргөгч", "хөргөрч", "хөргүүр"],
    reason: "Талх, нарийн боов, bakery бүтээгдэхүүн.",
  },
  {
    targetSlug: "ready-meals",
    keywords: [
      "бууз",
      "банш",
      "хуушуур",
      "шөл",
      "бантан",
      "бүргер",
      "burger",
      "ramen",
      "салат",
      "salad",
      "крылышки",
      "тахианы мөч",
      "шорлог",
      "жигнэсэн мах",
      "кимчи",
      "kimchi",
      "tuna salad",
      "шарсан дүпү",
      "амталсан мөөг",
      "будаатай хуурга",
      "хуурга",
      "жантай гоймон",
      "банштай цай",
    ],
    avoid: ["машин", "төхөөрөмж", "хийх машин", "үйлдвэрлэх машин"],
    reason: "Бэлэн хоол, restaurant/cafe menu бүтээгдэхүүн.",
  },
  {
    targetSlug: "meat-seafood",
    keywords: ["үхрийн мах", "хонины мах", "тахианы мах", "загас", "мах 1кг"],
    avoid: ["бууз", "банш", "хуушуур", "хуурга", "машин", "хэрчигч", "татагч"],
    reason: "Түүхий мах, загасны бүтээгдэхүүн.",
  },
  {
    targetSlug: "fresh-produce",
    keywords: ["жимс", "ногоо", "мөөг", "banana", "grape", "алим", "хатаасан банана"],
    avoid: ["ногоо хэрчигч", "хүнсний ногоо хэрчигч", "машин", "төхөөрөмж", "ундаа", "хөргөгч", "хөргөрч", "хөргүүр"],
    reason: "Жимс, хүнсний ногоо.",
  },
  {
    targetSlug: "baby-care",
    keywords: ["нярай", "baby care", "хүүхдийн нуралтын тос"],
    reason: "Нярай болон хүүхдийн арчилгааны бүтээгдэхүүн.",
  },
  {
    targetSlug: "shoes-bags",
    keywords: ["гутал", "пүүз", "shoe", "shoes", "эрчүүдийн гоёл", "баяр наадмын гоёл"],
    avoid: ["гутал ариутгах", "гутал хатаах"],
    reason: "Гутал, цүнх болон гоёлын бүтээгдэхүүн.",
  },
  {
    targetSlug: "cleaning-supplies",
    keywords: ["хогийн сав", "салфетка", "цаасан аяга", "ариутгах", "үнсний сав", "цэвэрлэгээний үйлчилгээний тэрэг", "маалинган хэрэгслийн тэрэг"],
    avoid: ["гутал ариутгах"],
    reason: "Цэвэрлэгээ, ахуйн хэрэглээний бараа.",
  },
  {
    targetSlug: "kitchen-storage",
    keywords: ["барааны сагс", "сагс"],
    reason: "Хадгалах сав, сагс, дэлгүүрийн хэрэглээ.",
  },
  {
    targetSlug: "kitchen-holding-storage",
    keywords: [
      "хөлдөөгч",
      "хөргөгч",
      "хөргөрч",
      "хөргүүр",
      "бялууны хөргүүр",
      "дулаан барьдаг",
      "mini bar",
      "халаах төхөөрөмж",
      "хөргөх шүүгээ",
    ],
    avoid: ["арьс", "батга", "уруул", "гарын тос", "balm", "care"],
    reason: "Хөргөх, халаах, хадгалах төхөөрөмж.",
  },
  {
    targetSlug: "furniture",
    keywords: ["ширээ сандал", "сандал", "ширээ", "тавилга", "кассын лангуу"],
    avoid: ["кассын машин", "массажны сандал"],
    reason: "Тавилга, лангуу, ширээ сандал.",
  },
  {
    targetSlug: "lighting",
    keywords: ["нүдэн гэрэл", "гэрэл", "lighting", "light", "led live", "live strehming light", "streaming light"],
    reason: "Гэрэлтүүлэг, гэрлийн хэрэгсэл.",
  },
  {
    targetSlug: "camera-audio",
    keywords: ["mic", "microphone", "микрофон", "speaker", "audio", "камер", "чихэвч", "bluetooth чихэвч", "headphones"],
    reason: "Камер, аудио, дууны төхөөрөмж.",
  },
  {
    targetSlug: "mobile-devices",
    keywords: ["i watch", "iwatch", "smart watch", "ухаалаг цаг"],
    reason: "Ухаалаг төхөөрөмж, wearable.",
  },
  {
    targetSlug: "electronics-accessories",
    keywords: [
      "usb",
      "кабель",
      "цэнэглэгч",
      "charger",
      "adapter",
      "адаптер",
      "ардафтэр",
      "ардаптер",
      "type c",
      "flash",
      "silicone flash",
      "уртасгагч розетка",
      "удирдлага",
      "smart tv udirdlaga",
    ],
    avoid: ["printer", "barcode", "receipt", "thermal", "touch screen", "customer display"],
    reason: "Цахилгаан барааны дагалдах хэрэгсэл.",
  },
  {
    targetSlug: "network-smart-home",
    keywords: ["gps", "gps-spy", "мини станц", "станц", "spy", "v380"],
    reason: "Сүлжээ, tracking, smart төхөөрөмж.",
  },
  {
    targetSlug: "office-supplies",
    keywords: ["тооны машин", "орчуулагч", "calculator", "бичиг хэрэг", "дэвтэр"],
    reason: "Оффис, бичиг хэргийн төхөөрөмж.",
  },
  {
    targetSlug: "beauty-skincare",
    keywords: ["батганы эсрэг", "acne care", "арьс", "уруул өнгөлөгч", "lip balm", "гарын тос", "hand balm", "baby care balm"],
    avoid: ["хүүхдийн нуралтын тос"],
    reason: "Арьс арчилгаа, гоо сайхны бүтээгдэхүүн.",
  },
  {
    targetSlug: "vitamins-supplements",
    keywords: ["балт жор", "барагшунтай бал", "зөгийн бал", "ханиад", "уушги", "нэмэлт бүтээгдэхүүн"],
    reason: "Wellness, нэмэлт бүтээгдэхүүн.",
  },
  {
    targetSlug: "pharmacy-medicine",
    keywords: ["бидерм", "эм", "өвдөлт", "үрэвсэл", "яс", "үе мөч"],
    avoid: ["эмэгтэй"],
    reason: "Эмчилгээ, эрүүл мэндийн хэрэглээ.",
  },
  {
    targetSlug: "building-materials",
    keywords: [
      "дулаалгатай металл фасад",
      "xps",
      "eps",
      "хөөсөнцөр",
      "металл хавтан",
      "лего блок",
      "лего плистрол",
      "модон хаалга",
      "хаалга",
      "ам дарагч",
      "гүн тогтоогч",
      "барилгын материал",
    ],
    reason: "Барилгын материал, дулаалга, хавтан, хаалга.",
  },
  {
    targetSlug: "plumbing-sanitary",
    keywords: ["нацосс", "насос", "помп", "эргэлтийн нацосс", "вакум нацосс", "ф100", "ф50", "шугам", "усалгааны систем", "цб р"],
    reason: "Сантехник, насос, усны системийн хэрэгсэл.",
  },
  {
    targetSlug: "tools-hardware",
    keywords: [
      "хүрз",
      "пранцосс",
      "цоож",
      "цилконы буу",
      "бахь",
      "гусочик",
      "хэрээн хошуут",
      "аваарын тууз",
      "нано наалт",
      "газны хошуу",
      "хайч",
      "цаасны хутга",
      "метр",
    ],
    reason: "Багаж, hardware, засварын хэрэгсэл.",
  },
  {
    targetSlug: "electrical-supplies",
    keywords: ["цахилгааны лент", "лент", "цахилгааны материал"],
    reason: "Цахилгааны материал.",
  },
  {
    targetSlug: "real-estate",
    keywords: ["байр зарна", "орон сууц", "хотхон", "минихаус", "айл", "өрөө байр"],
    reason: "Үл хөдлөх хөрөнгө, байр орон сууц.",
  },
  {
    targetSlug: "personal-care",
    keywords: ["гутал ариутгах", "гутал хатаах"],
    reason: "Хувийн хэрэглээ, ариутгах/хатаах төхөөрөмж.",
  },
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
      "дүүргэлт",
      "хуваах машин",
      "гурил зуурагч",
      "гурил элдэгч",
      "гоймонгийн машин",
      "гоймон үйлдвэрлэх машин",
      "гоймон татах машин",
      "банш хийх машин",
      "бууз банш хийх машин",
      "бууз/банш хийх машин",
      "мантуу хийх автомат машин",
      "гурилан хальс",
      "гоймон хусаж",
    ],
    avoid: ["450гр", "бэлэн", "жантай гоймон", "хэрчсэн гурил"],
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
      "махыг",
      "хөлдөөсөн мах",
      "загасны филет",
      "төмс хальслах",
      "хальслах машин",
      "шавхагч машин",
      "ус шавхагч",
      "жижиглэн холигч",
      "шанз болгодог машин",
    ],
    avoid: ["гурил", "гоймон", "үс", "ноос"],
    reason: "Мах, ногоо болон түүхий эд бэлтгэх төхөөрөмж.",
  },
  {
    targetSlug: "beverage-juice-equipment",
    keywords: ["шүүс шахагч", "жүүс бэлтгэгч", "juice extractor", "juicer", "ус шүүгч машин", "кофены машин", "коффены машин"],
    reason: "Кофе, ундаа бэлтгэх төхөөрөмж.",
  },
  {
    targetSlug: "kitchen-holding-storage",
    keywords: ["дулаан барьдаг", "mini bar", "халаах төхөөрөмж", "хөргөх шүүгээ", "хөргөгч", "хөргөрч", "хөргүүр", "бялууны хөргүүр"],
    avoid: ["арьс", "батга", "уруул", "гарын тос", "balm", "care"],
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
    avoid: ["машин", "төхөөрөмж", "коффены машин", "кофены машин"],
    reason: "Сүү, цагаан идээний бүтээгдэхүүн.",
  },
  {
    targetSlug: "grocery-staples",
    keywords: ["гурил 1кг", "будаа", "элсэн чихэр", "давс", "ургамлын тос", "тахианы мах", "мах 1кг"],
    avoid: [
      "машин",
      "төхөөрөмж",
      "зуурагч",
      "элдэгч",
      "тосонд шарах",
      "гарын тос",
      "уруул",
      "батга",
      "balm",
      "care",
      "бидерм",
    ],
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
    previewLimit: Number(getValue("--preview-limit", "80")),
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
    const avoided = rule.avoid?.some((keyword) => {
      const normalized = normalizeDiscoveryText(keyword);
      return Boolean(normalized) && (text.includes(normalized) || keywordMatches(text, tokens, keyword));
    });
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
  const categoryBySlug = new Map<string, {
    id: string;
    slug: string;
    name: string;
    icon?: string | null;
    parentId: string | null;
    level: number;
    sortOrder?: number;
    isActive?: boolean;
  }>(existingCategories.map((category) => [category.slug, category]));

  const resolveParent = (spec: CategorySpec) => {
    if (!spec.parentSlug) return null;
    for (const slug of [spec.parentSlug, ...(spec.parentSlugAlternatives || [])]) {
      const parent = categoryBySlug.get(slug);
      if (parent) return parent;
    }
    return undefined;
  };

  const categoryActions = ALL_CATEGORY_SPECS.map((spec) => {
    const parent = resolveParent(spec);
    const existing = categoryBySlug.get(spec.slug);
    if (parent === undefined) {
      return {
        type: "skip" as const,
        spec,
        reason: `Parent category not found: ${[spec.parentSlug, ...(spec.parentSlugAlternatives || [])].filter(Boolean).join(", ")}`,
      };
    }
    const nextLevel = parent ? parent.level + 1 : 0;
    const action = {
      type: existing ? ("update" as const) : ("create" as const),
      spec,
      parent,
      existing,
      nextLevel,
    };
    if (!existing) {
      categoryBySlug.set(spec.slug, {
        id: `new:${spec.slug}`,
        slug: spec.slug,
        name: spec.name,
        icon: spec.icon || null,
        parentId: parent?.id || null,
        level: nextLevel,
        sortOrder: spec.sortOrder,
        isActive: true,
      });
    }
    return action;
  });

  if (options.apply) {
    const applyCategoryBySlug = new Map<string, {
      id: string;
      slug: string;
      name: string;
      icon: string | null;
      parentId: string | null;
      level: number;
      sortOrder: number;
      isActive: boolean;
    }>(existingCategories.map((category) => [category.slug, category]));
    const resolveApplyParent = (spec: CategorySpec) => {
      if (!spec.parentSlug) return null;
      for (const slug of [spec.parentSlug, ...(spec.parentSlugAlternatives || [])]) {
        const parent = applyCategoryBySlug.get(slug);
        if (parent) return parent;
      }
      return undefined;
    };

    for (const action of categoryActions) {
      if (action.type === "skip") continue;
      const parent = resolveApplyParent(action.spec);
      if (parent === undefined) {
        throw new Error(`Parent category not found during apply: ${action.spec.slug}`);
      }
      const nextLevel = parent ? parent.level + 1 : 0;
      const saved = await prisma.businessCategory.upsert({
        where: { slug: action.spec.slug },
        update: {
          name: action.spec.name,
          icon: action.spec.icon || null,
          sortOrder: action.spec.sortOrder,
          parentId: parent?.id || null,
          level: nextLevel,
          isActive: true,
        },
        create: {
          slug: action.spec.slug,
          name: action.spec.name,
          icon: action.spec.icon || null,
          sortOrder: action.spec.sortOrder,
          parentId: parent?.id || null,
          level: nextLevel,
          isActive: true,
        },
      });
      applyCategoryBySlug.set(saved.slug, saved);
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
          if (action.type !== "create") return [];
          return [
            {
              id: `new:${action.spec.slug}`,
              slug: action.spec.slug,
              name: action.spec.name,
              parentId: action.parent?.id || null,
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
      `${options.apply ? "APPLY" : "DRY"} ${action.type.toUpperCase()} ${action.spec.slug} ${action.spec.name} parent=${action.parent?.slug || "root"} level=${action.nextLevel}`,
    );
  }

  console.log("\nPRODUCT_MOVES");
  for (const action of productActions.slice(0, options.previewLimit)) {
    console.log(
      `${options.apply ? "APPLY" : "DRY"} ${action.product.name} | ${action.product.businessCategory?.name || "-"} => ${action.target.name} | ${action.rule.reason}`,
    );
  }
  if (productActions.length > options.previewLimit) {
    console.log(`...and ${productActions.length - options.previewLimit} more product moves`);
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
