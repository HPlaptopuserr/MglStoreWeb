"use client";

import { useEffect, useState } from "react";
import {
  readReceiptPageMode,
  readReceiptCompact,
  saveReceiptCompact,
  saveReceiptPageMode,
  type ReceiptPageMode,
  type ReceiptPaperWidth,
} from "../utils/receipt-paper";

/** Shared settings apply to automatic checkout prints and history reprints. */
export function ReceiptPrinterSettings({
  paperWidthMm,
}: {
  paperWidthMm: ReceiptPaperWidth;
}) {
  const [compact, setCompact] = useState(false);
  const [mode, setMode] = useState<ReceiptPageMode>("receipt");
  useEffect(() => {
    setMode(readReceiptPageMode());
    setCompact(readReceiptCompact());
  }, [paperWidthMm]);

  return (
    <div className="mt-2 space-y-1 text-xs text-slate-600">
      <button
        type="button"
        onClick={() => {
          setMode("printer");
          saveReceiptPageMode("printer");
          setCompact(false);
          saveReceiptCompact(false);
        }}
        className="min-h-9 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Принтерт тааруулах · {paperWidthMm} мм
      </button>
      <p>
        Баримтын зах тасарч байвал цаасны зөв өргөнийг сонгоод «Принтерт
        тааруулах»-ыг дарж, дахин хэвлэнэ үү.
      </p>
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
          <option value="receipt">Баримтын уртаар · Нэг хуудас</option>
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
        сонгоно уу. QR тусдаа хуудас руу тасарвал «Баримтын уртаар» горимыг
        сонгоно. Принтерийн цаасны горим драйверийн хуудасны уртаар тасарч
        болно.
      </p>
      <p>
        Хэвлэх цонхонд: зөв принтер, 58/80 мм цаас, 100% хэмжээ, захгүй (None),
        толгой/хөлгүй (Headers and footers off) тохируулна уу.
      </p>
    </div>
  );
}
