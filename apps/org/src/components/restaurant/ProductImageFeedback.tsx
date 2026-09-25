"use client";

import { ImageOff, RefreshCw } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_IMAGE_FAILURE,
  diagnoseProductImageFailure,
  type ProductImageFailure,
} from "@/lib/product-image-feedback";

interface ProductImageFeedbackContextValue {
  attempt: number;
  failures: ReadonlyMap<string, ProductImageFailure>;
  reportFailure: (src: string) => void;
  reportSuccess: (src: string) => void;
  retry: () => void;
}

const ProductImageFeedbackContext =
  createContext<ProductImageFeedbackContextValue | null>(null);

export function ProductImageFeedbackProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [attempt, setAttempt] = useState(0);
  const [failures, setFailures] = useState<
    ReadonlyMap<string, ProductImageFailure>
  >(new Map());
  const requests = useRef(new Map<string, AbortController>());

  const cancelRequests = useCallback(() => {
    for (const controller of requests.current.values()) controller.abort();
    requests.current.clear();
  }, []);

  useEffect(() => cancelRequests, [cancelRequests]);

  const reportFailure = useCallback((src: string) => {
    // Menu and cart can render the same image. Diagnose each source only once
    // per retry, without automatic retry storms during a storage outage.
    if (requests.current.has(src)) return;
    const controller = new AbortController();
    requests.current.set(src, controller);
    setFailures((previous) =>
      new Map(previous).set(src, DEFAULT_IMAGE_FAILURE),
    );
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    void diagnoseProductImageFailure(src, controller.signal)
      .then((failure) => {
        if (
          controller.signal.aborted ||
          requests.current.get(src) !== controller
        )
          return;
        setFailures((previous) => {
          if (!previous.has(src)) return previous;
          return new Map(previous).set(src, failure);
        });
      })
      .finally(() => window.clearTimeout(timeout));
  }, []);

  const reportSuccess = useCallback((src: string) => {
    requests.current.get(src)?.abort();
    requests.current.delete(src);
    setFailures((previous) => {
      if (!previous.has(src)) return previous;
      const next = new Map(previous);
      next.delete(src);
      return next;
    });
  }, []);

  const retry = useCallback(() => {
    cancelRequests();
    setFailures(new Map());
    setAttempt(Date.now());
  }, [cancelRequests]);

  const value = useMemo(
    () => ({ attempt, failures, reportFailure, reportSuccess, retry }),
    [attempt, failures, reportFailure, reportSuccess, retry],
  );

  return (
    <ProductImageFeedbackContext.Provider value={value}>
      {children}
    </ProductImageFeedbackContext.Provider>
  );
}

export function useProductImageFeedback() {
  const context = useContext(ProductImageFeedbackContext);
  if (!context)
    throw new Error("Product images require ProductImageFeedbackProvider");
  return context;
}

export function ProductImageNotice({ className = "" }: { className?: string }) {
  const { failures, retry } = useProductImageFeedback();
  const errors = [...failures.values()];
  const failure =
    errors.find((error) => error.code?.startsWith("IMAGE_STORAGE_")) ??
    errors[0];
  if (!failure) return null;

  return (
    <aside
      className={`rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className="flex min-w-0 flex-1 items-start gap-2"
          role="status"
          aria-live="polite"
        >
          <ImageOff className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold">{failure.message}</p>
            <p className="mt-1 text-xs leading-5">
              Зургийг дахин ачаалах эсвэл ажилтанд мэдэгдэнэ үү.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={retry}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold text-amber-950 transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Зургийг дахин ачаалах
        </button>
      </div>
      <details className="mt-2 text-xs leading-5">
        <summary className="w-fit cursor-pointer rounded font-semibold focus-visible:outline-2 focus-visible:outline-amber-700">
          Админд зориулсан дэлгэрэнгүй
        </summary>
        <p className="mt-1">{failure.action}</p>
        {failure.code ? <p className="break-all">Код: {failure.code}</p> : null}
        {failure.requestId ? (
          <p className="break-all">Алдааны дугаар: {failure.requestId}</p>
        ) : null}
      </details>
    </aside>
  );
}
