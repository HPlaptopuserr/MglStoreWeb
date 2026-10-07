import type { StocktakeCountEdit, StocktakeDetail } from "@mgl/types";

/** Recover a lost response only when exactly the intended next version exists.
 * Never replay a write against a freshly fetched version: that could overwrite
 * another counter's edits or apply an increment twice. */
export async function confirmStocktakeSave(
  version: number,
  edits: StocktakeCountEdit[],
  write: () => Promise<StocktakeDetail>,
  read: () => Promise<StocktakeDetail>,
): Promise<StocktakeDetail> {
  try {
    return await write();
  } catch (error) {
    const current = await read().catch(() => null);
    if (
      current?.status === "DRAFT" &&
      current.version === version + 1 &&
      edits.every((edit) => {
        const line = current.lines.find((row) => row.id === edit.id);
        return line?.counted === edit.counted && line.note === edit.note.trim();
      })
    )
      return current;
    throw error;
  }
}
