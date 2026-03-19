"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Tag,
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
  Loader2,
  Hash,
  GripVertical,
  RefreshCw,
  ImagePlus,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Layers,
  Package,
} from "lucide-react";
import { API } from "@/lib/api";

/* ── Types ── */
type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
  level: number;
};

type TreeNode = Category & { children: TreeNode[] };

type FormState = {
  slug: string;
  name: string;
  icon: string;
  sortOrder: number;
  parentId: string | null;
};

/* createLevel: the target level we're adding (0, 1, or 2). null when editing */
type ModalMode =
  | { kind: "create"; level: 0 | 1 | 2 }
  | { kind: "edit" };

const empty: FormState = {
  slug: "",
  name: "",
  icon: "",
  sortOrder: 0,
  parentId: null,
};

function slugify(val: string) {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const LEVEL_LABELS = [
  "Үндсэн ангилал",
  "Дэд ангилал",
  "Бүтээгдэхүүний төрөл",
];
const LEVEL_COLORS = [
  "bg-indigo-50 text-indigo-600 border-indigo-200",
  "bg-amber-50 text-amber-600 border-amber-200",
  "bg-emerald-50 text-emerald-600 border-emerald-200",
];
const LEVEL_ICONS = [FolderTree, Layers, Package];

/* ── Build tree helper ── */
function buildTree(flat: Category[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  flat.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: TreeNode[] = [];
  flat.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  // sort children
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

/* ── TreeRow component ── */
function TreeRow({
  node,
  expanded,
  onToggle,
  onEdit,
  onToggleActive,
  onAddChild,
}: {
  node: TreeNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (cat: Category) => void;
  onToggleActive: (cat: Category) => void;
  onAddChild: (parentId: string, parentLevel: number) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const indent = node.level * 32;
  const LevelIcon = LEVEL_ICONS[node.level] || Package;

  return (
    <>
      <div
        className={`flex items-center px-4 md:px-6 py-3 border-b border-slate-50 transition-colors group ${
          node.isActive ? "hover:bg-slate-50/80" : "bg-slate-50/40 opacity-50"
        }`}
        style={{ paddingLeft: `${indent + 16}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => hasChildren && onToggle(node.id)}
          className={`w-6 h-6 flex items-center justify-center rounded transition-colors mr-2 shrink-0 ${
            hasChildren
              ? "hover:bg-slate-200 text-slate-500 cursor-pointer"
              : "text-transparent cursor-default"
          }`}
        >
          {hasChildren &&
            (isExpanded ? (
              <ChevronDown size={15} />
            ) : (
              <ChevronRight size={15} />
            ))}
        </button>

        {/* Icon */}
        <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden shrink-0 mr-3">
          {node.icon ? (
            node.icon.startsWith("data:image") ||
            node.icon.startsWith("http") ? (
              <img
                src={node.icon}
                alt={node.name}
                className="w-5 h-5 object-contain"
              />
            ) : (
              <span className="text-lg">{node.icon}</span>
            )
          ) : (
            <LevelIcon size={16} className="text-slate-300" />
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm truncate">
              {node.name}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${LEVEL_COLORS[node.level]}`}
            >
              {LEVEL_LABELS[node.level]}
            </span>
            {!node.isActive && (
              <span className="text-[10px] text-slate-400 font-medium">
                (идэвхгүй)
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <code className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-mono">
              {node.slug}
            </code>
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <GripVertical size={10} /> #{node.sortOrder}
            </span>
            {hasChildren && (
              <span className="text-[10px] text-slate-400">
                {node.children.length} дэд
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {node.level < 2 && (
            <button
              onClick={() => onAddChild(node.id, node.level)}
              className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
              title={`${LEVEL_LABELS[node.level + 1]} нэмэх`}
            >
              <Plus size={15} />
            </button>
          )}
          <button
            onClick={() => onEdit(node)}
            className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
            title="Засах"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onToggleActive(node)}
            className={`p-1.5 rounded-lg transition-colors ${
              node.isActive
                ? "hover:bg-amber-50 text-emerald-500 hover:text-amber-500"
                : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-500"
            }`}
            title={node.isActive ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
          >
            {node.isActive ? (
              <ToggleRight size={17} />
            ) : (
              <ToggleLeft size={17} />
            )}
          </button>
        </div>
      </div>

      {/* Children */}
      {isExpanded &&
        node.children.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            expanded={expanded}
            onToggle={onToggle}
            onEdit={onEdit}
            onToggleActive={onToggleActive}
            onAddChild={onAddChild}
          />
        ))}
    </>
  );
}

/* ── Main Page ── */
export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>({ kind: "create", level: 0 });
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // For level-2 creation: intermediate selection of root category
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(categories), [categories]);

  // Stats
  const levelCounts = useMemo(() => {
    const counts = [0, 0, 0];
    categories.forEach((c) => {
      if (c.level >= 0 && c.level <= 2) counts[c.level]++;
    });
    return counts;
  }, [categories]);

  const fetchAll = async () => {
    try {
      const res = await fetch(`${API}/admin/business-categories-all`);
      if (!res.ok) throw new Error("fetch failed");
      const data: Category[] = await res.json();
      setCategories(data);
      // Auto-expand level 0 on first load
      if (expanded.size === 0) {
        const rootIds = new Set(
          data.filter((c) => !c.parentId).map((c) => c.id),
        );
        setExpanded(rootIds);
      }
    } catch {
      const res = await fetch(`${API}/business-categories`);
      if (res.ok) setCategories(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpanded(new Set(categories.map((c) => c.id)));
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  const openCreate = (parentId: string | null = null, parentLevel = -1) => {
    setEditTarget(null);
    setError("");

    // Determine target level from context
    let targetLevel: 0 | 1 | 2 = 0;
    if (parentId) {
      const parent = categories.find((c) => c.id === parentId);
      if (parent) targetLevel = Math.min(parent.level + 1, 2) as 0 | 1 | 2;
    } else if (parentLevel >= 0) {
      targetLevel = Math.min(parentLevel + 1, 2) as 0 | 1 | 2;
    }

    setModalMode({ kind: "create", level: targetLevel });
    setForm({ ...empty, parentId });

    // For level-2 creation, determine root from parent
    if (targetLevel === 2 && parentId) {
      const parent = categories.find((c) => c.id === parentId);
      setSelectedRootId(parent?.parentId ?? null);
    } else {
      setSelectedRootId(null);
    }

    setShowModal(true);
  };

  /** Open create modal at a specific target level (used by quick-add cards) */
  const openCreateAtLevel = (level: 0 | 1 | 2) => {
    setEditTarget(null);
    setError("");
    setModalMode({ kind: "create", level });
    setSelectedRootId(null);

    if (level === 0) {
      setForm({ ...empty, parentId: null });
    } else if (level === 1) {
      const firstRoot = categories.find((c) => c.level === 0);
      setForm({ ...empty, parentId: firstRoot?.id ?? null });
    } else {
      // level 2: let user pick root first, then sub
      const firstRoot = categories.find((c) => c.level === 0);
      setSelectedRootId(firstRoot?.id ?? null);
      const firstSub = firstRoot
        ? categories.find((c) => c.level === 1 && c.parentId === firstRoot.id)
        : null;
      setForm({ ...empty, parentId: firstSub?.id ?? null });
    }

    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setModalMode({ kind: "edit" });
    setForm({
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon ?? "",
      sortOrder: cat.sortOrder,
      parentId: cat.parentId,
    });
    // For level-2 edit, determine root
    if (cat.level === 2 && cat.parentId) {
      const parent = categories.find((c) => c.id === cat.parentId);
      setSelectedRootId(parent?.parentId ?? null);
    } else {
      setSelectedRootId(null);
    }
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setError("Нэр болон slug заавал шаардлагатай");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const endpoint = editTarget
        ? `${API}/admin/business-categories/${editTarget.id}`
        : `${API}/admin/business-categories`;
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: form.slug,
          name: form.name,
          icon: form.icon || null,
          sortOrder: form.sortOrder,
          parentId: form.parentId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.message || "Алдаа гарлаа");
        return;
      }
      setShowModal(false);
      // if we created a child, expand parent
      if (!editTarget && form.parentId) {
        setExpanded((prev) => new Set([...prev, form.parentId!]));
      }
      fetchAll();
    } catch {
      setError("Сервертэй холбогдоход алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cat: Category) => {
    try {
      await fetch(`${API}/admin/business-categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === cat.id ? { ...c, isActive: !c.isActive } : c,
        ),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Зураг 2MB дотор байх ёстой");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setForm((f) => ({ ...f, icon: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Determine the level for the form
  const formLevel = useMemo(() => {
    if (modalMode.kind === "edit" && editTarget) return editTarget.level;
    if (modalMode.kind === "create") return modalMode.level;
    return 0;
  }, [modalMode, editTarget]);

  // Level-0 categories for parent selection
  const rootCategories = useMemo(
    () => categories.filter((c) => c.level === 0),
    [categories],
  );

  // Level-1 categories under a specific root (for level-2 creation)
  const subsUnderRoot = useMemo(() => {
    if (!selectedRootId) return [];
    return categories.filter(
      (c) => c.level === 1 && c.parentId === selectedRootId,
    );
  }, [categories, selectedRootId]);

  // Get full breadcrumb path for a category
  const getBreadcrumb = (catId: string | null): string => {
    if (!catId) return "";
    const parts: string[] = [];
    let current = categories.find((c) => c.id === catId);
    while (current) {
      parts.unshift(current.name);
      current = current.parentId
        ? categories.find((c) => c.id === current!.parentId)
        : undefined;
    }
    return parts.join(" → ");
  };

  return (
    <div className="font-sans">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Tag size={20} />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-slate-900">
                  Бизнесийн ангилал
                </h1>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                  3 түвшинт ангиллын бүтэц
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => {
                  setLoading(true);
                  fetchAll();
                }}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
                disabled={loading}
              >
                <RefreshCw
                  size={16}
                  className={
                    loading ? "animate-spin text-slate-400" : "text-slate-500"
                  }
                />
                <span className="hidden sm:inline">Шинэчлэх</span>
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[0, 1, 2].map((lvl) => {
              const Icon = LEVEL_ICONS[lvl];
              return (
                <div
                  key={lvl}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${LEVEL_COLORS[lvl]}`}
                >
                  <Icon size={18} />
                  <div>
                    <p className="text-xs font-bold opacity-70">
                      {LEVEL_LABELS[lvl]}
                    </p>
                    <p className="text-lg font-extrabold">{levelCounts[lvl]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick add cards — one per level */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 md:mb-6">
          {/* Add Үндсэн ангилал */}
          <button
            onClick={() => openCreateAtLevel(0)}
            className="flex items-center gap-3 bg-white hover:bg-indigo-50 border border-dashed border-indigo-300 rounded-2xl px-5 py-4 transition-colors group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center transition-colors">
              <Plus size={18} className="text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-indigo-700">Үндсэн ангилал нэмэх</p>
              <p className="text-[11px] text-slate-400">Хамгийн дээд түвшин</p>
            </div>
          </button>

          {/* Add Дэд ангилал */}
          <button
            onClick={() => openCreateAtLevel(1)}
            disabled={levelCounts[0] === 0}
            className="flex items-center gap-3 bg-white hover:bg-amber-50 border border-dashed border-amber-300 rounded-2xl px-5 py-4 transition-colors group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center transition-colors">
              <Plus size={18} className="text-amber-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-amber-700">Дэд ангилал нэмэх</p>
              <p className="text-[11px] text-slate-400">
                {levelCounts[0] === 0 ? "Эхлээд үндсэн ангилал нэмнэ үү" : "Үндсэн ангилалын дэд"}
              </p>
            </div>
          </button>

          {/* Add Бүтээгдэхүүний төрөл */}
          <button
            onClick={() => openCreateAtLevel(2)}
            disabled={levelCounts[1] === 0}
            className="flex items-center gap-3 bg-white hover:bg-emerald-50 border border-dashed border-emerald-300 rounded-2xl px-5 py-4 transition-colors group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
              <Plus size={18} className="text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-emerald-700">Бүтээгдэхүүний төрөл нэмэх</p>
              <p className="text-[11px] text-slate-400">
                {levelCounts[1] === 0 ? "Эхлээд дэд ангилал нэмнэ үү" : "Дэд ангилалын доорх"}
              </p>
            </div>
          </button>
        </div>

        {/* Tree Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-100 bg-slate-50/50">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ангилалын мод ({categories.length})
            </span>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded hover:bg-indigo-50"
              >
                Бүгд нээх
              </button>
              <button
                onClick={collapseAll}
                className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded hover:bg-indigo-50"
              >
                Бүгд хаах
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 size={28} className="animate-spin" />
            </div>
          ) : tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Tag size={48} className="mb-3 opacity-30" />
              <p className="font-medium">Ангилал байхгүй байна</p>
              <p className="text-sm mt-1">
                Дээрх товчноос шинэ ангилал нэмнэ үү
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {tree.map((node) => (
                <TreeRow
                  key={node.id}
                  node={node}
                  expanded={expanded}
                  onToggle={toggleExpand}
                  onEdit={openEdit}
                  onToggleActive={toggleActive}
                  onAddChild={(parentId, parentLevel) =>
                    openCreate(parentId, parentLevel)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden">
            {/* Modal header with level color */}
            <div className={`px-6 py-4 border-b ${
              formLevel === 0
                ? "bg-indigo-50 border-indigo-100"
                : formLevel === 1
                  ? "bg-amber-50 border-amber-100"
                  : "bg-emerald-50 border-emerald-100"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    formLevel === 0
                      ? "bg-indigo-100 text-indigo-600"
                      : formLevel === 1
                        ? "bg-amber-100 text-amber-600"
                        : "bg-emerald-100 text-emerald-600"
                  }`}>
                    {(() => {
                      const Icon = LEVEL_ICONS[formLevel];
                      return <Icon size={18} />;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {editTarget ? "Ангилал засах" : `${LEVEL_LABELS[formLevel]} нэмэх`}
                    </h2>
                    {!editTarget && form.parentId && (
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <ChevronRight size={10} />
                        {getBreadcrumb(form.parentId)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* ── Level 0: No parent selector ── */}

              {/* ── Level 1: Pick parent root category ── */}
              {formLevel === 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Үндсэн ангилал сонгох <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {rootCategories.map((root) => {
                      const isSelected = form.parentId === root.id;
                      return (
                        <button
                          key={root.id}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({ ...f, parentId: root.id }))
                          }
                          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                            isSelected
                              ? "border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span className="text-base leading-none shrink-0">
                            {root.icon && !root.icon.startsWith("data:") && !root.icon.startsWith("http")
                              ? root.icon
                              : "📁"}
                          </span>
                          <span className="truncate">{root.name}</span>
                          {isSelected && (
                            <Check size={14} className="ml-auto text-indigo-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Level 2: Two-step — pick root → then pick sub ── */}
              {formLevel === 2 && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      1. Үндсэн ангилал
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {rootCategories.map((root) => {
                        const isSelected = selectedRootId === root.id;
                        return (
                          <button
                            key={root.id}
                            type="button"
                            onClick={() => {
                              setSelectedRootId(root.id);
                              // Auto-select first sub under this root
                              const firstSub = categories.find(
                                (c) => c.level === 1 && c.parentId === root.id,
                              );
                              setForm((f) => ({
                                ...f,
                                parentId: firstSub?.id ?? null,
                              }));
                            }}
                            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${
                              isSelected
                                ? "border-indigo-400 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            <span className="text-sm leading-none">
                              {root.icon && !root.icon.startsWith("data:") && !root.icon.startsWith("http")
                                ? root.icon
                                : "📁"}
                            </span>
                            {root.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedRootId && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        2. Дэд ангилал сонгох <span className="text-red-500">*</span>
                      </label>
                      {subsUnderRoot.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {subsUnderRoot.map((sub) => {
                            const isSelected = form.parentId === sub.id;
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() =>
                                  setForm((f) => ({ ...f, parentId: sub.id }))
                                }
                                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                                  isSelected
                                    ? "border-amber-400 bg-amber-50 text-amber-700 ring-2 ring-amber-200"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                <Layers size={14} className={isSelected ? "text-amber-500" : "text-slate-400"} />
                                <span className="truncate">{sub.name}</span>
                                {isSelected && (
                                  <Check size={14} className="ml-auto text-amber-500 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <p className="text-sm text-slate-400">
                            Энэ ангилалд дэд ангилал байхгүй байна
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowModal(false);
                              setTimeout(() => openCreateAtLevel(1), 200);
                            }}
                            className="text-xs text-indigo-600 font-semibold mt-1 hover:underline"
                          >
                            Дэд ангилал нэмэх →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Breadcrumb preview */}
              {form.parentId && (
                <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs ${
                  formLevel === 1
                    ? "bg-amber-50 border border-amber-100"
                    : "bg-emerald-50 border border-emerald-100"
                }`}>
                  <span className="text-slate-400">Байрлал:</span>
                  <span className="font-semibold text-slate-700">
                    {getBreadcrumb(form.parentId)}
                  </span>
                  <ChevronRight size={12} className="text-slate-300" />
                  <span className={`font-bold ${
                    formLevel === 1 ? "text-amber-600" : "text-emerald-600"
                  }`}>
                    {form.name || "..."}
                  </span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Монгол нэр <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      slug: editTarget ? f.slug : slugify(name),
                    }));
                  }}
                  placeholder={
                    formLevel === 0
                      ? "Жишээ: Технологи, Хувцас"
                      : formLevel === 1
                        ? "Жишээ: Компьютер, Тавилга"
                        : "Жишээ: Зөөврийн компьютер, Буйдан"
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Slug (англи) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                    }
                    placeholder="computer, furniture..."
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Icon — only for level 0 and 1 */}
              {formLevel < 2 && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Emoji эсвэл Дүрс (PNG/SVG)
                  </label>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={form.icon}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, icon: e.target.value }))
                        }
                        placeholder="🍔 эмоджи эсвэл URL"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-ellipsis"
                      />
                    </div>
                    <div className="relative shrink-0">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml"
                        onChange={handleIconUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Зураг оруулах"
                      />
                      <button
                        type="button"
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <ImagePlus size={16} />
                      </button>
                    </div>
                  </div>
                  {form.icon &&
                    (form.icon.startsWith("data:image") ||
                      form.icon.startsWith("http")) && (
                      <div className="mt-2 flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 w-fit">
                        <img
                          src={form.icon}
                          alt="Preview"
                          className="w-8 h-8 object-contain bg-white rounded shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, icon: "" }))}
                          className="text-xs text-red-500 font-medium hover:underline"
                        >
                          Зургаас салгах
                        </button>
                      </div>
                    )}
                </div>
              )}

              {/* Sort Order */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Эрэмбэ
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white transition-colors"
              >
                Болих
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || (formLevel > 0 && !form.parentId)}
                className={`flex-1 flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                  formLevel === 0
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : formLevel === 1
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {editTarget ? "Хадгалах" : "Нэмэх"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
