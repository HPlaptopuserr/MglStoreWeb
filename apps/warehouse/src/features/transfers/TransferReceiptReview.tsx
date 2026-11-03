"use client";
import { useEffect, useRef, useState } from "react";
import { requestError, transferRequest } from "./transfer-api";
import { TransferConfirmDialog } from "./TransferConfirmDialog";
import { TransferReceiptTable } from "./TransferReceiptTable";
import { TransferPricingToolbar } from "./TransferPricingToolbar";
import {
  editReceiptLine,
  initialReceiptLine,
  isReceiptLineValid,
  markupPrice,
  receiptMoney,
} from "./transfer-receipt-model";
import type { AcceptanceLine, TransferDocument } from "./transfer-types";
export function TransferReceiptReview({
  id,
  warehouseId,
  onClose,
  onReceived,
}: {
  id: string;
  warehouseId: string;
  onClose: () => void;
  onReceived: () => void;
}) {
  const [document, setDocument] = useState<TransferDocument | null>(null);
  const [lines, setLines] = useState<AcceptanceLine[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [version, setVersion] = useState(0);
  const submitting = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setDocument(null);
    setError("");
    void transferRequest<TransferDocument>(
      `/warehouse-transfers/${encodeURIComponent(id)}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.items.some((row) => markupPrice(row.unitCost, 0) === "")) {
          throw new Error(
            "Илгээгчийн үнэ бүрэн ирсэнгүй. Дахин ачаална уу; үнэ иртэл падааныг батлах боломжгүй.",
          );
        }
        setDocument(data);
        setLines(data.items.map(initialReceiptLine));
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(requestError(error));
      });
    return () => controller.abort();
  }, [id, version]);
  const confirmedCount = lines.filter((line) => line.confirmed).length;
  const receivedTotal = lines.reduce(
    (sum, line) => sum + Number(line.quantity || 0),
    0,
  );
  const saleTotal = lines.reduce(
    (sum, line) =>
      sum + Number(line.quantity || 0) * Number(line.salePrice || 0),
    0,
  );
  const valid = Boolean(
    document &&
    lines.length === document.items.length &&
    lines.length > 0 &&
    lines.every((line) => {
      const row = document.items.find((row) => row.id === line.id);
      return row && line.confirmed && isReceiptLineValid(row, line);
    }),
  );
  const applyMarkup = (percent: number) => {
    setLines((current) =>
      current.map((line) => {
        const row = document?.items.find((row) => row.id === line.id);
        return !line.confirmed && row
          ? editReceiptLine(line, {
              salePrice: markupPrice(row.unitCost, percent),
            })
          : line;
      }),
    );
  };
  const accept = async () => {
    if (submitting.current || !valid) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await transferRequest(
        `/warehouse-transfers/${encodeURIComponent(id)}/receive`,
        {
          method: "POST",
          body: JSON.stringify({
            items: lines.map((line) => ({
              id: line.id,
              quantity: Number(line.quantity),
              salePrice: Number(line.salePrice),
              targetProductId:
                line.targetProductId === "NEW" ? null : line.targetProductId,
            })),
          }),
        },
      );
      onReceived();
    } catch (error) {
      setError(requestError(error));
    } finally {
      submitting.current = false;
      setBusy(false);
      setConfirm(false);
    }
  };
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Шилжүүлгийн орлогын баримт
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Бараа тулгаж хүлээн авах
          </h2>
          {document && (
            <p className="mt-2 text-sm text-slate-500">
              {document.sourceWarehouse.name} →{" "}
              {document.destinationWarehouse.name} ·{" "}
              {new Date(document.sentAt).toLocaleString("mn-MN")}
            </p>
          )}
        </div>
        <button
          disabled={busy}
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Буцах
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="mx-5 mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}{" "}
          <button
            disabled={busy}
            onClick={() => setVersion((value) => value + 1)}
            className="underline"
          >
            Дахин ачаалах
          </button>
        </p>
      )}
      {!document && !error && (
        <p role="status" className="p-6 text-slate-500">
          Падаан ачаалж байна…
        </p>
      )}
      {document && (
        <>
          {document.note && (
            <p className="mx-5 mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Тэмдэглэл: {document.note}
            </p>
          )}
          {document.status === "RECEIVED" ? (
            <p role="status" className="p-6 text-emerald-700">
              Энэ падааныг хүлээн авсан байна.
            </p>
          ) : (
            <>
              <p className="px-5 pb-4 text-sm text-slate-500">
                Хүлээн авсан тоо, зарах үнээ шалгаад мөр бүрийг батална уу. Тоо
                зөрвөл падаан батлагдахгүй.
              </p>
              <fieldset disabled={busy}>
                <TransferPricingToolbar
                  disabled={busy || confirmedCount === lines.length}
                  onApply={applyMarkup}
                />
                <TransferReceiptTable
                  key={version}
                  rows={document.items}
                  lines={lines}
                  warehouseId={warehouseId}
                  onChange={(next) =>
                    setLines((current) =>
                      current.map((line) =>
                        line.id === next.id ? next : line,
                      ),
                    )
                  }
                />
              </fieldset>
              <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
                Суурь үнэ = илгээсэн агуулахын зарах үнэ. Нэмэгдэл = суурь үнэ ×
                (1 + хувь / 100).
              </p>
              <div className="flex flex-wrap items-center justify-between gap-5 bg-slate-50 px-5 py-5">
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="text-slate-500">
                    Баталсан мөр
                    <strong className="mt-1 block text-base text-slate-900">
                      {confirmedCount} / {lines.length}
                    </strong>
                  </div>
                  <div className="text-slate-500">
                    Хүлээн авах
                    <strong className="mt-1 block text-base text-slate-900">
                      {receivedTotal} ш
                    </strong>
                  </div>
                  <div className="text-slate-500">
                    Нийт зарах дүн
                    <strong className="mt-1 block text-base text-slate-900">
                      {receiptMoney(saleTotal)} ₮
                    </strong>
                  </div>
                </div>
                <button
                  disabled={!valid || busy}
                  onClick={() => setConfirm(true)}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40"
                >
                  Падааныг баталж үлдэгдэлд нэмэх
                </button>
              </div>
              <p className="px-5 py-3 text-xs text-slate-500">
                Мөр батлах нь тулгалтыг тэмдэглэнэ. Падааныг эцэслэн зөвшөөрсний
                дараа бүх бараа үлдэгдэлд нэмэгдэнэ.
              </p>
            </>
          )}
        </>
      )}
      {confirm && document && (
        <TransferConfirmDialog
          title="Падааныг батлахдаа итгэлтэй байна уу?"
          description={`${document.sourceWarehouse.name}-аас ирсэн ${receivedTotal} ширхэг барааг ${document.destinationWarehouse.name}-ын үлдэгдэлд нэмнэ. Зарах үнэ хадгалагдана.`}
          busy={busy}
          onClose={() => setConfirm(false)}
          onConfirm={() => void accept()}
        />
      )}
    </section>
  );
}
