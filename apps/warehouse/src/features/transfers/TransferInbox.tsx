"use client";
import { useState } from "react";
import { useTransferResource } from "./useTransferResource";
import { TransferReceiptReview } from "./TransferReceiptReview";
import type { TransferDocument } from "./transfer-types";
export function TransferInbox({
  warehouseId,
  revision = 0,
}: {
  warehouseId: string;
  revision?: number;
}) {
  const [direction, setDirection] = useState<"incoming" | "outgoing">(
    "incoming",
  );
  const [status, setStatus] = useState<"SENT" | "RECEIVED">("SENT");
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const { data, loading, error, refresh } = useTransferResource<
    TransferDocument[]
  >(
    `/warehouse-transfers?warehouseId=${encodeURIComponent(warehouseId)}&direction=${direction}&status=${status}&revision=${revision}`,
  );
  const documents = data ?? [];
  if (selected)
    return (
      <TransferReceiptReview
        key={selected}
        id={selected}
        warehouseId={warehouseId}
        onClose={() => setSelected("")}
        onReceived={() => {
          setSelected("");
          refresh();
          setMessage("Падаан батлагдаж, бараа агуулахын үлдэгдэлд нэмэгдлээ.");
        }}
      />
    );
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-lg font-semibold">Шилжүүлгийн падаан</h2>
        <label>
          <span className="sr-only">Чиглэл</span>
          <select
            value={direction}
            onChange={(event) =>
              setDirection(event.target.value as "incoming" | "outgoing")
            }
            className="rounded-lg border border-slate-200 bg-white p-2"
          >
            <option value="incoming">Ирсэн / хүлээн авах</option>
            <option value="outgoing">Илгээсэн</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Төлөв</span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "SENT" | "RECEIVED")
            }
            className="rounded-lg border border-slate-200 bg-white p-2"
          >
            <option value="SENT">Хүлээн авах хүлээгдэж буй</option>
            <option value="RECEIVED">Хүлээн авсан</option>
          </select>
        </label>
        <button
          onClick={refresh}
          className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"
        >
          Шинэчлэх
        </button>
      </div>
      {message && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-emerald-700"
        >
          {message}
        </p>
      )}
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </p>
      ) : loading ? (
        <p role="status">Падаан ачаалж байна…</p>
      ) : !documents.length ? (
        <p className="rounded-xl border border-slate-200 border-dashed p-8 text-center text-slate-500">
          Энэ төлөвтэй падаан байхгүй.
        </p>
      ) : (
        <div className="space-y-3">
          {documents.map((document) => (
            <article
              key={document.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div>
                <h3 className="font-medium">
                  {document.sourceWarehouse.name} →{" "}
                  {document.destinationWarehouse.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {document.items.length} нэр төрөл ·{" "}
                  {document.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                  ш · {new Date(document.sentAt).toLocaleString("mn-MN")}
                </p>
                <p className="break-all text-xs text-slate-400">
                  {document.id}
                </p>
              </div>
              {direction === "incoming" && document.status === "SENT" ? (
                <button
                  onClick={() => setSelected(document.id)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Тулгаж хүлээн авах
                </button>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                  {document.status === "SENT"
                    ? "Хүлээн авах хүлээгдэж буй"
                    : "Хүлээн авсан"}
                </span>
              )}
            </article>
          ))}
        </div>
      )}
      {documents.length === 100 && (
        <p className="text-sm text-amber-700">
          Эхний 100 падааныг харуулж байна.
        </p>
      )}
    </section>
  );
}
