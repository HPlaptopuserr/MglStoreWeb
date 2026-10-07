import type { StocktakeCountEdit, StocktakeDetail } from "@mgl/types";

/** Publish each successful batch so a later failure keeps only unsaved edits. */
export async function saveStocktakeEdits(
  current: StocktakeDetail,
  edits: StocktakeCountEdit[],
  save: (
    version: number,
    batch: StocktakeCountEdit[],
  ) => Promise<StocktakeDetail>,
  onSaved: (updated: StocktakeDetail, batch: StocktakeCountEdit[]) => void,
): Promise<StocktakeDetail> {
  let updated = current;
  for (let offset = 0; offset < edits.length; offset += 500) {
    const batch = edits.slice(offset, offset + 500);
    updated = await save(updated.version, batch);
    onSaved(updated, batch);
  }
  return updated;
}
