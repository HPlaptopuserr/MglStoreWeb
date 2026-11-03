"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { ProductHistory } from "./product-history.types";
import {
  ProductHistorySummary,
  ProductHistoryTable,
} from "./ProductHistoryDetails";
type RequestHistory = (url: string, init?: RequestInit) => Promise<Response>;
interface HistoryContextValue {
  api: string;
  request: RequestHistory;
  open: (id: string, name: string) => void;
}
const HistoryContext = createContext<HistoryContextValue | null>(null);

export function ProductHistoryProvider({
  api,
  request,
  children,
}: {
  api: string;
  request: RequestHistory;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(
    null,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const close = () => {
    setSelected(null);
    queueMicrotask(() => opener.current?.focus());
  };
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
  return (
    <HistoryContext.Provider
      value={{
        api,
        request,
        open: (id, name) => {
          opener.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          setSelected({ id, name });
        },
      }}
    >
      {children}
      {selected && (
        <dialog
          aria-label={`${selected.name} барааны түүх`}
          style={{ width: "min(1100px, 94vw)", maxHeight: "90vh" }}
          ref={dialog}
          onCancel={close}
          onClose={close}
          className="m-auto overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl backdrop:bg-slate-900/40 sm:p-6"
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900">
              {selected.name}
            </h2>
            <button
              type="button"
              autoFocus
              onClick={close}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Хаах
            </button>
          </div>
          <ProductHistoryPanel key={selected.id} productId={selected.id} />
        </dialog>
      )}
    </HistoryContext.Provider>
  );
}
export function ProductHistoryTrigger({
  productId,
  name,
}: {
  productId: string;
  name: string;
}) {
  const context = useContext(HistoryContext);
  if (!context || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(productId)) return null;
  return (
    <button
      type="button"
      aria-label={`${name} орлого, хөдөлгөөний түүх`}
      onClick={(event) => {
        event.stopPropagation();
        context.open(productId, name);
      }}
      className="mt-2 rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      Орлого, хөдөлгөөний түүх
    </button>
  );
}
export function ProductHistoryPanel({ productId }: { productId: string }) {
  const context = useContext(HistoryContext);
  const [stream, setStream] = useState("ledger");
  const [hasCafe, setHasCafe] = useState(false);
  return context ? (
    <>
      {hasCafe && (
        <div className="flex gap-2" aria-label="Түүхийн төрөл">
          {[
            ["ledger", "Үлдэгдлийн хөдөлгөөн"],
            ["cafe", "Өдрийн тооллогын орлого"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={stream === value}
              onClick={() => setStream(value)}
              className={`rounded-lg border border-slate-200 px-3 py-2 text-sm ${stream === value ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <HistoryContent
        key={`${context.api}:${productId}:${stream}`}
        api={context.api}
        request={context.request}
        productId={productId}
        stream={stream}
        onCafe={setHasCafe}
      />
    </>
  ) : null;
}
function HistoryContent({
  api,
  request,
  productId,
  stream,
  onCafe,
}: {
  api: string;
  request: RequestHistory;
  productId: string;
  stream: string;
  onCafe: (value: boolean) => void;
}) {
  const [data, setData] = useState<ProductHistory | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await request(
          `${api}/product-history/${encodeURIComponent(productId)}?stream=${stream}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
          { signal: controller.signal },
        );
        if (!response.ok)
          throw new Error(
            response.status === 403
              ? "Түүх харах эрхгүй байна."
              : "Түүх ачаалж чадсангүй.",
          );
        const result: ProductHistory = await response.json();
        if (!controller.signal.aborted) onCafe(result.hasCafeHistory);
        if (!controller.signal.aborted)
          setData((previous) => ({
            ...result,
            entries:
              cursor && previous
                ? [...previous.entries, ...result.entries]
                : result.entries,
          }));
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : "Алдаа гарлаа");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [api, request, productId, cursor, retry, stream, onCafe]);
  return (
    <section
      aria-label="Барааны түүх"
      className="my-5 space-y-4 border-t border-slate-100 pt-5"
    >
      <h3 className="text-lg font-semibold text-slate-900">
        Бүртгэл, орлого ба хөдөлгөөний түүх
      </h3>
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
        >
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              setError("");
              setLoading(true);
              setRetry((n) => n + 1);
            }}
            className="underline"
          >
            Дахин оролдох
          </button>
        </div>
      )}
      {loading && (
        <p role="status" className="animate-pulse text-sm text-slate-500">
          Түүх ачаалж байна…
        </p>
      )}
      {data && (
        <>
          <ProductHistorySummary data={data} />
          <ProductHistoryTable entries={data.entries} />
          {data.nextCursor && (
            <button
              type="button"
              disabled={loading || !!error}
              onClick={() => {
                setLoading(true);
                setCursor(data.nextCursor);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Өмнөх хөдөлгөөнүүд
            </button>
          )}
        </>
      )}
    </section>
  );
}
