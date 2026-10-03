"use client";

import { useState, type ComponentProps } from "react";
import {
  ReceiptLinesTable as SharedReceiptLinesTable,
  type ReceiptLine,
} from "@mgl/ui";
import { normalizePosMeasureUnit } from "@mgl/types";
import { WeightEntryInput } from "./WeightEntryInput";
import {
  displayWeight,
  weightInKilograms,
  displayWeightPrice,
  pricePerKilogram,
  type ReceiptWeightUnit,
} from "./receipt-weight";

type Props = ComponentProps<typeof SharedReceiptLinesTable>;
interface EntryUnits {
  quantity: ReceiptWeightUnit;
  price: ReceiptWeightUnit;
}
const defaultUnits: EntryUnits = { quantity: "kg", price: "kg" };
const isWeight = (line: ReceiptLine) =>
  normalizePosMeasureUnit(line.product.unit) === "kg";

export function ReceiptLinesTable(props: Props) {
  const [units, setUnits] = useState<Record<string, EntryUnits>>({});
  const entry = (id: string) => units[id] ?? defaultUnits;
  function setUnit(id: string, field: keyof EntryUnits, value: string) {
    if (value !== "kg" && value !== "g") return;
    setUnits((current) => ({
      ...current,
      [id]: { ...(current[id] ?? defaultUnits), [field]: value },
    }));
  }
  function priceInput(line: ReceiptLine, field: "unitCost" | "salePrice") {
    if (!isWeight(line)) return null;
    const unit = entry(line.id).price;
    const label = unit === "g" ? "г" : "кг";
    return (
      <div>
        <WeightEntryInput
          key={unit}
          label={`${line.product.name} ${field === "unitCost" ? "авсан" : "зарах"} үнэ / 1 ${label}`}
          value={
            line[field] === ""
              ? ""
              : String(displayWeightPrice(Number(line[field]), unit))
          }
          min={0}
          max={unit === "g" ? 1000000 : 1000000000}
          step="any"
          onChange={(value) =>
            props.onField(
              line.id,
              field,
              value === "" ? "" : String(pricePerKilogram(Number(value), unit)),
            )
          }
        />
        <p className="mt-1 text-right text-xs text-slate-500">₮ / 1 {label}</p>
      </div>
    );
  }
  return (
    <>
      {props.lines.some(isWeight) && (
        <p className="mb-3 rounded-lg bg-cyan-50 px-4 py-3 text-xs leading-relaxed text-cyan-800">
          Задгай барааны жин болон үнийн нэгжийг тусад нь сонгоно. Жишээ: 500 г
          × 20,000 ₮ / кг = 10,000 ₮.
        </p>
      )}
      <SharedReceiptLinesTable
        {...props}
        renderUnit={(line) =>
          !isWeight(line) ? null : (
            <div className="min-w-28 space-y-2">
              <label className="block text-xs text-slate-500">
                Жингийн нэгж
                <select
                  aria-label={`${line.product.name} жингийн нэгж`}
                  value={entry(line.id).quantity}
                  onChange={(event) =>
                    setUnit(line.id, "quantity", event.target.value)
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="kg">Килограмм (кг)</option>
                  <option value="g">Грамм (г)</option>
                </select>
              </label>
              <label className="block text-xs text-slate-500">
                Үнийн нэгж
                <select
                  aria-label={`${line.product.name} үнийн нэгж`}
                  value={entry(line.id).price}
                  onChange={(event) =>
                    setUnit(line.id, "price", event.target.value)
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="kg">1 кг тутамд</option>
                  <option value="g">1 г тутамд</option>
                </select>
              </label>
            </div>
          )
        }
        renderQuantity={(line) =>
          !isWeight(line) ? null : (
            <div>
              <WeightEntryInput
                key={entry(line.id).quantity}
                label={`${line.product.name} хүлээн авах жин`}
                value={String(
                  displayWeight(line.quantity, entry(line.id).quantity),
                )}
                min={entry(line.id).quantity === "g" ? 1 : 0.001}
                max={entry(line.id).quantity === "g" ? 1000000000 : 1000000}
                step={entry(line.id).quantity === "g" ? 1 : 0.001}
                onChange={(value) =>
                  props.onQuantity(
                    line.id,
                    weightInKilograms(Number(value), entry(line.id).quantity),
                  )
                }
              />
              <p className="mt-1 text-right text-xs text-slate-500">
                {entry(line.id).quantity === "g" ? "г" : "кг"}
              </p>
            </div>
          )
        }
        renderCost={(line) => priceInput(line, "unitCost")}
        renderSalePrice={(line) => priceInput(line, "salePrice")}
      />
    </>
  );
}
