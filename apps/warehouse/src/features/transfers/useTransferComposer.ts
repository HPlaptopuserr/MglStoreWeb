"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  requestError,
  transferRequest,
  TransferRequestError,
} from "./transfer-api";
import type {
  SendItem,
  TransferDocument,
  TransferStock,
  WarehouseOption,
} from "./transfer-types";
interface PendingTransfer {
  id: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  note: string;
  items: { productId: string; quantity: number }[];
}
export function useTransferComposer(sourceId: string, onSent: () => void) {
  const [inventory, setInventory] = useState<TransferStock[]>([]);
  const [destinations, setDestinations] = useState<WarehouseOption[]>([]);
  const [destinationId, setDestinationId] = useState("");
  const [items, setItems] = useState<SendItem[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingTransfer | null>(null);
  const submitting = useRef(false);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const [detail, options] = await Promise.all([
          transferRequest<TransferStock[]>(
            `/warehouse-transfers/inventory?sourceWarehouseId=${encodeURIComponent(sourceId)}`,
            { signal },
          ),
          transferRequest<WarehouseOption[]>(
            `/warehouse-transfers/destinations?sourceWarehouseId=${encodeURIComponent(sourceId)}`,
            { signal },
          ),
        ]);
        if (signal?.aborted) return;
        setInventory(detail);
        setDestinations(options);
        setDestinationId((current) =>
          options.some((option) => option.id === current)
            ? current
            : (options[0]?.id ?? ""),
        );
      } catch (error) {
        if (!signal?.aborted) setError(requestError(error));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [sourceId],
  );
  useEffect(() => {
    const controller = new AbortController();
    try {
      const saved = sessionStorage.getItem(`warehouse-transfer:${sourceId}`);
      if (saved) {
        const parsed = JSON.parse(saved) as PendingTransfer;
        if (
          parsed.sourceWarehouseId === sourceId &&
          Array.isArray(parsed.items)
        )
          setPending(parsed);
      }
    } catch {
      setError("Хадгалсан хүсэлтийг сэргээж чадсангүй");
    }
    void refresh(controller.signal);
    return () => controller.abort();
  }, [sourceId, refresh]);
  const send = async () => {
    if (submitting.current) return false;
    submitting.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = pending ?? {
        id: crypto.randomUUID(),
        sourceWarehouseId: sourceId,
        destinationWarehouseId: destinationId,
        note,
        items: items.map(({ productId, quantity }) => ({
          productId,
          quantity,
        })),
      };
      sessionStorage.setItem(
        `warehouse-transfer:${sourceId}`,
        JSON.stringify(payload),
      );
      setPending(payload);
      await transferRequest<TransferDocument>("/warehouse-transfers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      sessionStorage.removeItem(`warehouse-transfer:${sourceId}`);
      setPending(null);
      setItems([]);
      setNote("");
      setMessage(
        "Илгээгдлээ. Очих агуулах падааныг баталсны дараа үлдэгдэлд нэмэгдэнэ.",
      );
      onSent();
      await refresh();
      return true;
    } catch (error) {
      if (
        error instanceof TransferRequestError &&
        [400, 403, 404, 409].includes(error.status)
      ) {
        sessionStorage.removeItem(`warehouse-transfer:${sourceId}`);
        setPending(null);
      }
      setError(requestError(error));
      return false;
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const valid = Boolean(
    destinationId &&
    items.length &&
    items.every(
      (item) =>
        Number.isSafeInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= item.available,
    ),
  );
  return {
    inventory,
    destinations,
    destinationId,
    setDestinationId,
    items,
    setItems,
    note,
    setNote,
    error,
    message,
    loading,
    busy,
    pending,
    send,
    refresh,
    valid,
  };
}
