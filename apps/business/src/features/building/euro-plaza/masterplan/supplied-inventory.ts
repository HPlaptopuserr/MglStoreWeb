import type { MasterplanInventory } from "./inventory";
import { getFloorPlan, plannedUnitCount } from "./floor-plans";

/** Drawing quantities are independent from the brochure and unknown sales inventory. */
export const suppliedInventory: MasterplanInventory = {
  mode: "provisional",
  blocks: {
    B04: {
      id: "euro-plaza-provisional",
      name: "Евро Плаза",
      layoutsHref: "#layouts",
      reportedFloorCount: 16,
      reportedUnitCount: 195,
      plannedUnitCount,
      counts: null,
      floors: Array.from({ length: 16 }, (_, index) => ({
        number: 16 - index,
        plan: getFloorPlan(16 - index),
        counts: null,
      })),
      note: "1–4-р давхар үйлчилгээний төв. 5–16-р давхрын зураглалаар 156 айл; танилцуулгын 195 айлтай зөрүүтэй. 4-р давхрын шинэ зураг хүлээгдэж байна.",
    },
  },
};
