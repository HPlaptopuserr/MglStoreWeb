export type AssistantSeverity = "good" | "info" | "warning" | "critical";

export type AssistantCategory = {
  id: string;
  name: string;
  slug?: string | null;
  children?: AssistantCategory[];
};

export type AssistantProduct = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  businessCategoryId?: string | null;
  businessCategory?: { id: string; name: string } | null;
};

export type AssistantProductDraft = {
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  price?: string;
  costPrice?: string;
  stock?: string;
  businessCategoryId?: string;
  images?: string[];
  supplyType?: "IN_STOCK" | "CHINA_PREORDER";
};

export type AssistantIssue = {
  id: string;
  severity: AssistantSeverity;
  title: string;
  detail: string;
};

export type CategorySuggestion = {
  id: string;
  name: string;
  confidence: number;
  reason: string;
};

export type DuplicateSuggestion = {
  id: string;
  name: string;
  score: number;
  reason: string;
};

export type ProductAssistantResult = {
  score: number;
  summary: string;
  issues: AssistantIssue[];
  categorySuggestions: CategorySuggestion[];
  duplicateSuggestions: DuplicateSuggestion[];
  tags: string[];
  descriptionSuggestion: string | null;
};

type FlatCategory = {
  id: string;
  name: string;
  slug?: string | null;
  path: string;
};

const KEYWORD_GROUPS: Array<{ tag: string; keywords: string[] }> = [
  { tag: "хүнс", keywords: ["хүнс", "хоол", "food", "snack", "ундаа", "ус", "juice", "milk", "сүү"] },
  { tag: "кофе", keywords: ["coffee", "кофе", "espresso", "latte", "americano", "лав", "nescafe"] },
  { tag: "гоо сайхан", keywords: ["гоо", "beauty", "cream", "крем", "serum", "shampoo", "саван", "үнэртэн"] },
  { tag: "хувцас", keywords: ["хувцас", "shirt", "цамц", "pants", "өмд", "dress", "гутал", "shoe"] },
  { tag: "гэр ахуй", keywords: ["гэр", "ахуй", "гал тогоо", "kitchen", "цэвэрлэгээ", "угаалга"] },
  { tag: "цахилгаан", keywords: ["утас", "phone", "charger", "цэнэглэгч", "usb", "кабель", "computer", "laptop"] },
  { tag: "хүүхэд", keywords: ["хүүхэд", "baby", "kids", "тоглоом", "toy"] },
  { tag: "эрүүл мэнд", keywords: ["витамин", "эм", "health", "mask", "маск", "supplement"] },
  { tag: "бэлэг", keywords: ["бэлэг", "gift", "card", "set", "ком"] },
  { tag: "захиалга", keywords: ["preorder", "захиалга", "ирнэ", "china", "хятад"] },
];

const GENERIC_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "new",
  "бараа",
  "бүтээгдэхүүн",
  "шинэ",
  "ширхэг",
  "ш",
  "pcs",
  "pc",
]);

export function analyzeProductDraft({
  draft,
  categories,
  products,
  editingId,
}: {
  draft: AssistantProductDraft;
  categories: AssistantCategory[];
  products: AssistantProduct[];
  editingId?: string | null;
}): ProductAssistantResult {
  const flatCategories = flattenCategories(categories);
  const name = draft.name.trim();
  const description = (draft.description || "").trim();
  const searchText = normalizeText(`${name} ${description} ${draft.sku || ""}`);
  const tokens = tokenize(searchText);
  const issues = collectIssues(draft);
  const categorySuggestions = suggestCategories({
    draft,
    flatCategories,
    tokens,
    searchText,
  });
  const duplicateSuggestions = suggestDuplicates({
    draft,
    products,
    editingId,
  });
  const tags = suggestTags(searchText, tokens);
  const descriptionSuggestion = createDescriptionSuggestion(draft, tags);
  const score = computeScore({
    draft,
    issues,
    hasCategorySuggestion: categorySuggestions.length > 0,
    duplicateSuggestions,
  });

  return {
    score,
    summary: summarizeScore(score, issues, duplicateSuggestions),
    issues,
    categorySuggestions,
    duplicateSuggestions,
    tags,
    descriptionSuggestion,
  };
}

function flattenCategories(categories: AssistantCategory[], parent = ""): FlatCategory[] {
  return categories.flatMap((category) => {
    const path = parent ? `${parent} / ${category.name}` : category.name;
    return [
      { id: category.id, name: category.name, slug: category.slug, path },
      ...flattenCategories(category.children || [], path),
    ];
  });
}

function collectIssues(draft: AssistantProductDraft): AssistantIssue[] {
  const issues: AssistantIssue[] = [];
  const name = draft.name.trim();
  const description = (draft.description || "").trim();
  const price = Number(draft.price || 0);
  const costPrice = draft.costPrice?.trim() ? Number(draft.costPrice) : null;

  if (!name) {
    issues.push({
      id: "missing-name",
      severity: "critical",
      title: "Барааны нэр дутуу",
      detail: "AI туслах ангилал, tag санал болгохын тулд эхлээд нэр хэрэгтэй.",
    });
  } else if (name.length < 4) {
    issues.push({
      id: "short-name",
      severity: "warning",
      title: "Нэр хэт богино байна",
      detail: "Хэрэглэгч хайхад ойлгомжтой байхаар брэнд, хэмжээ, төрөл нэмээрэй.",
    });
  }

  if (!draft.businessCategoryId) {
    issues.push({
      id: "missing-category",
      severity: "warning",
      title: "Ангилал сонгоогүй",
      detail: "Зөв ангилал нь хайлт болон marketplace дээр харагдах чанарыг сайжруулна.",
    });
  }

  if (!description) {
    issues.push({
      id: "missing-description",
      severity: "info",
      title: "Тайлбар хоосон байна",
      detail: "3-5 үгтэй богино тайлбар ч хайлт, итгэлцэлд тусална.",
    });
  } else if (description.length < 24) {
    issues.push({
      id: "short-description",
      severity: "info",
      title: "Тайлбар богино байна",
      detail: "Хэмжээ, зориулалт, онцлог, хүргэлтийн нөхцлөөс нэгийг нэмэхэд хангалттай.",
    });
  }

  if (!Number.isFinite(price) || price <= 0) {
    issues.push({
      id: "missing-price",
      severity: "critical",
      title: "Үнэ шалгах шаардлагатай",
      detail: "Зарах үнэ 0-ээс их байх ёстой.",
    });
  }

  if (costPrice !== null && Number.isFinite(price) && costPrice > price) {
    issues.push({
      id: "cost-above-price",
      severity: "warning",
      title: "Авсан үнэ зарах үнээс өндөр байна",
      detail: "Маржин сөрөг болох магадлалтай тул үнэ эсвэл өртгөө дахин шалгаарай.",
    });
  }

  if ((draft.images || []).length === 0) {
    issues.push({
      id: "missing-image",
      severity: "info",
      title: "Зураг нэмээгүй байна",
      detail: "Зурагтай бараа хэрэглэгчийн итгэл болон даралтыг нэмэгдүүлдэг.",
    });
  }

  return issues;
}

function suggestCategories({
  draft,
  flatCategories,
  tokens,
  searchText,
}: {
  draft: AssistantProductDraft;
  flatCategories: FlatCategory[];
  tokens: string[];
  searchText: string;
}): CategorySuggestion[] {
  if (!draft.name.trim() || flatCategories.length === 0) return [];

  const detectedTags = suggestTags(searchText, tokens);
  const scored = flatCategories
    .map((category) => {
      const categoryText = normalizeText(`${category.path} ${category.slug || ""}`);
      const categoryTokens = tokenize(categoryText);
      let score = 0;

      for (const token of tokens) {
        if (categoryTokens.includes(token)) score += 18;
        if (token.length >= 4 && categoryText.includes(token)) score += 8;
      }

      for (const tag of detectedTags) {
        if (categoryText.includes(normalizeText(tag))) score += 20;
      }

      return { category, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return scored.map(({ category, score }) => ({
    id: category.id,
    name: category.path,
    confidence: Math.min(96, Math.max(42, Math.round(score))),
    reason: "Нэр, тайлбар болон keyword-ээр тааруулсан санал.",
  }));
}

function suggestDuplicates({
  draft,
  products,
  editingId,
}: {
  draft: AssistantProductDraft;
  products: AssistantProduct[];
  editingId?: string | null;
}): DuplicateSuggestion[] {
  const name = normalizeText(draft.name);
  const sku = normalizeText(draft.sku || "");
  const barcode = normalizeText(draft.barcode || "");
  if (!name && !sku && !barcode) return [];

  return products
    .filter((product) => product.id !== editingId)
    .map((product) => {
      const productName = normalizeText(product.name);
      const nameScore = name ? similarity(name, productName) : 0;
      const skuExact = sku && normalizeText(product.sku || "") === sku;
      const barcodeExact = barcode && normalizeText(product.barcode || "") === barcode;
      const score = skuExact || barcodeExact ? 100 : Math.round(nameScore * 100);
      const reason = skuExact
        ? "SKU яг давхцаж байна."
        : barcodeExact
          ? "Barcode яг давхцаж байна."
          : "Барааны нэр ойролцоо байна.";
      return { id: product.id, name: product.name, score, reason };
    })
    .filter((item) => item.score >= 62)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function suggestTags(searchText: string, tokens: string[]) {
  const tags = new Set<string>();
  for (const group of KEYWORD_GROUPS) {
    if (
      group.keywords.some((keyword) => {
        const normalized = normalizeText(keyword);
        return searchText.includes(normalized) || tokens.includes(normalized);
      })
    ) {
      tags.add(group.tag);
    }
  }

  for (const token of tokens) {
    if (token.length >= 4 && !GENERIC_WORDS.has(token) && tags.size < 6) {
      tags.add(token);
    }
  }

  return [...tags].slice(0, 6);
}

function createDescriptionSuggestion(draft: AssistantProductDraft, tags: string[]) {
  const name = draft.name.trim();
  const description = (draft.description || "").trim();
  if (!name || description.length >= 24) return null;

  const tagText = tags.length > 0 ? ` ${tags.slice(0, 3).join(", ")} төрлийн` : "";
  if (draft.supplyType === "CHINA_PREORDER") {
    return `${name} - захиалгаар авах боломжтой${tagText} бараа. Ирэх хугацаа болон нөхцөлийг захиалга хийхээс өмнө баталгаажуулна.`;
  }
  return `${name} - өдөр тутмын хэрэглээнд тохиромжтой${tagText} бараа. Үнэ, нөөц болон хүргэлтийн мэдээллийг захиалга хийхээс өмнө шалгана уу.`;
}

function computeScore({
  draft,
  issues,
  hasCategorySuggestion,
  duplicateSuggestions,
}: {
  draft: AssistantProductDraft;
  issues: AssistantIssue[];
  hasCategorySuggestion: boolean;
  duplicateSuggestions: DuplicateSuggestion[];
}) {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "critical") score -= 25;
    else if (issue.severity === "warning") score -= 14;
    else if (issue.severity === "info") score -= 6;
  }
  if (duplicateSuggestions.some((item) => item.score >= 90)) score -= 22;
  if (!draft.businessCategoryId && hasCategorySuggestion) score += 6;
  return Math.max(0, Math.min(100, score));
}

function summarizeScore(
  score: number,
  issues: AssistantIssue[],
  duplicateSuggestions: DuplicateSuggestion[],
) {
  if (duplicateSuggestions.some((item) => item.score >= 90)) {
    return "Давхардал байж магадгүй. Хадгалахаас өмнө шалгаарай.";
  }
  if (score >= 86) return "Барааны мэдээлэл сайн байна. Хайлтанд гарахад бэлэн.";
  if (score >= 66) return "Боломжийн байна. Доорх жижиг саналуудыг засвал илүү сайн.";
  if (issues.some((issue) => issue.severity === "critical")) {
    return "Хадгалахаас өмнө заавал засах мэдээлэл байна.";
  }
  return "Мэдээллийг баяжуулах шаардлагатай.";
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !GENERIC_WORDS.has(token));
}

function similarity(a: string, b: string) {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  const union = new Set([...aTokens, ...bTokens]).size;
  return overlap / union;
}
