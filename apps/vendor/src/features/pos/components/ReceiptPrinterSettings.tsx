"use client";

import { useEffect, useState } from "react";
import {
  readReceiptPageMode,
  saveReceiptPageMode,
  type ReceiptPageMode,
} from "../utils/receipt-paper";

/** Shared settings apply to automatic checkout prints and history reprints. */
export function ReceiptPrinterSettings() {
  const [mode, setMode] = useState<ReceiptPageMode>("receipt");
  useEffect(() => {
    setMode(readReceiptPageMode());
  }, []);

  return (
    <div className="mt-2 space-y-1 text-xs text-slate-600">
      <label className="flex flex-wrap items-center gap-2">
        Хэвлэх горим
        <select
          value={mode}
          onChange={(event) => {
            const next =
              event.target.value === "printer" ? "printer" : "receipt";
            setMode(next);
            saveReceiptPageMode(next);
          }}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-blue-500"
        >
          <option value="receipt">Баримтын уртаар</option>
          <option value="printer">Принтерийн цаасны тохиргоогоор</option>
        </select>
      </label>
      <p>
        Хоосон зай их гарвал принтерийн цаасны тохиргооны горимыг сонгоно уу.
      </p>
      <p>
        Хэвлэх цонхонд: зөв принтер, 58/80 мм цаас, 100% хэмжээ, захгүй (None),
        толгой/хөлгүй (Headers and footers off) тохируулна уу.
      </p>
    </div>
  );
}
