/** File snapshots remain available for offline evaluation and local previews. */
export function persistentVisualSearchEnabled(): boolean {
  return (
    process.env.VISUAL_SEARCH_INDEX_STORE === "database" ||
    (process.env.NODE_ENV === "production" &&
      process.env.VISUAL_SEARCH_INDEX_STORE !== "file")
  );
}
