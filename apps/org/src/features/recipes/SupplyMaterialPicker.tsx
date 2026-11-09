"use client";

import {
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import type { RecipeSupplyChoice } from "@mgl/types";

const units = { kg: "кг", l: "л", pcs: "ширхэг" };
type Props = {
  materials: readonly RecipeSupplyChoice[];
  value?: string;
  fallbackLabel?: string;
  label: string;
  disabled?: boolean;
  onChange: (id: string) => void;
};
const normalize = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase().trim();

export function SupplyMaterialPicker({
  materials,
  value,
  fallbackLabel,
  label,
  disabled,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollActiveRef = useRef(true);
  const listId = useId();
  const selected = materials.find((material) => material.id === value);
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const matches = materials.filter((material) =>
    terms.every((term) =>
      normalize(`${material.name} ${units[material.unit]}`).includes(term),
    ),
  );
  const activeIndex = Math.min(active, Math.max(0, matches.length - 1));

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const upward = below < 230 && above > below;
      const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 24);
      setPosition({
        position: "fixed",
        width,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        ...(upward
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
        maxHeight: Math.max(120, Math.min(360, upward ? above : below)),
      });
    };
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      )
        setOpen(false);
    };
    updatePosition();
    inputRef.current?.focus({ preventScroll: true });
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("resize", updatePosition);
    const repositionOnScroll = (event: Event) => {
      if (
        event.target instanceof Node &&
        listRef.current?.contains(event.target)
      )
        return;
      updatePosition();
    };
    window.addEventListener("scroll", repositionOnScroll, true);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", repositionOnScroll, true);
    };
  }, [open]);

  // Scroll only the options viewport. scrollIntoView also moves the recipe
  // dialog and page, which makes filtering and hovering appear to shake.
  useLayoutEffect(() => {
    if (!open || !scrollActiveRef.current) return;
    const list = listRef.current;
    const option = document.getElementById(`${listId}-${activeIndex}`);
    if (!list || !option) return;
    const bounds = list.getBoundingClientRect();
    const item = option.getBoundingClientRect();
    if (item.top < bounds.top) list.scrollTop -= bounds.top - item.top;
    else if (item.bottom > bounds.bottom)
      list.scrollTop += item.bottom - bounds.bottom;
  }, [activeIndex, listId, open, query, position]);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };
  const openPicker = () => {
    scrollActiveRef.current = true;
    setQuery("");
    setActive(
      Math.max(
        0,
        materials.findIndex((material) => material.id === value),
      ),
    );
    setOpen(true);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      scrollActiveRef.current = true;
      setActive(
        Math.max(
          0,
          Math.min(
            matches.length - 1,
            activeIndex + (event.key === "ArrowDown" ? 1 : -1),
          ),
        ),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (matches[activeIndex]) choose(matches[activeIndex].id);
    } else if (event.key === "Tab") setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-describedby={`${listId}-selection`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : openPicker())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openPicker();
          }
        }}
        className="flex min-h-11 w-full items-center justify-between gap-2 bg-white px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 disabled:opacity-50"
      >
        <span
          id={`${listId}-selection`}
          className={`min-w-0 break-words ${selected || fallbackLabel ? "" : "text-slate-500"}`}
        >
          {selected
            ? `${selected.name} (${units[selected.unit]})`
            : fallbackLabel
              ? `${fallbackLabel} — материал сонгоно уу`
              : "Хангамжаас материал сонгох"}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-slate-400"
        />
      </button>
      {open && (
        <div
          style={position}
          className="fixed z-50 flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-xl"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2">
            <Search
              aria-hidden="true"
              className="size-4 shrink-0 text-slate-400"
            />
            <input
              ref={inputRef}
              role="combobox"
              aria-label={`${label} хайх`}
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={
                matches.length ? `${listId}-${activeIndex}` : undefined
              }
              autoComplete="off"
              placeholder="Материалын нэрээр хайх…"
              value={query}
              onChange={(event) => {
                scrollActiveRef.current = true;
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              className="min-h-9 w-full min-w-0 bg-white text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <div
            ref={listRef}
            role="listbox"
            id={listId}
            aria-label={`${label} сонголтууд`}
            className="min-h-0 scroll-auto overflow-y-auto overscroll-contain p-1"
          >
            {matches.map((material, index) => (
              <button
                type="button"
                role="option"
                id={`${listId}-${index}`}
                key={material.id}
                aria-selected={material.id === value}
                tabIndex={-1}
                onPointerMove={() => {
                  scrollActiveRef.current = false;
                  setActive(index);
                }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(material.id)}
                className={`flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${index === activeIndex ? "bg-indigo-50 text-indigo-800" : "text-slate-700 hover:bg-slate-50"}`}
              >
                <span className="min-w-0 flex-1 break-words">
                  {material.name}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {units[material.unit]}
                </span>
                <Check
                  aria-hidden="true"
                  className={`size-4 shrink-0 text-indigo-600 ${material.id === value ? "" : "invisible"}`}
                />
              </button>
            ))}
            {matches.length === 0 && (
              <p
                role="status"
                className="px-3 py-6 text-center text-sm text-slate-500"
              >
                {materials.length
                  ? "Хайлтад тохирох материал олдсонгүй."
                  : "Энэ сарын хангамжид материал бүртгээгүй байна."}
              </p>
            )}
          </div>
          <div
            aria-live="polite"
            className="shrink-0 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400"
          >
            {matches.length} материал · ↑ ↓ сонгох · Enter батлах
          </div>
        </div>
      )}
    </div>
  );
}
