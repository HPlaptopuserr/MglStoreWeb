"use client";
import { useMemo, useRef, useState } from "react";
import type { WarehouseDispatchDocument } from "@mgl/types";
import type { DispatchLineItem } from "./DispatchItemsSection";
import type { WarehouseInventorySearchItem } from "./WarehouseProductSearch";
import type { DispatchDestination } from "./types";
import { createDispatch } from "./dispatch-api";

const emptyDestination = (): DispatchDestination => ({
  storeName: "",
  recipientName: "",
  recipientPhone: "",
  address: "",
  lat: null,
  lng: null,
});

export function useManualDispatch(warehouseId: string) {
  const [items, setItems] = useState<DispatchLineItem[]>([]);
  const [destination, setDestination] =
    useState<DispatchDestination>(emptyDestination);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [created, setCreated] = useState<WarehouseDispatchDocument | null>(
    null,
  );
  const [historyKey, setHistoryKey] = useState(0);
  const busy = useRef(false);
  const requestId = useRef<string | null>(null);
  const selectedProductIds = useMemo(
    () => new Set(items.map((item) => item.productId)),
    [items],
  );
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const itemError = !items.length
    ? "Эхлээд гаргах бараагаа сонгоно уу."
    : items.some(
          (item) =>
            item.quantity > item.available ||
            !Number.isSafeInteger(item.quantity) ||
            item.quantity < 1,
        )
      ? "Барааны тоо ширхэг болон агуулахын үлдэгдлийг шалгана уу."
      : items.some((item) => item.unitPrice <= 0)
        ? "Үнэ тохируулаагүй барааны үнийг эхлээд бүртгэнэ үү."
        : "";
  const recipientError =
    !destination.storeName.trim() ||
    !destination.recipientName.trim() ||
    !destination.recipientPhone.trim()
      ? "Дэлгүүрийн нэр, хүлээн авагчийн нэр болон утсаа оруулна уу."
      : !/^[+\d\s()-]+$/.test(destination.recipientPhone) ||
          !/^\d{8,15}$/.test(destination.recipientPhone.replace(/\D/g, ""))
        ? "Хүлээн авагчийн утасны дугаараа шалгана уу."
        : "";
  const add = (inv: WarehouseInventorySearchItem) =>
    setItems((current) =>
      current.some((item) => item.productId === inv.product.id)
        ? current
        : [
            ...current,
            {
              productId: inv.product.id,
              name: inv.product.name,
              sku: inv.product.sku,
              imageUrl: inv.product.images?.[0]?.url ?? null,
              unitPrice: Number(inv.product.price) || 0,
              available: inv.quantity,
              quantity: 1,
            },
          ],
    );
  const submit = async () => {
    if (busy.current || itemError || recipientError) return;
    busy.current = true;
    setSaving(true);
    setError("");
    requestId.current ??= crypto.randomUUID();
    try {
      const record = await createDispatch(warehouseId, {
        ...destination,
        reason,
        note,
        requestId: requestId.current,
        items: items.map(({ productId, quantity }) => ({
          productId,
          quantity,
        })),
      });
      setCreated(record);
      setItems([]);
      setDestination(emptyDestination());
      setReason("");
      setNote("");
      setStep(1);
      setConfirmOpen(false);
      requestId.current = null;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Бараа гаргалтыг бүртгэж чадсангүй.",
      );
      setConfirmOpen(false);
    } finally {
      busy.current = false;
      setSaving(false);
      setHistoryKey((value) => value + 1);
    }
  };
  return {
    items,
    destination,
    setDestination,
    reason,
    setReason,
    note,
    setNote,
    step,
    setStep,
    saving,
    error,
    confirmOpen,
    setConfirmOpen,
    created,
    historyKey,
    selectedProductIds,
    quantity,
    total,
    itemError,
    recipientError,
    add,
    submit,
    updateQuantity: (id: string, quantity: number) => {
      if (Number.isSafeInteger(quantity) && quantity > 0)
        setItems((current) =>
          current.map((item) =>
            item.productId === id ? { ...item, quantity } : item,
          ),
        );
    },
    remove: (id: string) =>
      setItems((current) => current.filter((item) => item.productId !== id)),
  };
}
