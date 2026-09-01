import type { BusinessCategory } from "../types";
import { getEbarimtGroceryClassificationCode } from "@mgl/types";

const CATEGORY_CLASSIFICATION_SEARCH_TERMS: Record<string, string[]> = {
  "fresh-produce": ["жимс", "хүнсний ногоо", "ногоо"],
  "meat-seafood": ["мах", "загас", "далайн бүтээгдэхүүн"],
  "dairy-products": ["сүү", "тараг", "цагаан идээ"],
  "bakery-products": ["талх", "бялуу", "жигнэмэг", "нарийн боов"],
  beverages: ["рашаан", "шүүс", "согтууруулах бус ундаа"],
  "snacks-sweets": ["шоколад", "чихэр", "жигнэмэг", "амттан"],
  "grocery-staples": ["будаа", "гурил", "гоймон"],
  "canned-packaged-food": ["нөөшилсөн", "савласан хүнс", "консерв"],
  "frozen-food": ["хөлдөөсөн хүнс"],
  "baby-food": ["хүүхдийн хүнс"],
  "ready-meals": ["бэлэн хоол", "хоол хүнс"],
  "coffee-tea": ["кофе", "цай"],
  "dessert-bakery-cafe": ["бялуу", "нарийн боов", "жигнэмэг"],
  "fast-food": ["бургер", "пицца", "сэндвич"],
  "catering-services": ["хоол, ундны үйлчилгээ", "захиалгат хоол"],
  "pet-food": ["амьтны хоол", "тэжээл"],
};

export function getCategoryClassificationSearchText(
  category: BusinessCategory | null | undefined,
) {
  if (!category) return "";

  const explicitTerms =
    CATEGORY_CLASSIFICATION_SEARCH_TERMS[category.slug] ?? [];
  return [category.name, category.slug.replace(/-/g, " "), ...explicitTerms]
    .filter(Boolean)
    .join(" ");
}

export function getCategoryAutomaticClassificationCode(
  category: BusinessCategory | null | undefined,
  productName = "",
) {
  if (!category) return null;
  return getEbarimtGroceryClassificationCode(category.slug, productName);
}
