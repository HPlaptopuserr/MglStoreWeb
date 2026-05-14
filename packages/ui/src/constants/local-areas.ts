export type LocalAreaKind = "capital" | "city" | "province";

export interface LocalAreaOption {
  slug: string;
  label: string;
  kind: LocalAreaKind;
  aliases: string[];
}

export const LOCAL_AREA_OPTIONS: LocalAreaOption[] = [
  {
    slug: "ulaanbaatar",
    label: "Улаанбаатар",
    kind: "capital",
    aliases: ["Улаанбаатар", "УБ", "UB", "Ulaanbaatar", "Ulan Bator"],
  },
  {
    slug: "erdenet",
    label: "Эрдэнэт",
    kind: "city",
    aliases: ["Эрдэнэт", "Орхон", "Erdenet", "Orkhon"],
  },
  {
    slug: "darkhan",
    label: "Дархан",
    kind: "city",
    aliases: ["Дархан", "Дархан-Уул", "Darkhan", "Darkhan-Uul"],
  },
  {
    slug: "bulgan",
    label: "Булган",
    kind: "province",
    aliases: ["Булган", "Bulgan"],
  },
  { slug: "arkhangai", label: "Архангай", kind: "province", aliases: ["Архангай", "Arkhangai"] },
  { slug: "bayan-ulgii", label: "Баян-Өлгий", kind: "province", aliases: ["Баян-Өлгий", "Баян Өлгий", "Bayan-Ulgii", "Bayan-Olgii"] },
  { slug: "bayankhongor", label: "Баянхонгор", kind: "province", aliases: ["Баянхонгор", "Bayankhongor"] },
  { slug: "govi-altai", label: "Говь-Алтай", kind: "province", aliases: ["Говь-Алтай", "Говь Алтай", "Govi-Altai"] },
  { slug: "govi-sumber", label: "Говьсүмбэр", kind: "province", aliases: ["Говьсүмбэр", "Говьсумбэр", "Govisumber", "Govi-Sumber"] },
  { slug: "dornogovi", label: "Дорноговь", kind: "province", aliases: ["Дорноговь", "Dornogovi"] },
  { slug: "dornod", label: "Дорнод", kind: "province", aliases: ["Дорнод", "Dornod"] },
  { slug: "dundgovi", label: "Дундговь", kind: "province", aliases: ["Дундговь", "Dundgovi"] },
  { slug: "zavkhan", label: "Завхан", kind: "province", aliases: ["Завхан", "Zavkhan"] },
  { slug: "uvurkhangai", label: "Өвөрхангай", kind: "province", aliases: ["Өвөрхангай", "Ovorhangai", "Uvurkhangai"] },
  { slug: "umnugovi", label: "Өмнөговь", kind: "province", aliases: ["Өмнөговь", "Omnogovi", "Umnugovi"] },
  { slug: "sukhbaatar", label: "Сүхбаатар", kind: "province", aliases: ["Сүхбаатар", "Sukhbaatar"] },
  { slug: "selenge", label: "Сэлэнгэ", kind: "province", aliases: ["Сэлэнгэ", "Selenge"] },
  { slug: "tuv", label: "Төв", kind: "province", aliases: ["Төв аймаг", "Tuv", "Tov"] },
  { slug: "uvs", label: "Увс", kind: "province", aliases: ["Увс", "Uvs"] },
  { slug: "khovd", label: "Ховд", kind: "province", aliases: ["Ховд", "Khovd"] },
  { slug: "khuvsgul", label: "Хөвсгөл", kind: "province", aliases: ["Хөвсгөл", "Khuvsgul", "Huvsgul"] },
  { slug: "khentii", label: "Хэнтий", kind: "province", aliases: ["Хэнтий", "Khentii", "Hentii"] },
];

function normalizeLocalAreaValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/ө/g, "о")
    .replace(/ү/g, "у")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ");
}

export function getLocalAreaLabel(slug: string) {
  return LOCAL_AREA_OPTIONS.find((area) => area.slug === slug)?.label ?? slug;
}

export function getLocalAreaAliases(slug: string) {
  return LOCAL_AREA_OPTIONS.find((area) => area.slug === slug)?.aliases ?? [];
}

export function isLocalAreaSlug(value?: string | null): value is string {
  if (!value) return false;
  return LOCAL_AREA_OPTIONS.some((area) => area.slug === value);
}

export function getLocalAreaFromText(value?: string | null): LocalAreaOption | null {
  if (!value) return null;
  const normalized = normalizeLocalAreaValue(value);

  for (const area of LOCAL_AREA_OPTIONS) {
    const values = [area.slug, ...area.aliases].map(normalizeLocalAreaValue);
    if (values.some((alias) => normalized.includes(alias))) return area;
  }

  return null;
}
