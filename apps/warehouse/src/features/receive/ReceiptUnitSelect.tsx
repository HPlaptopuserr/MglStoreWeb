"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

const units = [
  { value: "pcs", label: "ш" },
  { value: "kg", label: "кг" },
  { value: "г", label: "г" },
  { value: "л", label: "л" },
  { value: "мл", label: "мл" },
  { value: "м", label: "м" },
  { value: "сав", label: "сав" },
  { value: "боодол", label: "боодол" },
  { value: "хайрцаг", label: "хайрцаг" },
  { value: "багц", label: "багц" },
];

interface Props {
  value: string;
  onChange: (unit: string) => void;
}

export function ReceiptUnitSelect({ value, onChange }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState(-1);
  const label = units.find((unit) => unit.value === value)?.label ?? value;
  const matches = units.filter(
    (unit) =>
      unit.label.includes(filter.trim().toLowerCase()) ||
      unit.value.includes(filter.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: Event) => {
      if (event.target instanceof Node && popup.current?.contains(event.target))
        return;
      popup.current?.hidePopover();
      setOpen(false);
      setActive(-1);
    };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  function close() {
    popup.current?.hidePopover();
    setOpen(false);
    setActive(-1);
  }
  function show() {
    const rect = input.current?.getBoundingClientRect();
    const element = popup.current;
    if (!rect || !element) return;
    const height = Math.min(280, window.innerHeight - 24);
    element.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 200))}px`;
    element.style.top = `${window.innerHeight - rect.bottom > height ? rect.bottom + 6 : Math.max(8, rect.top - height - 6)}px`;
    element.style.maxHeight = `${height}px`;
    element.showPopover();
    setOpen(true);
  }
  function select(unit: string) {
    onChange(unit);
    close();
    input.current?.focus();
  }

  return (
    <div className="relative w-28 min-w-28">
      <input
        ref={input}
        role="combobox"
        aria-label="Тоолох нэгж: сонгох эсвэл бичих"
        aria-expanded={open}
        aria-controls={id}
        aria-autocomplete="list"
        aria-activedescendant={
          open && active >= 0 ? `${id}-${active}` : undefined
        }
        value={label}
        maxLength={40}
        placeholder="Нэгж"
        autoComplete="off"
        onClick={() => {
          setFilter("");
          show();
        }}
        onChange={(event) => {
          const text = event.target.value;
          setFilter(text);
          setActive(-1);
          onChange(units.find((unit) => unit.label === text)?.value ?? text);
          show();
        }}
        onBlur={() => {
          close();
          onChange(value.trim());
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
              setFilter("");
              show();
            }
            setActive((index) =>
              Math.max(
                0,
                Math.min(
                  matches.length - 1,
                  index + (event.key === "ArrowDown" ? 1 : -1),
                ),
              ),
            );
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            if (active >= 0 && matches[active]) select(matches[active].value);
            else close();
          } else if (event.key === "Escape") {
            event.preventDefault();
            close();
          } else if (event.key === "Tab") close();
        }}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Нэгжийн жагсаалт нээх"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) close();
          else {
            input.current?.focus();
            setFilter("");
            show();
          }
        }}
        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center rounded-r-lg text-slate-400 hover:text-blue-600"
      >
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      <div
        ref={popup}
        id={id}
        popover="manual"
        role="listbox"
        aria-label="Тоолох нэгжүүд"
        className="fixed m-0 w-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-xl"
      >
        {matches.map((unit, index) => (
          <div
            key={unit.value}
            id={`${id}-${index}`}
            role="option"
            aria-selected={value === unit.value}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => select(unit.value)}
            className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 ${active === index || value === unit.value ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
          >
            {unit.label}
            {value === unit.value && <Check size={14} aria-hidden="true" />}
          </div>
        ))}
        <p className="border-t border-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-500">
          {matches.length === 0
            ? `“${label}” нэгжээр хадгалагдана.`
            : "Жагсаалтад байхгүй бол шууд бичнэ үү."}
        </p>
      </div>
    </div>
  );
}
