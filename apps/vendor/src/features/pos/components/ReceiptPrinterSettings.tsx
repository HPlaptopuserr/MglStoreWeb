"use client";

import { useEffect, useState } from "react";
import {
  readReceiptCompact,
  saveReceiptCompact,
  saveReceiptPageMode,
  type ReceiptPaperWidth,
} from "../utils/receipt-paper";

/** Shared settings apply to automatic checkout prints and history reprints. */
export function ReceiptPrinterSettings({
  paperWidthMm,
}: {
  paperWidthMm: ReceiptPaperWidth;
}) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    setCompact(readReceiptCompact());
  }, [paperWidthMm]);

  return (
    <div className="mt-2 space-y-1 text-xs text-slate-600">
      <button
        type="button"
        onClick={() => {
          saveReceiptPageMode("receipt");
          setCompact(true);
          saveReceiptCompact(true);
        }}
        className="min-h-9 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Нэг уртад тааруулах · {paperWidthMm} мм
      </button>
      <p>
        Барааны нэр бүтэн өргөнд жижиг үсгээр гарна. Баримт QR-тайгаа нэг уртаар
        хэвлэгдэнэ.
      </p>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={compact}
          onChange={(event) => {
            setCompact(event.target.checked);
            saveReceiptCompact(event.target.checked);
            if (event.target.checked) {
              saveReceiptPageMode("receipt");
            }
          }}
        />
        Илүү зайг багасгах
      </label>
      <p>
        Хэвлэх цонхонд: зөв принтер, 58/80 мм цаас, 100% хэмжээ, захгүй (None),
        толгой/хөлгүй (Headers and footers off) тохируулна уу.
      </p>
    </div>
  );
}
