export const EBARIMT_TAX_TYPES = [
  "VAT_ABLE",
  "VAT_FREE",
  "VAT_ZERO",
  "NOT_VAT",
] as const;

export type EbarimtTaxType = (typeof EBARIMT_TAX_TYPES)[number];

export type EbarimtTaxProductCode = {
  code: string;
  name: string;
};

export const EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE = "6212991";

const EBARIMT_GROCERY_CATEGORY_CLASSIFICATION_CODES: Readonly<
  Record<string, string>
> = {
  "market-food-grocery": EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE,
  "fresh-produce": "6212100",
  "dairy-products": "6212200",
  "bakery-products": "6212500",
  beverages: "6212600",
  "snacks-sweets": "6212500",
  "grocery-staples": EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE,
  "canned-packaged-food": EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE,
  "frozen-food": EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE,
  "baby-food": EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE,
  "coffee-tea": "6212791",
};

export function getEbarimtGroceryClassificationCode(
  categorySlug: unknown,
  productName: unknown = "",
): string | null {
  const slug = String(categorySlug ?? "")
    .trim()
    .toLowerCase();
  if (slug === "meat-seafood") {
    return /загас|далайн|fish|seafood/i.test(String(productName ?? ""))
      ? "6212400"
      : "6212300";
  }
  return EBARIMT_GROCERY_CATEGORY_CLASSIFICATION_CODES[slug] ?? null;
}

// Official PosAPI 3 reference lists published by ITC:
// - vat free good.xlsx
// - vat zero.xlsx
export const EBARIMT_VAT_FREE_PRODUCT_CODES: readonly EbarimtTaxProductCode[] =
  [
    {
      code: "305",
      name: "Хөгжлийн бэрхшээлтэй иргэний тусгай зориулалтын хэрэгсэл, тоног төхөөрөмж, автотээврийн хэрэгсэл",
    },
    {
      code: "307",
      name: "Иргэний агаарын хөлөг, хөдөлгүүр, дадлагажуур болон тэдгээрийн эд анги, тоног төхөөрөмж",
    },
    {
      code: "308",
      name: "Орон сууцны зориулалтаар ашиглаж байгаа байр буюу түүний хэсгийн борлуулалт",
    },
    {
      code: "310",
      name: "Эмчилгээний зориулалтын цус, цусан бүтээгдэхүүн, эд эрхтэн",
    },
    {
      code: "311",
      name: "Хийн түлш, түүний сав, тоног төхөөрөмж, тусгай зориулалтын машин механизм",
    },
    { code: "313", name: "Борлуулсан алт" },
    {
      code: "315",
      name: "Эрдэм шинжилгээ, судалгааны ажлын туршилтын бүтээгдэхүүн",
    },
    {
      code: "318",
      name: "Дотооддоо тарьж борлуулсан үр тариа, төмс, хүнсний ногоо, суулгац, жимс болон үйлдвэрлэсэн гурил",
    },
    {
      code: "319",
      name: "Дотоодод үйлдвэрийн аргаар бэлтгэн борлуулсан мах, дотор эрхтэн, дайвар бүтээгдэхүүн",
    },
    {
      code: "320",
      name: "Дотоодын түүхий эдээр боловсруулан дотоодод борлуулсан хүнсний сүү, сүүн бүтээгдэхүүн",
    },
    { code: "401", name: "Валют солих үйлчилгээ" },
    {
      code: "402",
      name: "Мөнгө хүлээн авах, шилжүүлэх болон хадгаламжийн данстай холбоотой банкны үйлчилгээ",
    },
    {
      code: "403",
      name: "Даатгал, даатгалын зуучлал, давхар даатгал, эд хөрөнгийн бүртгэлийн үйлчилгээ",
    },
    {
      code: "404",
      name: "Үнэт цаас, хувьцаа гаргах, шилжүүлэх, борлуулах болон баталгаа гаргах үйлчилгээ",
    },
    { code: "405", name: "Зээл олгох үйлчилгээ" },
    {
      code: "406",
      name: "Нийгмийн болон эрүүл мэндийн даатгалын сангийн хөрөнгийг байршуулсны хүүтэй холбоотой үйлчилгээ",
    },
    {
      code: "407",
      name: "Банк, ББСБ, ХЗХ-ны зээлийн хүү болон санхүүгийн хэрэгслийн холбогдох үйлчилгээ",
    },
    {
      code: "408",
      name: "Орон сууцны зориулалтын байр буюу түүний хэсгийг хөлслүүлэх үйлчилгээ",
    },
    {
      code: "409",
      name: "Зөвшөөрөлтэй боловсролын болон мэргэжлийн сургалтын үйлчилгээ",
    },
    { code: "410", name: "Эрүүл мэндийн үйлчилгээ" },
    { code: "411", name: "Шашны байгууллагын үйлчилгээ" },
    { code: "412", name: "Төрийн байгууллагаас үзүүлж байгаа үйлчилгээ" },
    { code: "413", name: "Нийтийн тээврийн үйлчилгээ" },
    {
      code: "414",
      name: "Гадаадын жуулчинд тур оператор, аяллын агентаас үзүүлсэн үйлчилгээ",
    },
    {
      code: "419",
      name: "Дотоодод үйлдвэрлэсэн жижиг, дунд үйлдвэрийн үйлдвэрлэлийн тоног төхөөрөмж, сэлбэг",
    },
    {
      code: "421",
      name: "Экспортод гаргасан зарим ашигт малтмалын бүтээгдэхүүн",
    },
    {
      code: "423",
      name: "Инновацийн төсөлд шаардлагатай, дотоодод үйлдвэрлэдэггүй түүхий эд, материал, урвалж бодис",
    },
    {
      code: "425",
      name: "Экспортод гаргасан түүхий, угаасан, самнасан ноолуур болон арьс шир",
    },
    {
      code: "426",
      name: "Соёлын өвийг судлах, сэргээн засварлах материал, техник, тоног төхөөрөмж, багаж",
    },
    {
      code: "428",
      name: "Газрын тос болон уламжлалт бус газрын тостой холбоотой тайлан, дээж болон газрын тос",
    },
    {
      code: "429",
      name: "Чөлөөт бүсэд зорчигчийн худалдаж авсан гурван сая төгрөг хүртэлх бараа",
    },
    { code: "430", name: "Соёлын өвийг сэргээн засварлах үйлчилгээ" },
    { code: "431", name: "Оршуулгын үйлчилгээ" },
    {
      code: "433",
      name: "Сэргээгдэх эрчим хүчний судалгаа, үйлдвэрлэлийн тоног төхөөрөмж, дагалдах хэрэгсэл, сэлбэг",
    },
    {
      code: "434",
      name: "Хөдөө аж ахуйн зориулалтын шинэ техник, тоног төхөөрөмж, бордоо, ургамал хамгааллын бодис",
    },
    { code: "436", name: "Мал эмнэлгийн үйлчилгээ" },
    { code: "437", name: "Нотариатын үйлчилгээ" },
    {
      code: "438",
      name: "Үнэт цаасны зах зээлийн санхүүгийн хэрэгслийн бүртгэл, арилжаа, хадгалалт болон баталгааны үйлчилгээ",
    },
    {
      code: "439",
      name: "Таван толгой түлш ХХК-ийн үйлдвэрлэсэн сайжруулсан шахмал түлш",
    },
    {
      code: "316",
      name: "Хөрөнгөөр баталгаажсан үнэт цаас гаргах зориулалтаар шилжүүлсэн шаардах эрх",
    },
    {
      code: "443",
      name: "Ирээдүйн өв санд хуваарилсан эх үүсвэр болон сангийн хөрөнгө оруулалтын орлого",
    },
    {
      code: "444",
      name: "Шинээр үйлдвэрлэсэн инновацийн бүтээгдэхүүн, ажил, үйлчилгээ",
    },
    { code: "445", name: "Виртуал хөрөнгийн үйлчилгээ" },
    {
      code: "447",
      name: "Малчин, мал бүхий этгээдийн борлуулсан мал болон анхан шатны боловсруулалтгүй малын гаралтай бүтээгдэхүүн",
    },
  ] as const;

export const EBARIMT_VAT_ZERO_PRODUCT_CODES: readonly EbarimtTaxProductCode[] =
  [
    {
      code: "501",
      name: "Монгол Улсаас экспортод гаргаж, гаалийн байгууллагад мэдүүлсэн бараа",
    },
    { code: "502", name: "Олон улсын зорчигч болон ачаа тээврийн үйлчилгээ" },
    {
      code: "503",
      name: "Монгол Улсын нутаг дэвсгэрээс гадна үзүүлсэн үйлчилгээ",
    },
    {
      code: "504",
      name: "Монгол Улсад оршин суугч бус этгээдэд үзүүлсэн үйлчилгээ",
    },
    {
      code: "505",
      name: "Олон улсын нислэгийн агаарын хөлөгт үзүүлсэн нислэг, техник, шатахуун, цэвэрлэгээ болон зорчигчийн үйлчилгээ",
    },
    {
      code: "506",
      name: "Засгийн газар, Монголбанкны захиалгаар дотоодод үйлдвэрлэсэн одон медаль, мөнгөн тэмдэгт, зоос",
    },
    { code: "507", name: "Ашигт малтмалын эцсийн бүтээгдэхүүн" },
  ] as const;

export function isEbarimtTaxType(value: unknown): value is EbarimtTaxType {
  return EBARIMT_TAX_TYPES.includes(value as EbarimtTaxType);
}

export function requiresEbarimtTaxProductCode(taxType: unknown): boolean {
  return taxType === "VAT_FREE" || taxType === "VAT_ZERO";
}

export function getEbarimtTaxProductCodes(
  taxType: unknown,
): readonly EbarimtTaxProductCode[] {
  if (taxType === "VAT_FREE") return EBARIMT_VAT_FREE_PRODUCT_CODES;
  if (taxType === "VAT_ZERO") return EBARIMT_VAT_ZERO_PRODUCT_CODES;
  return [];
}

export function isValidEbarimtTaxProductCode(
  taxType: unknown,
  code: unknown,
): boolean {
  const normalized = String(code ?? "").trim();
  if (!requiresEbarimtTaxProductCode(taxType)) return true;
  return getEbarimtTaxProductCodes(taxType).some(
    (entry) => entry.code === normalized,
  );
}

export function isValidEbarimtClassificationCode(code: unknown): boolean {
  return /^\d{7}$/.test(String(code ?? "").trim());
}
