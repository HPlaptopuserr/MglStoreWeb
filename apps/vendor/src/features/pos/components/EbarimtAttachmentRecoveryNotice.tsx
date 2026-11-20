"use client";

import { useEffect, useState } from "react";
import {
  listEbarimtRecoveries,
  type EbarimtRecoveryItem,
} from "../utils/ebarimt-attachment-recovery";

type RecoveryState = {
  loading: boolean;
  error: string;
  items: EbarimtRecoveryItem[];
};

export function EbarimtRecoveryList({
  loading,
  error,
  items,
  onOpenHistory,
}: RecoveryState & { onOpenHistory: () => void }) {
  if (loading)
    return (
      <p role="status" className="mx-4 my-3 text-sm text-slate-600">
        eBarimt сэргээх мэдээллийг шалгаж байна…
      </p>
    );
  if (!error && items.length === 0) return null;
  return (
    <aside
      className="mx-4 my-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
      aria-label="eBarimt хүлээгдэж буй баримтууд"
    >
      <p className="font-semibold">
        eBarimt тулгаж шалгах баримтууд · {items.length}
      </p>
      {error && (
        <p role="alert" className="mt-2">
          {error}
        </p>
      )}
      <p className="mt-1">
        Төлбөрийг дахин авахгүй. Өмнөх PosAPI баримтыг дугаараар тулгаж шалгана
        уу. Эндээс давхар баримт үүсгэхгүй.
      </p>
      {items.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer font-semibold">
            Баримтын дугаар, төлөв харах
          </summary>
          <ul className="mt-2 max-h-64 space-y-2 overflow-auto">
            {items.map((item) => (
              <li
                key={item.saleId}
                className="rounded-lg border border-amber-200 bg-white p-3"
              >
                <p className="break-all font-semibold">{item.receiptNo}</p>
                <p>
                  {item.state === "READY"
                    ? "Баримт үүссэн · серверт хадгалах хүлээгдэж байна. Холболт сэргэхэд автоматаар хадгална."
                    : "Тулгаж шалгах шаардлагатай · PosAPI хүсэлтийн үр дүнг баталгаажуулаагүй."}
                </p>
                {item.error && <p className="mt-1">{item.error}</p>}
                <p className="mt-1 break-all text-xs">
                  Борлуулалтын ID: {item.saleId}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
      <button
        type="button"
        onClick={onOpenHistory}
        className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold"
      >
        Борлуулалтын түүх харах
      </button>
    </aside>
  );
}

export function EbarimtAttachmentRecoveryNotice({
  organizationId,
  onOpenHistory,
}: {
  organizationId: string;
  onOpenHistory: () => void;
}) {
  const [state, setState] = useState<RecoveryState>({
    loading: true,
    error: "",
    items: [],
  });
  useEffect(() => {
    const refresh = () => {
      try {
        setState({
          loading: false,
          error: "",
          items: listEbarimtRecoveries(organizationId),
        });
      } catch {
        setState({
          loading: false,
          error:
            "eBarimt сэргээх мэдээллийг хадгалах сангаас уншиж чадсангүй. Баримтын серверийн хадгалалтыг шалгана уу.",
          items: [],
        });
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 2_000);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", refresh);
    };
  }, [organizationId]);
  return <EbarimtRecoveryList {...state} onOpenHistory={onOpenHistory} />;
}
