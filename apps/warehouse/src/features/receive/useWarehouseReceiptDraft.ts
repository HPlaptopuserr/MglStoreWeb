"use client";

import { useEffect, useRef, useState } from "react";
import type { ReceiveItem } from "./receipt-types";

export interface WarehouseReceiptDraft {
  items: ReceiveItem[];
  supplier: string;
  supplierRegisterNumber: string;
  supplierDocumentNumber: string;
  documentDate: string;
  note: string;
  productSearch: string;
  receiptFiles: File[];
  pendingReceiptId: string | null;
  hasStartedReceipt: boolean;
  step: 0 | 1 | 2;
}
export function openReceiptDraftDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("warehouse-receipt-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function useWarehouseReceiptDraft(
  warehouseId: string,
  draft: WarehouseReceiptDraft,
  restore: (draft: WarehouseReceiptDraft | null) => void,
) {
  const restoreRef = useRef(restore);
  useEffect(() => {
    restoreRef.current = restore;
  }, [restore]);
  const [readyKey, setReadyKey] = useState("");
  const [status, setStatus] = useState("");
  const database = useRef<IDBDatabase | null>(null);
  const scope = useRef("");
  const restoredWarehouse = useRef("");

  useEffect(() => {
    let cancelled = false;
    if (!warehouseId) return;
    void (async () => {
      try {
        const user = JSON.parse(localStorage.getItem("wms_user") || "{}");
        const key = `${user.id || user.userId || "current"}:${warehouseId}`;
        const db = await openReceiptDraftDatabase();
        if (cancelled) {
          db.close();
          return;
        }
        database.current = db;
        scope.current = key;
        const request = db
          .transaction("drafts", "readonly")
          .objectStore("drafts")
          .get(key);
        request.onsuccess = () => {
          if (cancelled) return;
          const saved = request.result as
            | { version: number; draft: WarehouseReceiptDraft }
            | undefined;
          if (
            saved &&
            (saved.version !== 1 || !Array.isArray(saved.draft?.items))
          ) {
            setStatus(
              "Хадгалсан нооргийг уншиж чадсангүй. Нооргийг дарж хадгалаагүй.",
            );
            return;
          }
          if (
            saved ||
            (restoredWarehouse.current &&
              restoredWarehouse.current !== warehouseId)
          ) {
            restoreRef.current(saved?.draft ?? null);
          }
          restoredWarehouse.current = warehouseId;
          setReadyKey(warehouseId);
          setStatus(saved ? "Хадгалсан нооргийг сэргээлээ." : "");
        };
        request.onerror = () =>
          setStatus("Ноорог сэргээж чадсангүй. Хуудсаа бүү хаагаарай.");
      } catch {
        if (!cancelled)
          setStatus("Ноорог хадгалах сан нээгдсэнгүй. Хуудсаа бүү хаагаарай.");
      }
    })();
    return () => {
      cancelled = true;
      database.current?.close();
      database.current = null;
    };
  }, [warehouseId]);

  useEffect(() => {
    if (!readyKey || readyKey !== warehouseId || !database.current) return;
    try {
      const transaction = database.current.transaction("drafts", "readwrite");
      const store = transaction.objectStore("drafts");
      const hasDraft =
        draft.hasStartedReceipt || draft.items.length || draft.pendingReceiptId;
      if (hasDraft) store.put({ version: 1, draft }, scope.current);
      else store.delete(scope.current);
      transaction.oncomplete = () =>
        setStatus(
          hasDraft
            ? "Ноорог болон хавсралтууд энэ төхөөрөмж дээр хадгалагдсан."
            : "",
        );
      transaction.onerror = () =>
        setStatus("Ноорог хадгалж чадсангүй. Хуудсаа бүү хаагаарай.");
      transaction.onabort = transaction.onerror;
    } catch {
      queueMicrotask(() => setStatus("Ноорог хадгалж чадсангүй. Хуудсаа бүү хаагаарай."));
    }
  }, [draft, readyKey, warehouseId]);
  return {
    status,
    restoring: Boolean(warehouseId && readyKey !== warehouseId),
  };
}
