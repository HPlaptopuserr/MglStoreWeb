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
  price?: number | string | null;
  costPrice?: number | string | null;
  stock?: number | string | null;
  businessCategoryId?: string | null;
  businessCategory?: { id: string; name: string } | null;
  supplyType?: "IN_STOCK" | "CHINA_PREORDER";
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
  preorderLeadTimeDays?: string;
  preorderNote?: string;
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
  signal: "name" | "description" | "catalog" | "mixed";
  matchedTerms: string[];
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
  marketInsights: AssistantIssue[];
  actionPlan: string[];
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
  level: number;
};

const KEYWORD_GROUPS: Array<{ tag: string; keywords: string[] }> = [
  {
    tag: "хүнс",
    keywords: [
      "хүнс",
      "хоол",
      "food",
      "snack",
      "ундаа",
      "ус",
      "juice",
      "milk",
      "сүү",
    ],
  },
  {
    tag: "ундаа",
    keywords: [
      "aloe",
      "bonaqua",
      "powerade",
      "red bull",
      "redbull",
      "millenia",
      "miilenia",
      "nectar",
      "schwippes",
      "жүүс",
      "ус",
      "ундаа",
    ],
  },
  {
    tag: "кофе",
    keywords: [
      "coffee",
      "кофе",
      "espresso",
      "latte",
      "americano",
      "лав",
      "nescafe",
      "кофены машин",
      "коффены машин",
    ],
  },
  {
    tag: "гоо сайхан",
    keywords: [
      "гоо",
      "beauty",
      "cream",
      "крем",
      "serum",
      "shampoo",
      "саван",
      "үнэртэн",
    ],
  },
  {
    tag: "хувцас",
    keywords: [
      "хувцас",
      "shirt",
      "цамц",
      "pants",
      "өмд",
      "dress",
      "гутал",
      "shoe",
      "дээл",
      "үндэсний",
    ],
  },
  {
    tag: "гэр ахуй",
    keywords: [
      "гэр",
      "ахуй",
      "цэвэрлэгээ",
      "угаалга",
      "хогийн сав",
      "үнсний сав",
      "салфетка",
    ],
  },
  {
    tag: "гал тогоо",
    keywords: [
      "гал тогоо",
      "kitchen",
      "тогоо",
      "шарагч",
      "грилл",
      "хэрчигч",
      "зуурагч",
      "кофены машин",
      "хөргөгч",
      "хөргүүр",
    ],
  },
  {
    tag: "цахилгаан",
    keywords: [
      "утас",
      "phone",
      "charger",
      "цэнэглэгч",
      "usb",
      "кабель",
      "computer",
      "laptop",
      "чихэвч",
      "adapter",
      "адаптер",
      "flash",
    ],
  },
  {
    tag: "барилга",
    keywords: [
      "барилга",
      "сантехник",
      "насос",
      "ф100",
      "ф50",
      "нам даралтын",
      "зуух",
      "халаалт",
      "хаалга",
      "xps",
      "eps",
    ],
  },
  {
    tag: "pos",
    keywords: [
      "касс",
      "кассын",
      "barcode",
      "баркод",
      "receipt printer",
      "thermal printer",
      "принтер",
    ],
  },
  { tag: "хүүхэд", keywords: ["хүүхэд", "baby", "kids", "тоглоом", "toy"] },
  {
    tag: "эрүүл мэнд",
    keywords: ["витамин", "эм", "health", "mask", "маск", "supplement"],
  },
  { tag: "бэлэг", keywords: ["бэлэг", "gift", "card", "set", "ком"] },
  {
    tag: "захиалга",
    keywords: ["preorder", "захиалга", "ирнэ", "china", "хятад"],
  },
];

const CATEGORY_INTENTS: Array<{ category: string; keywords: string[] }> = [
  {
    category: "Ундаа, ус, жүүс",
    keywords: [
      "ундаа",
      "жүүс",
      "ус",
      "aloe",
      "bonaqua",
      "powerade",
      "red bull",
      "millenia",
      "nectar",
      "schwippes",
    ],
  },
  {
    category: "Кофе, ундаа бэлтгэх төхөөрөмж",
    keywords: [
      "кофены машин",
      "коффены машин",
      "ус шүүгч",
      "шүүс шахагч",
      "juicer",
    ],
  },
  {
    category: "Халаах, хадгалах төхөөрөмж",
    keywords: [
      "хөргөгч",
      "хөргөрч",
      "хөргүүр",
      "хөлдөөгч",
      "бялууны хөргүүр",
      "дулаан барьдаг",
    ],
  },
  {
    category: "Гурил, зуурмаг, гоймон төхөөрөмж",
    keywords: [
      "зуурагч",
      "банш хийх машин",
      "бууз",
      "мантуу",
      "гоймон",
      "гурилан хальс",
    ],
  },
  {
    category: "Мах, ногоо бэлтгэх төхөөрөмж",
    keywords: [
      "мах хэрчигч",
      "мах татагч",
      "ногоо хэрчигч",
      "төмс хальслах",
      "шанз",
      "хутгагч",
    ],
  },
  {
    category: "Сантехник",
    keywords: [
      "сантехник",
      "насос",
      "нацосс",
      "ф100",
      "ф50",
      "шугам",
      "усалгааны систем",
    ],
  },
  {
    category: "Халаалт, агааржуулалт",
    keywords: ["нам даралтын", "зуух", "халаалт", "хавтан халаалт"],
  },
  {
    category: "Үндэсний хувцас, дээл",
    keywords: ["дээл", "үндэсний", "монгол хувцас"],
  },
  {
    category: "POS, кассын төхөөрөмж",
    keywords: [
      "кассын машин",
      "баркод",
      "barcode",
      "receipt printer",
      "thermal printer",
      "pos",
    ],
  },
  {
    category: "Тавилга",
    keywords: ["кассын лангуу", "ширээ", "сандал", "тавилга"],
  },
  {
    category: "Дагалдах хэрэгсэл",
    keywords: [
      "adapter",
      "адаптер",
      "type c",
      "usb",
      "кабель",
      "flash",
      "цэнэглэгч",
    ],
  },
];

const PRODUCT_ATTRIBUTE_WORDS = [
  "хэмжээ",
  "материал",
  "өнгө",
  "багтаамж",
  "хүчин чадал",
  "ватт",
  "литр",
  "см",
  "мм",
  "кг",
  "зориулалт",
  "баталгаа",
  "хүргэлт",
  "захиалга",
  "нөөц",
  "үйлдвэр",
  "тоног төхөөрөмж",
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
  "test",
  "asdf",
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
  const marketInsights = collectMarketInsights({
    draft,
    products,
    flatCategories,
    searchText,
    tokens,
  });
  const categorySuggestions = suggestCategories({
    draft,
    products,
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
    marketInsights,
    actionPlan: createActionPlan({
      draft,
      issues,
      marketInsights,
      categorySuggestions,
      duplicateSuggestions,
    }),
    categorySuggestions,
    duplicateSuggestions,
    tags,
    descriptionSuggestion,
  };
}

function flattenCategories(
  categories: AssistantCategory[],
  parent = "",
): FlatCategory[] {
  return categories.flatMap((category) => {
    const path = parent ? `${parent} / ${category.name}` : category.name;
    return [
      {
        id: category.id,
        name: category.name,
        slug: category.slug,
        path,
        level: parent ? parent.split(" / ").length : 0,
      },
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
  } else if (name.length < 4 || looksLikePlaceholder(name)) {
    issues.push({
      id: "short-name",
      severity: "warning",
      title: "Нэр хэрэглэгчид ойлгомжгүй байна",
      detail:
        "Брэнд, төрөл, хэмжээ/загвар оруулбал хайлт болон санал болгох алгоритм илүү сайн ажиллана.",
    });
  } else if (!hasSpecificModifier(name)) {
    issues.push({
      id: "generic-name",
      severity: "info",
      title: "Нэрийг илүү ялгарахуйц болгох боломжтой",
      detail:
        "Жишээ: хэмжээ, материал, хүчин чадал, өнгө, зориулалт зэрэг нэг тодорхой шинж нэмээрэй.",
    });
  }

  if (!draft.businessCategoryId) {
    issues.push({
      id: "missing-category",
      severity: "warning",
      title: "Ангилал сонгоогүй",
      detail:
        "Зөв ангилал нь хайлт болон marketplace дээр харагдах чанарыг сайжруулна.",
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
      detail:
        "Хэмжээ, зориулалт, онцлог, хүргэлтийн нөхцлөөс нэгийг нэмэхэд хангалттай.",
    });
  } else if (descriptionQuality(description) < 2) {
    issues.push({
      id: "thin-description",
      severity: "info",
      title: "Тайлбар борлуулалтын мэдээлэл багатай",
      detail:
        "Хэмжээ, зориулалт, материал, баталгаа, хүргэлтээс дор хаяж 2 мэдээлэл нэмбэл илүү итгэл төрүүлнэ.",
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
      detail:
        "Маржин сөрөг болох магадлалтай тул үнэ эсвэл өртгөө дахин шалгаарай.",
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

  if (draft.supplyType === "CHINA_PREORDER") {
    const leadDays = Number(draft.preorderLeadTimeDays || 0);
    if (!Number.isFinite(leadDays) || leadDays <= 0) {
      issues.push({
        id: "missing-preorder-lead-time",
        severity: "warning",
        title: "Захиалгын ирэх хоног дутуу",
        detail:
          "Захиалгын бараанд ирэх хугацаа тодорхой байх нь checkout дээр итгэлцэл үүсгэнэ.",
      });
    }
    if (!(draft.preorderNote || "").trim()) {
      issues.push({
        id: "missing-preorder-note",
        severity: "info",
        title: "Захиалгын тайлбар нэмэх боломжтой",
        detail:
          "Урьдчилгаа, хүргэлтийн нөхцөл, баталгаажуулах хугацааг товч бичээрэй.",
      });
    }
  } else if (Number(draft.stock || 0) <= 0) {
    issues.push({
      id: "stock-zero",
      severity: "warning",
      title: "Бэлэн барааны нөөц 0 байна",
      detail:
        "Нөөцгүй бол web дээр худалдаж авах боломж муудах тул бэлэн эсэхийг шалгаарай.",
    });
  }

  return issues;
}

function collectMarketInsights({
  draft,
  products,
  flatCategories,
  searchText,
  tokens,
}: {
  draft: AssistantProductDraft;
  products: AssistantProduct[];
  flatCategories: FlatCategory[];
  searchText: string;
  tokens: string[];
}): AssistantIssue[] {
  const insights: AssistantIssue[] = [];
  const price = Number(draft.price || 0);
  const costPrice = draft.costPrice?.trim() ? Number(draft.costPrice) : null;
  const categoryId =
    draft.businessCategoryId ||
    suggestCategoryIdFromIntent(flatCategories, searchText, tokens);
  const comparable = products.filter(
    (product) => product.id && product.businessCategoryId === categoryId,
  );
  const priceStats = summarizePrices(comparable);

  if (Number.isFinite(price) && price > 0 && priceStats.count >= 3) {
    if (price > priceStats.median * 1.8) {
      insights.push({
        id: "price-high-vs-category",
        severity: "warning",
        title: "Үнэ ангиллын медианаас өндөр байна",
        detail: `Энэ ангиллын медиан үнэ ойролцоогоор ${formatMoney(priceStats.median)}. Өндөр үнэтэй бол тайлбар дээр материал, хүчин чадал, баталгаа зэрэг ялгарлыг заавал бичээрэй.`,
      });
    } else if (price < priceStats.median * 0.45) {
      insights.push({
        id: "price-low-vs-category",
        severity: "info",
        title: "Үнэ ангиллын медианаас бага байна",
        detail: `Энэ нь хямдрал/entry product байж болно. Хэрэв алдаатай биш бол "хямдрал", хэмжээ, савлагааны ялгааг тодорхой бичээрэй.`,
      });
    }
  }

  if (
    costPrice !== null &&
    Number.isFinite(costPrice) &&
    Number.isFinite(price) &&
    price > 0
  ) {
    const margin = (price - costPrice) / price;
    if (margin >= 0.45) {
      insights.push({
        id: "healthy-margin",
        severity: "good",
        title: "Маржин боломжийн өндөр байна",
        detail: `Ойролцоогоор ${Math.round(margin * 100)}% gross margin. Энэ барааг онцлох/санал болгох хэсэгт туршихад тохиромжтой.`,
      });
    } else if (margin > 0 && margin < 0.12) {
      insights.push({
        id: "thin-margin",
        severity: "warning",
        title: "Маржин нимгэн байна",
        detail: `Ойролцоогоор ${Math.round(margin * 100)}% gross margin. Хүргэлт, шимтгэл, буцаалтын зардлаа тооцоорой.`,
      });
    }
  }

  const categoryIntent = bestCategoryIntent(searchText, tokens);
  if (categoryIntent && categoryId) {
    const selected = flatCategories.find(
      (category) => category.id === categoryId,
    );
    if (
      selected &&
      !normalizeText(selected.path).includes(
        normalizeText(categoryIntent.category),
      )
    ) {
      insights.push({
        id: "category-intent-mismatch",
        severity: "warning",
        title: "Нэр/тайлбар сонгосон ангилалтай зөрж магадгүй",
        detail: `Бодит дата дээр энэ төрлийн бараа ихэвчлэн "${categoryIntent.category}" ангилалд орж байна.`,
      });
    }
  }

  if (products.length >= 8) {
    const missingDescriptionRate =
      products.filter(
        (product) =>
          !product.description || product.description.trim().length < 20,
      ).length / products.length;
    if (missingDescriptionRate > 0.35) {
      insights.push({
        id: "catalog-description-gap",
        severity: "info",
        title: "Танай каталогт тайлбарын чанарын боломж байна",
        detail:
          "Олон бараанд тайлбар богино байгаа тул энэ бараан дээр сайн тайлбар бичвэл хайлт болон итгэлцэл дээр ялгарна.",
      });
    }
  }

  return insights.slice(0, 4);
}

function suggestCategories({
  draft,
  products,
  flatCategories,
  tokens,
  searchText,
}: {
  draft: AssistantProductDraft;
  products: AssistantProduct[];
  flatCategories: FlatCategory[];
  tokens: string[];
  searchText: string;
}): CategorySuggestion[] {
  const nameText = normalizeText(draft.name);
  const descriptionText = normalizeText(draft.description || "");
  const nameTokens = tokenize(nameText);
  const descriptionTokens = tokenize(descriptionText);
  if (!nameText && !descriptionText) return [];
  if (flatCategories.length === 0) return [];

  const detectedTags = suggestTags(searchText, tokens);
  const intent = bestCategoryIntent(searchText, tokens);
  const catalogSignals = buildCategoryCatalogSignals(products);
  const scored = flatCategories
    .map((category) => {
      const categoryText = normalizeText(
        `${category.path} ${category.slug || ""}`,
      );
      const categoryTokens = tokenize(categoryText);
      const matchedTerms = new Set<string>();
      const signalScores = {
        name: 0,
        description: 0,
        catalog: 0,
      };
      let score = 0;

      for (const token of nameTokens) {
        if (categoryTokens.includes(token)) {
          score += 18;
          signalScores.name += 18;
          matchedTerms.add(token);
        }
        if (token.length >= 4 && categoryText.includes(token)) {
          score += 8;
          signalScores.name += 8;
          matchedTerms.add(token);
        }
      }

      for (const token of descriptionTokens) {
        if (categoryTokens.includes(token)) {
          score += 26;
          signalScores.description += 26;
          matchedTerms.add(token);
        }
        if (token.length >= 4 && categoryText.includes(token)) {
          score += 12;
          signalScores.description += 12;
          matchedTerms.add(token);
        }
      }

      for (const tag of detectedTags) {
        const normalizedTag = normalizeText(tag);
        if (categoryText.includes(normalizedTag)) {
          score += 20;
          if (descriptionText.includes(normalizedTag)) {
            signalScores.description += 20;
          } else {
            signalScores.name += 20;
          }
          matchedTerms.add(tag);
        }
      }
      if (intent && categoryText.includes(normalizeText(intent.category))) {
        const intentBoost = descriptionText
          ? 88 + Math.min(intent.score * 8, 32)
          : 72;
        score += intentBoost;
        if (
          descriptionText &&
          intent.keywords.some((keyword) =>
            descriptionText.includes(normalizeText(keyword)),
          )
        ) {
          signalScores.description += intentBoost;
        } else {
          signalScores.name += intentBoost;
        }
        for (const keyword of intent.keywords) {
          const normalizedKeyword = normalizeText(keyword);
          if (searchText.includes(normalizedKeyword)) matchedTerms.add(keyword);
        }
      }
      if (category.level > 0) score += Math.min(14, category.level * 5);

      const catalogSignal = catalogSignals.get(category.id);
      if (catalogSignal && searchText) {
        const catalogScore = Math.round(
          Math.max(
            similarity(searchText, catalogSignal.text),
            descriptionText
              ? similarity(descriptionText, catalogSignal.text)
              : 0,
          ) * 100,
        );
        if (catalogScore >= 18) {
          const boost = Math.min(42, catalogScore);
          score += boost;
          signalScores.catalog += boost;
          for (const term of catalogSignal.terms) {
            if (searchText.includes(term)) matchedTerms.add(term);
          }
        }
      }

      const signal = dominantSignal(signalScores);

      return {
        category,
        score,
        signal,
        matchedTerms: [...matchedTerms].slice(0, 5),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return scored.map(({ category, score, signal, matchedTerms }) => ({
    id: category.id,
    name: category.path,
    confidence: Math.min(96, Math.max(42, Math.round(score))),
    reason: categorySuggestionReason(signal, matchedTerms),
    signal,
    matchedTerms,
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
      const substringScore =
        name &&
        productName &&
        (name.includes(productName) || productName.includes(name))
          ? 0.82
          : 0;
      const skuExact = sku && normalizeText(product.sku || "") === sku;
      const barcodeExact =
        barcode && normalizeText(product.barcode || "") === barcode;
      const score =
        skuExact || barcodeExact
          ? 100
          : Math.round(Math.max(nameScore, substringScore) * 100);
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

function createDescriptionSuggestion(
  draft: AssistantProductDraft,
  tags: string[],
) {
  const name = draft.name.trim();
  const description = (draft.description || "").trim();
  if (!name || description.length >= 24) return null;

  const tagText =
    tags.length > 0 ? ` ${tags.slice(0, 3).join(", ")} төрлийн` : "";
  const price = Number(draft.price || 0);
  const priceText =
    Number.isFinite(price) && price > 0 ? ` Үнэ: ${formatMoney(price)}.` : "";
  if (draft.supplyType === "CHINA_PREORDER") {
    const leadTime = Number(draft.preorderLeadTimeDays || 0);
    const leadText =
      Number.isFinite(leadTime) && leadTime > 0
        ? ` Дундаж ирэх хугацаа: ${leadTime} хоног.`
        : "";
    return `${name} - захиалгаар авах боломжтой${tagText} бараа.${priceText}${leadText} Захиалга хийхээс өмнө өнгө, хэмжээ, хүргэлтийн нөхцөлийг баталгаажуулна.`;
  }
  return `${name} - өдөр тутмын хэрэглээнд тохиромжтой${tagText} бараа.${priceText} Нөөц, хүргэлт болон сонголтын мэдээллийг захиалга хийхээс өмнө шалгана уу.`;
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
  if (issues.some((issue) => issue.id === "generic-name")) score -= 4;
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
  if (score >= 86)
    return "Барааны мэдээлэл сайн байна. Хайлтанд гарахад бэлэн.";
  if (score >= 66)
    return "Боломжийн байна. Доорх жижиг саналуудыг засвал илүү сайн.";
  if (issues.some((issue) => issue.severity === "critical")) {
    return "Хадгалахаас өмнө заавал засах мэдээлэл байна.";
  }
  return "Мэдээллийг баяжуулах шаардлагатай.";
}

function createActionPlan({
  draft,
  issues,
  marketInsights,
  categorySuggestions,
  duplicateSuggestions,
}: {
  draft: AssistantProductDraft;
  issues: AssistantIssue[];
  marketInsights: AssistantIssue[];
  categorySuggestions: CategorySuggestion[];
  duplicateSuggestions: DuplicateSuggestion[];
}) {
  const actions: string[] = [];
  if (duplicateSuggestions.some((item) => item.score >= 90)) {
    actions.push(
      "Давхардсан SKU/barcode эсвэл ижил нэртэй барааг эхэлж шалгах.",
    );
  }
  if (!draft.businessCategoryId && categorySuggestions[0]) {
    actions.push(`"${categorySuggestions[0].name}" ангиллыг түрүүлж сонгох.`);
  }
  if (issues.some((issue) => issue.id.includes("description"))) {
    actions.push(
      "Тайлбарт хэмжээ, зориулалт, материал/хүчин чадал, хүргэлтийн нөхцлөөс 2-3 мэдээлэл нэмэх.",
    );
  }
  if (marketInsights.some((issue) => issue.id.includes("price"))) {
    actions.push("Үнийн байрлалаа ангиллын бусад бараатай харьцуулж шалгах.");
  }
  if ((draft.images || []).length === 0) {
    actions.push("Нүүр зураг нэмэх. Боломжтой бол бодит зураг ашиглах.");
  }
  if (actions.length === 0) {
    actions.push(
      "Мэдээлэл боломжийн байна. Хадгалаад web дээр харагдах байдлыг шалгахад болно.",
    );
  }
  return actions.slice(0, 4);
}

function buildCategoryCatalogSignals(products: AssistantProduct[]) {
  const map = new Map<string, { text: string; terms: string[] }>();
  for (const product of products) {
    if (!product.businessCategoryId) continue;
    const text = normalizeText(`${product.name} ${product.description || ""}`);
    if (!text) continue;
    const existing = map.get(product.businessCategoryId);
    const terms = tokenize(text).filter((token) => token.length >= 4);
    if (existing) {
      existing.text = `${existing.text} ${text}`.slice(0, 4000);
      existing.terms = [...new Set([...existing.terms, ...terms])].slice(0, 24);
    } else {
      map.set(product.businessCategoryId, {
        text,
        terms: [...new Set(terms)].slice(0, 24),
      });
    }
  }
  return map;
}

function dominantSignal(scores: {
  name: number;
  description: number;
  catalog: number;
}): CategorySuggestion["signal"] {
  const values = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (values[0][1] <= 0) return "mixed";
  if (values[1] && values[1][1] >= values[0][1] * 0.72) return "mixed";
  return values[0][0] as CategorySuggestion["signal"];
}

function categorySuggestionReason(
  signal: CategorySuggestion["signal"],
  matchedTerms: string[],
) {
  const terms = matchedTerms.length > 0 ? ` (${matchedTerms.join(", ")})` : "";
  if (signal === "description") {
    return `Тайлбар дээрх түлхүүр мэдээллээр санал болгов${terms}.`;
  }
  if (signal === "catalog") {
    return `Өмнөх catalog-ийн төстэй бараануудтай харьцуулж санал болгов${terms}.`;
  }
  if (signal === "name") {
    return `Барааны нэр дээрх keyword-ээр санал болгов${terms}.`;
  }
  return `Нэр, тайлбар, catalog-ийн нийлмэл сигналаар санал болгов${terms}.`;
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

function looksLikePlaceholder(value: string) {
  const normalized = normalizeText(value);
  return (
    /^(test|asdf|aaa|bbb|123|йыб|ыб|sadasd|demo)/i.test(normalized) ||
    /(.)\1{3,}/.test(normalized)
  );
}

function hasSpecificModifier(value: string) {
  const normalized = normalizeText(value);
  return (
    /\d/.test(normalized) ||
    normalized.split(" ").filter((token) => token.length > 1).length >= 3
  );
}

function descriptionQuality(value: string) {
  const normalized = normalizeText(value);
  const signals = [
    /\d/.test(normalized),
    /(см|мм|м2|мл|л|кг|гр|w|ватт|хоног|жил)/.test(normalized),
    PRODUCT_ATTRIBUTE_WORDS.some((word) => normalized.includes(word)),
    normalized.split(" ").length >= 10,
  ];
  return signals.filter(Boolean).length;
}

function bestCategoryIntent(searchText: string, tokens: string[]) {
  return CATEGORY_INTENTS.map((intent) => {
    const score = intent.keywords.reduce((sum, keyword) => {
      const normalized = normalizeText(keyword);
      if (!normalized) return sum;
      if (normalized.includes(" "))
        return sum + (searchText.includes(normalized) ? 3 : 0);
      return (
        sum +
        (tokens.includes(normalized) || searchText.includes(normalized) ? 2 : 0)
      );
    }, 0);
    return { ...intent, score };
  })
    .filter((intent) => intent.score > 0)
    .sort((a, b) => b.score - a.score)[0];
}

function suggestCategoryIdFromIntent(
  flatCategories: FlatCategory[],
  searchText: string,
  tokens: string[],
) {
  const intent = bestCategoryIntent(searchText, tokens);
  if (!intent) return null;
  return (
    flatCategories.find((category) =>
      normalizeText(category.path).includes(normalizeText(intent.category)),
    )?.id || null
  );
}

function summarizePrices(products: AssistantProduct[]) {
  const prices = products
    .map((product) => Number(product.price || 0))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);
  if (prices.length === 0) return { count: 0, median: 0 };
  const mid = Math.floor(prices.length / 2);
  const median =
    prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  return { count: prices.length, median };
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("en-US")}₮`;
}
