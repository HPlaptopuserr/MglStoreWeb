"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlignLeft,
  ArrowLeft,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  Circle,
  ClipboardList,
  Copy,
  Eye,
  FileDown,
  FileSpreadsheet,
  GripVertical,
  Hash,
  Link2,
  List,
  ListPlus,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Send,
  Settings2,
  ToggleLeft,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import {
  FIELD_TYPES,
  escapeCSV,
  getFormLink,
  uid,
  type FieldType,
  type Form,
  type FormField,
  type FormResponse,
} from "./form-builder.model";

export function FormListView({
  forms,
  onCreate,
  onOpen,
  onPreview,
  onResponses,
  onDuplicate,
  onDelete,
}: {
  forms: Form[];
  onCreate: () => void;
  onOpen: (id: string) => void;
  onPreview: (id: string) => void;
  onResponses: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <ClipboardList className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Маягт үүсгэгч</h2>
            <p className="text-xs text-slate-400">
              Google Forms-тэй төстэй маягт бүтээх / хариулт цуглуулах
            </p>
          </div>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Шинэ маягт
        </button>
      </div>

      {/* Empty state */}
      {forms.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20">
          <ClipboardList className="mb-4 h-12 w-12 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">
            Маягт байхгүй байна
          </p>
          <p className="mb-6 mt-1 text-xs text-slate-400">
            Шинэ маягт үүсгэж мэдээлэл цуглуулаарай
          </p>
          <button
            onClick={onCreate}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Үүсгэх
          </button>
        </div>
      )}

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {forms.map((form) => {
          const count = form._count?.responses ?? 0;
          const link = getFormLink(form.slug);
          return (
            <div
              key={form.id}
              className="group relative rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              {/* menu */}
              <div
                className="absolute right-3 top-3"
                ref={menuOpen === form.id ? menuRef : undefined}
              >
                <button
                  onClick={() =>
                    setMenuOpen(menuOpen === form.id ? null : form.id)
                  }
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen === form.id && (
                  <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(link);
                        setCopiedId(form.id);
                        setTimeout(() => setCopiedId(null), 2000);
                        setMenuOpen(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Link2 className="h-3.5 w-3.5" /> Линк хуулах
                    </button>
                    <button
                      onClick={() => {
                        onDuplicate(form.id);
                        setMenuOpen(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Copy className="h-3.5 w-3.5" /> Хуулах
                    </button>
                    <button
                      onClick={() => {
                        onDelete(form.id);
                        setMenuOpen(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Устгах
                    </button>
                  </div>
                )}
              </div>

              <div className="cursor-pointer" onClick={() => onOpen(form.id)}>
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
                  <ClipboardList className="h-4.5 w-4.5 text-violet-600" />
                </div>
                <h3 className="mb-1 text-sm font-bold text-slate-900 line-clamp-1">
                  {form.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {form.description || "Тайлбар байхгүй"}
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                  <span>{form.fields.length} талбар</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{count} хариулт</span>
                </div>
              </div>

              {/* bottom actions */}
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => onOpen(form.id)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <Pencil className="h-3.5 w-3.5" /> Засах
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    setCopiedId(form.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-50"
                >
                  {copiedId === form.id ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Хуулсан!
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3.5 w-3.5" /> Линк
                    </>
                  )}
                </button>
                <button
                  onClick={() => onResponses(form.id)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Хариулт ({count})
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Form Builder ────────────────────────────────────────────────────────────
