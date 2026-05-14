export const SERVICE_CATEGORY_OPTIONS = [
  "Нягтлан бодох",
  "Татвар",
  "Санхүү",
  "Хууль",
  "Маркетинг",
  "Дизайн",
  "Фото зураг",
  "Сургалт",
  "Хүний нөөц",
  "IT үйлчилгээ",
  "Хүргэлт",
  "Бусад үйлчилгээ",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORY_OPTIONS)[number];

const SERVICE_CATEGORY_SET = new Set<string>(SERVICE_CATEGORY_OPTIONS);

const SERVICE_CATEGORY_ALIASES: Record<string, ServiceCategory> = {
  accounting: "Нягтлан бодох",
  audit: "Нягтлан бодох",
  "нягтлан": "Нягтлан бодох",
  "нягтлан бодох": "Нягтлан бодох",
  tax: "Татвар",
  "татвар": "Татвар",
  finance: "Санхүү",
  "санхүү": "Санхүү",
  legal: "Хууль",
  contract: "Хууль",
  "гэрээ": "Хууль",
  "хууль": "Хууль",
  marketing: "Маркетинг",
  "маркетинг": "Маркетинг",
  design: "Дизайн",
  "дизайн": "Дизайн",
  photo: "Фото зураг",
  photoshoot: "Фото зураг",
  photography: "Фото зураг",
  "фото зураг": "Фото зураг",
  "зураг": "Фото зураг",
  training: "Сургалт",
  "сургалт": "Сургалт",
  hr: "Хүний нөөц",
  recruitment: "Хүний нөөц",
  "human resources": "Хүний нөөц",
  "хүний нөөц": "Хүний нөөц",
  it: "IT үйлчилгээ",
  "it үйлчилгээ": "IT үйлчилгээ",
  delivery: "Хүргэлт",
  "хүргэлт": "Хүргэлт",
  other: "Бусад үйлчилгээ",
  "бусад": "Бусад үйлчилгээ",
  "бусад үйлчилгээ": "Бусад үйлчилгээ",
};

export function isServiceCategory(value: string | null | undefined): value is ServiceCategory {
  return Boolean(value && SERVICE_CATEGORY_SET.has(value));
}

export function getServicePostCategories(tags: readonly string[] = []) {
  const categories: ServiceCategory[] = [];

  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;

    const category = isServiceCategory(trimmed)
      ? trimmed
      : SERVICE_CATEGORY_ALIASES[trimmed.toLowerCase()];

    if (category && !categories.includes(category)) {
      categories.push(category);
    }
  }

  return categories;
}
