"use client";
import { useEffect, useRef, useState } from "react";
import { normalizePosMeasureUnit, type StocktakeLineDto } from "@mgl/types";
import { parseCount, storedQuantity } from "./stocktake-model";

export function StocktakeQuantityInput({
  line,
  focused,
  onChange,
}: {
  line: StocktakeLineDto;
  focused: boolean;
  onChange: (counted: number | null) => void;
}) {
  const formatted =
    line.counted === null
      ? ""
      : String(storedQuantity(line.counted, line.unit));
  const [value, setValue] = useState(formatted);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setValue(formatted);
  }, [formatted]);
  useEffect(() => {
    if (focused) {
      input.current?.focus();
      input.current?.select();
    }
  }, [focused]);
  return (
    <>
      <input
        ref={input}
        type="text"
        inputMode={
          normalizePosMeasureUnit(line.unit) === "kg" ? "decimal" : "numeric"
        }
        aria-label={`${line.name} бодит тоо`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `count-error-${line.id}` : undefined}
        value={value}
        placeholder="Тоолоогүй"
        onChange={(event) => {
          try {
            const counted = parseCount(event.target.value, line.unit);
            setValue(event.target.value);
            setError("");
            onChange(counted);
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Тоо хэмжээг шалгана уу.",
            );
          }
        }}
        className="w-28 rounded-md border border-transparent bg-transparent px-2 py-1 text-right tabular-nums hover:border-slate-300 focus:border-blue-500 focus:outline-none"
      />
      {error && (
        <p
          id={`count-error-${line.id}`}
          role="alert"
          className="mt-1 max-w-48 text-xs text-rose-700"
        >
          {error}
        </p>
      )}
    </>
  );
}
