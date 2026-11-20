// Keep the vendor API stable while sharing the fiscal calculation with sale storage.
export {
  calculatePosInclusiveVat as calculateEbarimtVat,
  type PosInclusiveVatLine as EbarimtVatLine,
  type PosInclusiveVatTotals as EbarimtVatTotals,
} from "@mgl/types";
