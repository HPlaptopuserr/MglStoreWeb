export type {
  SalePaymentMethod,
  SaleCreditPaymentMeta,
  SalePaymentLine,
  SalePayload,
  RegisterConfig,
  CartLine,
  PosCart,
  CartTotals,
} from "@mgl/types";

import type { PosProduct as BasePosProduct } from "@mgl/types";

export type PosProduct = BasePosProduct & { categoryName?: string | null };
