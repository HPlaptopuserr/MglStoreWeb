type SearchableCategory = {
  id: string;
  name: string;
  slug?: string | null;
  parentId?: string | null;
  level?: number | null;
};

type SearchableProduct = {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  businessCategoryId?: string | null;
  businessCategory?: {
    id: string;
    name: string;
    slug?: string | null;
    parent?: { id: string; name: string; slug?: string | null } | null;
  } | null;
  organization?: { id: string; name: string } | null;
};

type ProductCategoryCandidate = {
  id: string;
  name: string;
  slug?: string | null;
  score: number;
  reason: string;
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "энэ",
  "тэр",
  "нэг",
  "юм",
  "зүйл",
  "хийх",
  "авах",
  "бараа",
  "бүтээгдэхүүн",
  "машин",
  "төхөөрөмж",
  "төрлийн",
  "загварын",
  "ширээний",
  "суурин",
  "гар",
  "ажиллагаатай",
  "өндөр",
  "хурдны",
]);

const SEARCH_INTENTS: Array<{ label: string; keywords: string[]; aliases: string[] }> = [
  {
    label: "Хоол хүнс",
    keywords: [
      "хоол",
      "хүнс",
      "идэх",
      "уух",
      "ундаа",
      "food",
      "snack",
      "сүү",
      "ус",
      "мах",
      "будаа",
    ],
    aliases: ["хүнс", "супермаркет", "мини маркет", "сүү цагаан идээ", "өдөр тутмын хүнс"],
  },
  {
    label: "Гоо сайхан",
    keywords: ["гоо", "сайхан", "крем", "cream", "serum", "shampoo", "үнэртэн", "саван"],
    aliases: ["гоо сайхан", "арьс арчилгаа"],
  },
  {
    label: "Хувцас",
    keywords: ["хувцас", "цамц", "өмд", "гутал", "shoe", "shirt", "dress"],
    aliases: ["хувцас", "гутал", "гутал цүнх", "онлайн дэлгүүр"],
  },
  {
    label: "Гэр ахуй",
    keywords: ["гэр", "ахуй", "цэвэрлэгээ", "угаалга", "kitchen"],
    aliases: ["гэр ахуй", "цэвэрлэгээ"],
  },
  {
    label: "Гал тогооны хэрэгсэл",
    keywords: [
      "тогоо",
      "шарах",
      "шарагч",
      "чанах",
      "чанагч",
      "хуурга",
      "хуурагч",
      "хэрчигч",
      "татагч",
      "зуурагч",
      "элдэгч",
      "шахагч",
      "хутгагч",
      "бин",
      "грилл",
      "хоол хийх",
      "хоолны хэрэгсэл",
      "гал тогооны төхөөрөмж",
      "гал тогоо",
      "kitchenware",
      "cookware",
    ],
    aliases: [
      "гал тогооны хэрэгсэл",
      "тогоо хуурга",
      "шарагч грилл",
      "гал тогооны төхөөрөмж",
      "мах ногоо бэлтгэх төхөөрөмж",
      "гурил зуурмаг гоймон төхөөрөмж",
      "жүүс ундаа бэлтгэх төхөөрөмж",
      "халаах хадгалах төхөөрөмж",
      "гэр ахуйн цахилгаан",
      "гэр ахуй",
    ],
  },
  {
    label: "Цахилгаан бараа",
    keywords: ["утас", "iphone", "tv", "цэнэглэгч", "charger", "usb", "кабель", "computer", "laptop"],
    aliases: [
      "цахилгаан",
      "гар утас таблет",
      "компьютер laptop",
      "камер аудио",
      "дагалдах хэрэгсэл",
      "онлайн дэлгүүр",
    ],
  },
  {
    label: "Сав баглаа боодол",
    keywords: ["битүүмжлэх", "лааз", "кан", "савлагаа", "баглаа", "packaging"],
    aliases: ["сав баглаа", "сав баглаа боодол", "битүүмжлэх төхөөрөмж", "үйлдвэрлэл"],
  },
  {
    label: "ХАА тоног төхөөрөмж",
    keywords: ["ноос", "зулгаагч", "мал", "ферм", "хөдөө аж ахуй"],
    aliases: ["хаа тоног төхөөрөмж", "мал аж ахуй", "мал аж ахуйн төхөөрөмж", "хөдөө аж ахуй"],
  },
  {
    label: "Бэлэг",
    keywords: ["бэлэг", "gift", "төрсөн", "set", "ком"],
    aliases: ["бэлэг", "хямдрал"],
  },
  {
    label: "Кофе",
    keywords: ["кофе", "coffee", "espresso", "latte", "americano"],
    aliases: ["кофе", "ундаа", "супермаркет"],
  },
];

function matchesDiscoveryKeyword(text: string, tokens: string[], keyword: string) {
  const normalized = normalizeDiscoveryText(keyword);
  if (!normalized) return false;
  if (normalized.includes(" ")) return text.includes(normalized);
  return tokens.includes(normalized);
}

function getMatchedSearchIntents(search: string) {
  const normalizedSearch = normalizeDiscoveryText(search);
  const tokens = tokenizeDiscoveryText(search);
  return SEARCH_INTENTS.filter((intent) =>
    intent.keywords.some((keyword) =>
      matchesDiscoveryKeyword(normalizedSearch, tokens, keyword),
    ),
  );
}

function isBroadIntentSearch(search: string, intent: (typeof SEARCH_INTENTS)[number]) {
  const normalizedSearch = normalizeDiscoveryText(search);
  const broadWords = ["зүйл", "хийх", "хэрэгсэл", "ангилал", "бараа", "төрөл"];
  if (broadWords.some((word) => normalizedSearch.includes(word))) return true;

  const intentPhrases = [intent.label, ...intent.aliases].map(normalizeDiscoveryText);
  return intentPhrases.some((phrase) => phrase && normalizedSearch.includes(phrase));
}

export function normalizeDiscoveryText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeDiscoveryText(value: string) {
  return normalizeDiscoveryText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function buildProductSearchWhere(search: string) {
  const tokens = tokenizeDiscoveryText(search).slice(0, 6);
  const intentPhrases = getMatchedSearchIntents(search).flatMap((intent) => [
    intent.label,
    ...intent.aliases,
  ]);
  const phrases = [search.trim(), ...tokens, ...intentPhrases].filter(Boolean);
  const seen = new Set<string>();
  const uniquePhrases = phrases.filter((phrase) => {
    const normalized = normalizeDiscoveryText(phrase);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  return uniquePhrases.flatMap((phrase) => [
    { name: { contains: phrase, mode: "insensitive" as const } },
    { description: { contains: phrase, mode: "insensitive" as const } },
    { sku: { contains: phrase, mode: "insensitive" as const } },
    { barcode: { contains: phrase, mode: "insensitive" as const } },
    { organization: { name: { contains: phrase, mode: "insensitive" as const } } },
    {
      businessCategory: {
        OR: [
          { name: { contains: phrase, mode: "insensitive" as const } },
          { slug: { contains: phrase, mode: "insensitive" as const } },
          { parent: { name: { contains: phrase, mode: "insensitive" as const } } },
          { parent: { slug: { contains: phrase, mode: "insensitive" as const } } },
        ],
      },
    },
  ]);
}

export function scoreProductForSearch(product: SearchableProduct, search: string) {
  const normalizedSearch = normalizeDiscoveryText(search);
  if (!normalizedSearch) return 0;

  const tokens = tokenizeDiscoveryText(search);
  const fields = {
    name: normalizeDiscoveryText(product.name || ""),
    description: normalizeDiscoveryText(product.description || ""),
    sku: normalizeDiscoveryText(product.sku || ""),
    barcode: normalizeDiscoveryText(product.barcode || ""),
    category: normalizeDiscoveryText(
      `${product.businessCategory?.name || ""} ${product.businessCategory?.slug || ""} ${product.businessCategory?.parent?.name || ""} ${product.businessCategory?.parent?.slug || ""}`,
    ),
    organization: normalizeDiscoveryText(product.organization?.name || ""),
  };

  let score = 0;
  if (fields.name === normalizedSearch) score += 120;
  if (fields.name.includes(normalizedSearch)) score += 80;
  if (fields.category.includes(normalizedSearch)) score += 60;
  if (fields.organization.includes(normalizedSearch)) score += 35;
  if (fields.description.includes(normalizedSearch)) score += 25;
  if (fields.sku === normalizedSearch || fields.barcode === normalizedSearch) score += 100;

  for (const token of tokens) {
    if (fields.name.includes(token)) score += 32;
    if (fields.category.includes(token)) score += 28;
    if (fields.organization.includes(token)) score += 16;
    if (fields.description.includes(token)) score += 10;
    if (fields.sku.includes(token) || fields.barcode.includes(token)) score += 22;
  }

  for (const intent of SEARCH_INTENTS) {
    if (
      intent.keywords.some((keyword) =>
        matchesDiscoveryKeyword(normalizedSearch, tokens, keyword),
      )
    ) {
      const intentText = normalizeDiscoveryText(`${intent.label} ${intent.aliases.join(" ")}`);
      if (isBroadIntentSearch(search, intent)) {
        if (fields.category.includes(normalizeDiscoveryText(intent.label))) score += 45;
        if (intent.aliases.some((alias) => fields.category.includes(normalizeDiscoveryText(alias)))) {
          score += 30;
        }
      }
      if (
        intent.label === "Гал тогооны хэрэгсэл" &&
        normalizedSearch.includes("хоол хийх") &&
        fields.category.includes(normalizeDiscoveryText(intent.label))
      ) {
        score += 80;
      }
      if (tokens.some((token) => intentText.includes(token) && fields.name.includes(token))) {
        score += 12;
      }
    }
  }

  return score;
}

export function buildProductDiscoveryText(product: SearchableProduct) {
  return normalizeDiscoveryText(
    [
      product.name,
      product.description,
      product.sku,
      product.barcode,
      product.businessCategory?.name,
      product.businessCategory?.slug,
      product.businessCategory?.parent?.name,
      product.businessCategory?.parent?.slug,
      product.organization?.name,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function scoreProductSimilarity(source: SearchableProduct, candidate: SearchableProduct) {
  if (source.id === candidate.id) return 0;

  const sourceText = buildProductDiscoveryText(source);
  const candidateText = buildProductDiscoveryText(candidate);
  const sourceTokens = tokenizeDiscoveryText(sourceText).filter((token) => token.length > 2);
  const candidateTokens = new Set(
    tokenizeDiscoveryText(candidateText).filter((token) => token.length > 2),
  );
  const candidateName = normalizeDiscoveryText(candidate.name || "");
  const candidateCategory = normalizeDiscoveryText(
    `${candidate.businessCategory?.name || ""} ${candidate.businessCategory?.parent?.name || ""}`,
  );

  let score = 0;
  if (source.businessCategoryId && source.businessCategoryId === candidate.businessCategoryId) {
    score += 180;
  } else if (
    source.businessCategory?.parent?.id &&
    source.businessCategory.parent.id === candidate.businessCategory?.parent?.id
  ) {
    score += 34;
  }
  if (source.organization?.id && source.organization.id === candidate.organization?.id) {
    score += 20;
  }

  const seenTokens = new Set<string>();
  for (const token of sourceTokens) {
    if (seenTokens.has(token) || !candidateTokens.has(token)) continue;
    seenTokens.add(token);
    score += candidateName.includes(token) ? 18 : candidateCategory.includes(token) ? 14 : 7;
  }

  if (
    source.businessCategory?.name &&
    candidateName.includes(normalizeDiscoveryText(source.businessCategory.name))
  ) {
    score += 12;
  }

  return score;
}

export function suggestProductCategory(
  product: SearchableProduct,
  categories: SearchableCategory[],
): ProductCategoryCandidate[] {
  const text = normalizeDiscoveryText(
    `${product.name} ${product.description || ""} ${product.sku || ""} ${product.organization?.name || ""}`,
  );
  const tokens = tokenizeDiscoveryText(text);
  if (!text || categories.length === 0) return [];

  return categories
    .map((category) => {
      const categoryText = normalizeDiscoveryText(`${category.name} ${category.slug || ""}`);
      let score = 0;
      for (const token of tokens) {
        if (categoryText.includes(token)) score += 22;
      }
      for (const intent of SEARCH_INTENTS) {
        const intentMatch = intent.keywords.some((keyword) =>
          matchesDiscoveryKeyword(text, tokens, keyword),
        );
        if (!intentMatch) continue;
        if (categoryText.includes(normalizeDiscoveryText(intent.label))) score += 50;
        if (intent.aliases.some((alias) => categoryText.includes(normalizeDiscoveryText(alias)))) {
          score += 34;
        }
      }
      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        score,
        reason: "Нэр, тайлбар, vendor болон keyword intent-ээр оноолт хийсэн.",
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aLevel = categories.find((category) => category.id === a.id)?.level ?? 0;
      const bLevel = categories.find((category) => category.id === b.id)?.level ?? 0;
      return bLevel - aLevel;
    })
    .slice(0, 3);
}
