export type {
  SalePaymentMethod,
  SaleCreditPaymentMeta,
  PosCreditBorrower,
  SalePaymentLine,
  SalePayload,
  CartLine,
  PosCart,
  CartTotals,
} from "@mgl/types";

import type {
  PosProduct as BasePosProduct,
  RegisterConfig as BaseRegisterConfig,
} from "@mgl/types";

export type PosProduct = BasePosProduct & { categoryName?: string | null };

export type RegisterConfig = BaseRegisterConfig & {
  ebarimtEnabled: boolean;
  ebarimtPosApiUrl: string | null;
  ebarimtMerchantTin: string | null;
  ebarimtPosNo: string | null;
  ebarimtMerchantName: string | null;
};
