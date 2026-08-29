"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface SearchableSelectOption {
  value: string;
  label: string;
  keywords?: string;
}

interface SearchableSelectProps {
  ariaLabel: string;
  options: readonly SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}

interface MenuPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  openAbove: boolean;
}

const normalize = (value: string) => value.toLocaleLowerCase("mn-MN").trim();

export function SearchableSelect({
  ariaLabel,
  options,
  value,
  onChange,
  placeholder = "Сонгох",
  searchPlaceholder = "Ангилал хайх...",
  emptyText = "Тохирох ангилал олдсонгүй",
}: SearchableSelectProps) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      normalize(`${option.label} ${option.keywords ?? ""}`).includes(
        normalizedQuery,
      ),
    );
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportPadding = 16;
      const gap = 8;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openAbove = spaceBelow < 260 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        180,
        Math.min(360, (openAbove ? spaceAbove : spaceBelow) - gap),
      );

      setMenuPosition({
        left: Math.max(
          viewportPadding,
          Math.min(rect.left, window.innerWidth - rect.width - viewportPadding),
        ),
        top: openAbove ? rect.top - gap : rect.bottom + gap,
        width: Math.min(rect.width, window.innerWidth - viewportPadding * 2),
        maxHeight,
        openAbove,
      });
    };

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    updatePosition();
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    requestAnimationFrame(() => searchRef.current?.focus());

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => setActiveIndex(0), [query]);

  const close = () => {
    setIsOpen(false);
    setQuery("");
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const selectOption = (option: SearchableSelectOption) => {
    onChange(option.value);
    close();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (!filteredOptions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(current + 1, filteredOptions.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectOption(filteredOptions[activeIndex]);
    }
  };

  const menu = isOpen && menuPosition && (
    <div
      ref={menuRef}
      className="fixed z-[160] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
      style={{
        left: menuPosition.left,
        top: menuPosition.openAbove ? undefined : menuPosition.top,
        bottom: menuPosition.openAbove
          ? window.innerHeight - menuPosition.top
          : undefined,
        width: menuPosition.width,
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="sticky top-0 border-b border-slate-100 bg-white p-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100">
          <Search
            className="h-4 w-4 shrink-0 text-slate-400"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            aria-label={searchPlaceholder}
            aria-controls={listboxId}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              aria-label="Хайлтыг цэвэрлэх"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 px-1 text-xs font-medium text-slate-400">
          {filteredOptions.length} ангилал
        </p>
      </div>
      <div
        id={listboxId}
        role="listbox"
        className="overscroll-contain p-2"
        style={{ maxHeight: menuPosition.maxHeight, overflowY: "auto" }}
        data-lenis-prevent
      >
        {filteredOptions.length ? (
          filteredOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
                className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${isActive ? "bg-indigo-50 text-indigo-800" : "text-slate-700 hover:bg-slate-50"}`}
              >
                <span className="leading-5">{option.label}</span>
                {isSelected && (
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })
        ) : (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-900 transition hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
      >
        <span className={selected ? "line-clamp-2" : "text-slate-400"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {typeof document !== "undefined" && menu
        ? createPortal(menu, document.body)
        : null}
    </>
  );
}
