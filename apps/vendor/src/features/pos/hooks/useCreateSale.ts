import { useState } from "react";
import { createSale } from "../api/create-sale";
import type { SalePayload } from "../types/pos.types";
import type { PosReceipt } from "../types/receipt.types";

export function useCreateSale() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<PosReceipt | null>(null);

  const submitSale = async (payload: SalePayload) => {
    setLoading(true);
    setError(null);

    try {
      const receipt = await createSale(payload);
      setLastReceipt(receipt);
      return receipt;
    } catch (e: any) {
      setError(e?.message || "Sale create failed");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, lastReceipt, submitSale };
}
