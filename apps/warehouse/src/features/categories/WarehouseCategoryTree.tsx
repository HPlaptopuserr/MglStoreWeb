"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
} from "lucide-react";
import type { WarehouseCategory } from "./category.types";
import { categoryMatchesSearch, categoryPath } from "./category.utils";

type CategoryTreeNode = WarehouseCategory & {
  children: CategoryTreeNode[];
};

type WarehouseCategoryTreeProps = {
  categories: WarehouseCategory[];
  value: string;
  search: string;
  onChange: (categoryId: string) => void;
};

function buildCategoryTree(categories: WarehouseCategory[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>(
    categories.map((category) => [category.id, { ...category, children: [] }]),
  );
  const roots: CategoryTreeNode[] = [];

  nodes.forEach((node) => {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  const sortNodes = (items: CategoryTreeNode[]) => {
    items.sort((left, right) => left.name.localeCompare(right.name, "mn"));
    items.forEach((item) => sortNodes(item.children));
  };
  sortNodes(roots);
  return roots;
}

type CategoryTreeRowProps = {
  node: CategoryTreeNode;
  depth: number;
  selectedId: string;
  expandedIds: Set<string>;
  visibleIds: Set<string> | null;
  onToggle: (categoryId: string) => void;
  onSelect: (categoryId: string) => void;
};

function CategoryTreeRow({
  node,
  depth,
  selectedId,
  expandedIds,
  visibleIds,
  onToggle,
  onSelect,
}: CategoryTreeRowProps) {
  if (visibleIds && !visibleIds.has(node.id)) return null;

  const hasChildren = node.children.some(
    (child) => !visibleIds || visibleIds.has(child.id),
  );
  const expanded = hasChildren && expandedIds.has(node.id);
  const selected = node.id === selectedId;
  const levelLabel = depth === 0 ? "Үндсэн" : depth === 1 ? "Дэд" : "Sub";

  return (
    <div role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
      <div
        className={`group mb-1 flex min-h-11 items-center gap-1 rounded-xl border transition ${
          selected
            ? "border-blue-500 bg-blue-50 text-blue-900 shadow-sm"
            : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50"
        }`}
        style={{ marginLeft: `${depth * 18}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={`${node.name} ${expanded ? "хумих" : "дэлгэх"}`}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-9 shrink-0" aria-hidden="true" />
        )}

        <button
          type="button"
          onClick={() => (hasChildren ? onToggle(node.id) : onSelect(node.id))}
          className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left focus-visible:outline-none"
        >
          {expanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
          ) : (
            <Folder
              className={`h-4 w-4 shrink-0 ${
                depth === 0 ? "text-amber-500" : "text-blue-400"
              }`}
            />
          )}
          <span className="truncate text-sm font-semibold">{node.name}</span>
          <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 sm:inline-flex">
            {levelLabel}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className={`mr-2 inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            selected
              ? "bg-blue-600 text-white"
              : "bg-white text-blue-600 opacity-100 shadow-sm ring-1 ring-slate-200 hover:bg-blue-600 hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          }`}
          aria-label={`${node.name} ангиллыг сонгох`}
        >
          {selected && <Check className="h-3.5 w-3.5" />}
          {selected ? "Сонгосон" : "Сонгох"}
        </button>
      </div>

      {expanded && (
        <div role="group">
          {node.children.map((child) => (
            <CategoryTreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              visibleIds={visibleIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WarehouseCategoryTree({
  categories,
  value,
  search,
  onChange,
}: WarehouseCategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const visibleIds = useMemo(() => {
    if (!search.trim()) return null;
    const visible = new Set<string>();
    categories.forEach((category) => {
      if (!categoryMatchesSearch(category, categories, search)) return;
      categoryPath(category.id, categories).forEach((item) => visible.add(item.id));
    });
    return visible;
  }, [categories, search]);

  const effectiveExpandedIds = useMemo(() => {
    const next = new Set(expandedIds);
    if (search.trim()) visibleIds?.forEach((id) => next.add(id));
    if (value) {
      categoryPath(value, categories)
        .slice(0, -1)
        .forEach((category) => next.add(category.id));
    }
    return next;
  }, [categories, expandedIds, search, value, visibleIds]);

  useEffect(() => {
    if (!value) return;
    const ancestorIds = categoryPath(value, categories)
      .slice(0, -1)
      .map((category) => category.id);
    if (ancestorIds.length === 0) return;
    setExpandedIds((current) => new Set([...current, ...ancestorIds]));
  }, [categories, value]);

  const toggle = (categoryId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  if (visibleIds?.size === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm font-semibold text-slate-500">
          Ангилал олдсонгүй
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Нэр эсвэл ангиллын замыг өөрөөр хайна уу.
        </p>
      </div>
    );
  }

  return (
    <div role="tree" aria-label="Ангиллын шаталсан жагсаалт">
      {tree.map((node) => (
        <CategoryTreeRow
          key={node.id}
          node={node}
          depth={0}
          selectedId={value}
          expandedIds={effectiveExpandedIds}
          visibleIds={visibleIds}
          onToggle={toggle}
          onSelect={onChange}
        />
      ))}
    </div>
  );
}
