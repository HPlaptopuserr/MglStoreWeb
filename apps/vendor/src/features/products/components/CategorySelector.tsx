"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, X, Search, Layers } from "lucide-react";
import { BusinessCategory } from "../types";

interface Props {
  categories: BusinessCategory[];
  value: string;
  onChange: (id: string) => void;
}

export function CategorySelector({ categories, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const findLabel = (cats: BusinessCategory[], id: string): string => {
    for (const c of cats) {
      if (c.id === id) return c.name;
      if (c.children) {
        const found = findLabel(c.children, id);
        if (found) return found;
      }
    }
    return "";
  };

  const selectedLabel = value ? findLabel(categories, value) : "";

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filterCategories = (cats: BusinessCategory[], query: string): BusinessCategory[] => {
    if (!query) return cats;
    
    return cats.reduce((acc: BusinessCategory[], cat) => {
      const matches = cat.name.toLowerCase().includes(query.toLowerCase());
      const filteredChildren = cat.children ? filterCategories(cat.children, query) : [];
      
      if (matches || filteredChildren.length > 0) {
        acc.push({ ...cat, children: filteredChildren });
      }
      return acc;
    }, []);
  };

  const filteredCategories = filterCategories(categories, search);

  const renderNode = (cat: BusinessCategory, depth = 0) => {
    const hasChildren = cat.children && cat.children.length > 0;
    // Auto-expand if searching
    const isExpanded = search ? true : expanded.has(cat.id);
    const isSelected = value === cat.id;

    return (
      <div key={cat.id}>
        <button
          type="button"
          onClick={() => {
            if (hasChildren && !search) toggleExpand(cat.id);
            else {
              onChange(cat.id);
              setOpen(false);
              setSearch("");
            }
          }}
          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all text-left ${
            isSelected 
              ? "bg-indigo-50/80 font-semibold text-indigo-700" 
              : "text-slate-700 hover:bg-slate-50"
          }`}
          style={{ paddingLeft: `${16 + depth * 20}px` }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            ) : (
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            )
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          
          <span className="flex-1">{cat.name}</span>
          
          {isSelected && <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />}
        </button>
        {hasChildren && isExpanded && (
          <div className="border-l border-slate-100 ml-[22px]">
            {cat.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 h-12 px-4 rounded-xl border text-sm transition-all outline-none ${
          open
            ? "border-indigo-500 ring-4 ring-indigo-500/10 bg-white"
            : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Layers size={18} className={selectedLabel ? "text-indigo-500" : "text-slate-400"} />
          <span className={`truncate ${selectedLabel ? "text-slate-900 font-medium" : "text-slate-500"}`}>
            {selectedLabel || "Ангилал сонгох..."}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                className="w-full h-9 pl-9 pr-3 rounded-lg border-none bg-white text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 transition-shadow"
                placeholder="Ангилал хайх..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          <div className="max-h-72 overflow-y-auto py-1 custom-scrollbar">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <X size={14} className="text-slate-400" />
              Ангилалгүй
            </button>
            
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => renderNode(cat))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Ангилал олдсонгүй
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
