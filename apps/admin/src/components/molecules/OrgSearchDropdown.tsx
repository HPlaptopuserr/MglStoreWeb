"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Building2,
  ChevronDown,
  Check,
  X,
  Loader2,
} from "lucide-react";

export type OrgOption = {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string | null;
};

interface OrgSearchDropdownProps {
  /** List of organizations to display */
  orgs: OrgOption[];
  /** Currently selected organization id */
  value: string;
  /** Callback when an organization is selected */
  onChange: (orgId: string) => void;
  /** Whether the data is loading */
  loading?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Label above the dropdown */
  label?: string;
}

export function OrgSearchDropdown({
  orgs,
  value,
  onChange,
  loading = false,
  placeholder = "Байгууллага сонгох...",
  className = "",
  label,
}: OrgSearchDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [dropdownRect, setDropdownRect] = useState({
    left: 0,
    top: 0,
    width: 320,
    maxHeight: 360,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOrg = useMemo(
    () => orgs.find((o) => o.id === value) ?? null,
    [orgs, value],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return orgs;
    const q = search.toLowerCase();
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.slug?.toLowerCase().includes(q) ?? false),
    );
  }, [orgs, search]);

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered.length]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateDropdownPosition = useCallback(() => {
    const trigger = containerRef.current?.querySelector("[data-org-trigger]");
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const margin = 16;
    const availableBelow = window.innerHeight - rect.bottom - margin;
    const availableAbove = rect.top - margin;
    const openUp = availableBelow < 260 && availableAbove > availableBelow;
    const maxHeight = Math.max(240, Math.min(420, openUp ? availableAbove - 8 : availableBelow - 8));

    setDropdownRect({
      left: Math.min(rect.left, window.innerWidth - rect.width - margin),
      top: openUp ? Math.max(margin, rect.top - maxHeight - 8) : rect.bottom + 8,
      width: rect.width,
      maxHeight,
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideTrigger && !insideDropdown) {
        setOpen(false);
        setSearch("");
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      updateDropdownPosition();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open, updateDropdownPosition]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-org-item]");
    items[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  const handleSelect = useCallback(
    (orgId: string) => {
      onChange(orgId);
      setOpen(false);
      setSearch("");
    },
    [onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlightIndex]) {
          handleSelect(filtered[highlightIndex].id);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setSearch("");
        break;
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
    setOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(/\s+/)
      .map((w) => w.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        {label && (
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" />
          Ачаалж байна...
        </div>
      </div>
    );
  }

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      className="fixed z-[9999] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/12 ring-1 ring-black/5"
      style={{
        left: dropdownRect.left,
        top: dropdownRect.top,
        width: dropdownRect.width,
        maxHeight: dropdownRect.maxHeight,
        animation: "orgDropFade 150ms ease-out",
      }}
    >
      <div className="relative border-b border-slate-100 bg-white px-3 py-3">
        <Search
          size={15}
          className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Нэр, slug-аар хайх..."
          className="w-full rounded-xl bg-slate-50 py-2.5 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:bg-slate-100"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-6 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-600"
            aria-label="Хайлт цэвэрлэх"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {search
            ? `${filtered.length} / ${orgs.length} олдлоо`
            : `${orgs.length} байгууллага`}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => handleSelect("")}
            className="text-[11px] font-bold text-violet-600 transition-colors hover:text-violet-800"
          >
            Цэвэрлэх
          </button>
        )}
      </div>

      <div
        ref={listRef}
        className="overflow-y-auto overscroll-contain bg-white"
        style={{ maxHeight: Math.max(160, dropdownRect.maxHeight - 104) }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-9 text-center">
            <Building2 size={30} className="text-slate-200" />
            <p className="text-sm font-semibold text-slate-400">
              {search ? `"${search}" хайлтад тохирох илэрц байхгүй` : "Байгууллага байхгүй"}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs font-semibold text-violet-600 hover:underline"
              >
                Хайлтыг цэвэрлэх
              </button>
            )}
          </div>
        ) : (
          filtered.map((org, idx) => {
            const isSelected = org.id === value;
            const isHighlighted = idx === highlightIndex;

            return (
              <button
                key={org.id}
                type="button"
                data-org-item
                onClick={() => handleSelect(org.id)}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "bg-violet-50"
                    : isHighlighted
                      ? "bg-slate-50"
                      : "hover:bg-slate-50"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black shadow-sm transition-colors ${
                    isSelected
                      ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {org.logoUrl ? (
                    <img
                      src={org.logoUrl}
                      alt=""
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : (
                    getInitials(org.name)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-bold ${
                      isSelected ? "text-violet-700" : "text-slate-800"
                    }`}
                  >
                    {org.name}
                  </p>
                  {org.slug && (
                    <p className="truncate text-xs font-medium text-slate-400">
                      @{org.slug}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <Check size={17} className="shrink-0 text-violet-500" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </label>
      )}

      {/* Trigger */}
      <div className="relative">
        <button
          data-org-trigger
          type="button"
          onClick={() => setOpen((v) => !v)}
          onKeyDown={handleKeyDown}
          className={`group relative flex w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left transition-all duration-200 ${
            open
              ? "border-violet-400 ring-2 ring-violet-100 shadow-md"
              : value
                ? "border-slate-200 hover:border-violet-300 hover:shadow-sm"
                : "border-slate-200 hover:border-slate-300"
          }`}
        >
          {selectedOrg ? (
            <>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-[10px] font-bold shadow-sm">
                {selectedOrg.logoUrl ? (
                  <img
                    src={selectedOrg.logoUrl}
                    alt=""
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  getInitials(selectedOrg.name)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {selectedOrg.name}
                </p>
                {selectedOrg.slug && (
                  <p className="truncate text-[11px] text-slate-400">
                    @{selectedOrg.slug}
                  </p>
                )}
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === "Enter" && handleClear(e as any)}
                className="shrink-0 rounded-md p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 cursor-pointer"
                title="Цэвэрлэх"
              >
                <X size={14} />
              </div>
            </>
          ) : (
            <>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <Building2 size={16} />
              </div>
              <span className="flex-1 text-sm text-slate-400">{placeholder}</span>
            </>
          )}
          <ChevronDown
            size={14}
            className={`shrink-0 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {mounted && dropdown ? createPortal(dropdown, document.body) : null}
      </div>

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes orgDropFade {
          from {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
