export type SearchScope = "all" | "categories" | "organizations" | "new";

export interface SearchOption {
  id: string;
  name: string;
  slug?: string;
  icon?: string | null;
}

export const SEARCH_SCOPES = [
  { id: "all", label: "Бүгд" },
  { id: "categories", label: "Ангилал" },
  { id: "organizations", label: "Байгууллагууд" },
  { id: "new", label: "Шинэ" },
] as const satisfies ReadonlyArray<{ id: SearchScope; label: string }>;

// These collections have no backing pages or API yet.
export const UPCOMING_SCOPES = ["Эвэнт", "Кино", "Купонууд", "Бэлгийн карт"];

export function filterSearchOptions(options: SearchOption[], query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return options.filter((option) =>
    terms.every((term) =>
      `${option.name} ${option.slug ?? ""}`.toLocaleLowerCase().includes(term),
    ),
  );
}

export function searchDestination(
  scope: SearchScope,
  query: string,
  categories: SearchOption[] = [],
): string | null {
  const search = query.trim();
  if (scope === "categories") {
    const matches = filterSearchOptions(categories, search);
    const exact = matches.find(
      (category) =>
        category.name.toLocaleLowerCase() === search.toLocaleLowerCase(),
    );
    const category = exact ?? (matches.length === 1 ? matches[0] : undefined);
    return category
      ? `/products?${new URLSearchParams({ category: category.id })}`
      : null;
  }
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (scope === "new") params.set("sort", "newest");
  const path = scope === "organizations" ? "/organizations" : "/products";
  return params.size ? `${path}?${params}` : path;
}
