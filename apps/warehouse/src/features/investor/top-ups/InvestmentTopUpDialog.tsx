"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatWarehouseInvestment } from "@mgl/types";
import { Modal } from "@/components/Modal";
import {
  useInvestmentTopUps,
  type InvestmentTopUp,
} from "./useInvestmentTopUps";
import { InvestmentTopUpDetails } from "./InvestmentTopUpDetails";

export function InvestmentTopUpDialog({
  warehouseId,
  warehouseName,
  onClose,
}: {
  warehouseId: string;
  warehouseName: string;
  onClose: () => void;
}) {
  const state = useInvestmentTopUps(warehouseId);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<InvestmentTopUp["method"]>("QR");
  const pending = state.items.find((item) => item.status === "PENDING");
  return (
    <Modal
      title="Хөрөнгө оруулалт цэнэглэх"
      description={`${warehouseName} · Төлбөр баталгаажмагц таны хөрөнгө оруулалтад нэмэгдэнэ.`}
      onClose={onClose}
    >
      <div className="mx-auto max-w-xl space-y-4">
        {state.error && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {state.error}
            <button
              type="button"
              onClick={() => void state.reload()}
              className="ml-3 underline"
            >
              Дахин ачаалах
            </button>
          </div>
        )}
        {state.message && (
          <p
            role="status"
            className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800"
          >
            {state.message}
          </p>
        )}
        {state.loading ? (
          <p
            role="status"
            className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"
          >
            <Loader2 className="size-5 animate-spin" />
            Цэнэглэлтийг ачаалж байна…
          </p>
        ) : pending ? (
          <InvestmentTopUpDetails
            item={pending}
            busy={state.busy}
            onCheck={() => void state.check(pending.id)}
          />
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void state.create(amount, method);
            }}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
          >
            <label className="block text-sm font-semibold text-slate-700">
              Цэнэглэх дүн (₮)
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                pattern="[0-9]+([.][0-9]{1,2})?"
                maxLength={15}
                placeholder="Жишээ: 100000"
                disabled={state.busy}
                className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 px-4 text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <fieldset disabled={state.busy} className="grid grid-cols-2 gap-3">
              <legend className="mb-2 text-sm font-semibold text-slate-700">
                Төлбөрийн арга
              </legend>
              {(
                [
                  { value: "QR", label: "QR төлбөр" },
                  { value: "BANK_TRANSFER", label: "Дансаар" },
                ] as const
              ).map((option) => (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="investment-payment-method"
                    value={option.value}
                    checked={method === option.value}
                    onChange={() => setMethod(option.value)}
                    className="peer sr-only"
                  />
                  <span className="block rounded-xl border border-slate-200 p-4 text-center text-sm font-semibold transition hover:border-blue-300 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500">
                    {option.label}
                  </span>
                </label>
              ))}
            </fieldset>
            <button
              type="submit"
              disabled={state.busy || !amount.trim()}
              className="min-h-11 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
            >
              {state.busy ? "Үүсгэж байна…" : "Үргэлжлүүлэх"}
            </button>
          </form>
        )}
        {state.items.some((item) => item.status === "PAID") && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold">Сүүлийн цэнэглэлтүүд</h3>
            <ul className="mt-3 divide-y divide-slate-100">
              {state.items
                .filter((item) => item.status === "PAID")
                .slice(0, 5)
                .map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap justify-between gap-2 py-3 text-sm"
                  >
                    <span className="font-semibold">
                      {formatWarehouseInvestment(item.amount)}
                    </span>
                    <span className="text-emerald-700">
                      Баталгаажсан ·{" "}
                      {new Date(
                        item.paidAt || item.createdAt,
                      ).toLocaleDateString("mn-MN", {
                        timeZone: "Asia/Ulaanbaatar",
                      })}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}
