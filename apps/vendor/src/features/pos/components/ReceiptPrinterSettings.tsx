"use client";

import { useEffect, useState } from "react";
import {
  readReceiptPageMode,
  readReceiptCompact,
  saveReceiptCompact,
  saveReceiptPageMode,
  type ReceiptPageMode,
} from "../utils/receipt-paper";

/** Shared settings apply to automatic checkout prints and history reprints. */
export function ReceiptPrinterSettings() {
  const [compact, setCompact] = useState(false);
  const [mode, setMode] = useState<ReceiptPageMode>("receipt");
  useEffect(() => {
    setMode(readReceiptPageMode());
    setCompact(readReceiptCompact());
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
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={compact}
          onChange={(event) => {
            setCompact(event.target.checked);
            saveReceiptCompact(event.target.checked);
            if (event.target.checked) {
              setMode("receipt");
              saveReceiptPageMode("receipt");
            }
          }}
        />
        Илүү зайг багасгах
      </label>
      <p>
        Илүү зай гарвал «Баримтын уртаар» горим болон «Илүү зайг багасгах»-ыг
        сонгоно уу. Принтерийн цаасны горим нь драйвер тусгай хэмжээг хүлээн
        авахгүй үед хэрэглэнэ.
      </p>
      <p>
        Хэвлэх цонхонд: зөв принтер, 58/80 мм цаас, 100% хэмжээ, захгүй (None),
        толгой/хөлгүй (Headers and footers off) тохируулна уу.
      </p>
    </div>
  );
}
