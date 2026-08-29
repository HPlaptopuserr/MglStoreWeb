export interface SystemQrCategoryOption {
  code: string;
  name: string;
  categoryCode?: string;
  categoryName?: string;
}

/** Provider codes used while Minu's metadata endpoint is unavailable. */
export const FALLBACK_SYSTEMQR_CATEGORIES: readonly SystemQrCategoryOption[] = [
  {
    code: "36",
    name: "Электрон бараа (Компьютер, гар утас)",
    categoryName: "Бараа",
  },
  { code: "35", name: "Бусад" },
];
