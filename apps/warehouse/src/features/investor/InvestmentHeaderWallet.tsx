"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Wallet, X } from "lucide-react";
import { formatWarehouseInvestment } from "@mgl/types";
import { useWarehouseScope } from "@/features/warehouse-scope/WarehouseScopeProvider";
import { InvestmentWallet } from "./InvestmentWallet";
import { INVESTMENT_UPDATED_EVENT, useInvestmentSummary } from "./useInvestmentSummary";
import { InvestmentTopUpDialog } from "./top-ups/InvestmentTopUpDialog";
import { MonthlyDividendDialog } from "./dividends/MonthlyDividendDialog";

export function InvestmentHeaderWallet() {
  const { selectedWarehouseId, selectedWarehouse, viewerOnly } =
    useWarehouseScope();
  const { summary, loading, error, refresh } =
    useInvestmentSummary(selectedWarehouseId);
  const [open, setOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [dividendOpen, setDividendOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  if (!selectedWarehouseId) return null;
  return (
    <div ref={root} className="relative min-w-0">
      <button
        ref={trigger}
        type="button"
        aria-label="Хөрөнгө оруулалтын дүн, төлөв харах"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          if (!open) void refresh();
          setOpen(!open);
        }}
        className="inline-flex h-10 max-w-[48vw] items-center gap-1.5 sm:max-w-56 sm:gap-2 rounded-xl border border-blue-100 bg-blue-50 px-2 text-xs sm:px-3 sm:text-sm font-semibold tabular-nums text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin" />
        ) : (
          <Wallet className="size-4 shrink-0" />
        )}
        <span className="truncate">
          {error
            ? "Дүнг шалгах"
            : summary
              ? formatWarehouseInvestment(summary.amount)
              : "Дүн ачаалж байна…"}
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Хөрөнгө оруулалтын төлөв"
          className="fixed left-4 right-4 top-24 z-50 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-96"
        >
          <button
            ref={closeButton}
            type="button"
            aria-label="Хөрөнгө оруулалтын төлөвийг хаах"
            onClick={close}
            className={`absolute right-2 top-2 z-10 rounded-lg p-2 transition focus-visible:ring-2 focus-visible:ring-blue-400 ${summary && !error ? "text-blue-100 hover:bg-white/10" : "text-slate-500 hover:bg-slate-100"}`}
          >
            <X className="size-4" />
          </button>
          {error ? (
            <div role="alert" className="p-6 pr-12 text-sm text-red-700">
              <p>{error}</p>
              <button
                onClick={() => void refresh()}
                className="mt-3 font-semibold underline"
              >
                Дахин ачаалах
              </button>
            </div>
          ) : summary ? (
            <InvestmentWallet
              investment={summary}
              onDividend={
                viewerOnly && summary.monthlyDividend
                  ? () => {
                      setOpen(false);
                      setDividendOpen(true);
                    }
                  : undefined
              }
              onTopUp={
                viewerOnly
                  ? () => {
                      setOpen(false);
                      setTopUpOpen(true);
                    }
                  : undefined
              }
            />
          ) : (
            <div role="status" className="p-8 text-sm text-slate-500">
              Хөрөнгө оруулалтыг ачаалж байна…
            </div>
          )}
        </div>
      )}
      {topUpOpen && viewerOnly && selectedWarehouse && (
        <InvestmentTopUpDialog
          key={`wallet-top-up:${selectedWarehouseId}`}
          warehouseId={selectedWarehouseId}
          warehouseName={selectedWarehouse.name}
          onClose={() => {
            setTopUpOpen(false);
            trigger.current?.focus();
          }}
        />
      )}
      {dividendOpen && viewerOnly && summary?.monthlyDividend && (
        <MonthlyDividendDialog
          key={`wallet-dividend:${selectedWarehouseId}`}
          dividend={summary.monthlyDividend}
          warehouseId={selectedWarehouseId}
          onClose={() => {
            setDividendOpen(false);
            trigger.current?.focus();
          }}
          onConfirmed={() =>
            window.dispatchEvent(new Event(INVESTMENT_UPDATED_EVENT))
          }
        />
      )}
    </div>
  );
}
