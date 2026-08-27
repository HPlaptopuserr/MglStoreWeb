export const productImageOrderBy = () => [
  { sortOrder: "asc" as const },
  { id: "asc" as const },
];

export function toOrderedProductImages(imageUrls: readonly string[]) {
  return imageUrls.map((url, sortOrder) => ({ url, sortOrder }));
}
