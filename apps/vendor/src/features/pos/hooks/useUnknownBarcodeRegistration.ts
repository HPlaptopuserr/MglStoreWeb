"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { findSharedProductsByBarcode } from "../api/product-registration";
import type { SharedCatalogSuggestion } from "../types/product-registration.types";

export function useUnknownBarcodeRegistration() {
  const [barcode, setBarcode] = useState("");
  const [suggestions, setSuggestions] = useState<SharedCatalogSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBarcode("");
    setSuggestions([]);
    setLookupError("");
    setLoading(false);
  }, []);

  const open = useCallback((nextBarcode: string) => {
    const normalized = nextBarcode.trim();
    if (!normalized) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBarcode(normalized);
    setSuggestions([]);
    setLookupError("");
    setLoading(true);

    findSharedProductsByBarcode(normalized, controller.signal)
      .then(setSuggestions)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLookupError(
          error instanceof Error ? error.message : "Нэгдсэн сангаас хайхад алдаа гарлаа",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    isOpen: Boolean(barcode),
    barcode,
    suggestions,
    loading,
    lookupError,
    open,
    close,
  };
}

