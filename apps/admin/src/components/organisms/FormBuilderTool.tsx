"use client";

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Copy,
  Eye,
  Pencil,
  FileSpreadsheet,
  ChevronDown,
  X,
  Save,
  FileDown,
  Type,
  AlignLeft,
  List,
  CheckSquare,
  Circle,
  Calendar,
  Hash,
  ToggleLeft,
  ClipboardList,
  ArrowLeft,
  Send,
  Settings2,
  MoreVertical,
  ListPlus,
  Link2,
  Check,
} from "lucide-react";
import { API } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "dropdown"
  | "checkbox"
  | "radio"
  | "date"
  | "label";

interface FieldOption {
  id: string;
  value: string;
}

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: FieldOption[];
  placeholder?: string;
}

interface Form {
  id: string;
  slug: string;
  title: string;
  description: string;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  _count?: { responses: number };
}

interface FormResponse {
  id: string;
  formId: string;
  data: Record<string, string | string[]>;
  submittedAt: string;
}

type View = "list" | "builder" | "preview" | "responses";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => crypto.randomUUID();

const FIELD_TYPES: { type: FieldType; label: string; icon: ReactNode }[] = [
  { type: "text", label: "Богино хариулт", icon: <Type className="h-4 w-4" /> },
  {
    type: "textarea",
    label: "Дэлгэрэнгүй хариулт",
    icon: <AlignLeft className="h-4 w-4" />,
  },
  { type: "number", label: "Тоон утга", icon: <Hash className="h-4 w-4" /> },
  {
    type: "dropdown",
    label: "Жагсаалтаас сонгох",
    icon: <ChevronDown className="h-4 w-4" />,
  },
  {
    type: "checkbox",
    label: "Олон сонголт",
    icon: <CheckSquare className="h-4 w-4" />,
  },
  { type: "radio", label: "Нэг сонголт", icon: <Circle className="h-4 w-4" /> },
  { type: "date", label: "Огноо", icon: <Calendar className="h-4 w-4" /> },
  {
    type: "label",
    label: "Хэсгийн гарчиг",
    icon: <List className="h-4 w-4" />,
  },
];

const WEB_BASE =
  process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

function getFormLink(slug: string): string {
  return `${WEB_BASE}/forms/${slug}`;
}

function escapeCSV(val: string): string {
  if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function FormBuilderTool() {
  const [forms, setForms] = useState<Form[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [view, setView] = useState<View>("list");
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/forms`);
      if (res.ok) setForms(await res.json());
    } catch {
      // ignore
    }
  }, []);

  const fetchResponses = useCallback(async (formId: string) => {
    try {
      const res = await fetch(`${API}/admin/forms/${formId}`);
      if (res.ok) {
        const data = await res.json();
        setResponses(data.responses || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchForms().then(() => setMounted(true));
  }, [fetchForms]);

  const activeForm = useMemo(
    () => forms.find((f) => f.id === activeFormId) ?? null,
    [forms, activeFormId],
  );

  const activeResponses = useMemo(
    () => responses.filter((r) => r.formId === activeFormId),
    [responses, activeFormId],
  );

  // ── Actions ──

  const createForm = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Шинэ маягт", description: "", fields: [] }),
      });
      if (res.ok) {
        const form = await res.json();
        setForms((prev) => [form, ...prev]);
        setActiveFormId(form.id);
        setView("builder");
      }
    } catch {
      // ignore
    }
  }, []);

  const duplicateForm = useCallback(
    async (id: string) => {
      const src = forms.find((f) => f.id === id);
      if (!src) return;
      try {
        const res = await fetch(`${API}/admin/forms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `${src.title} (хуулбар)`,
            description: src.description,
            fields: src.fields,
          }),
        });
        if (res.ok) {
          await fetchForms();
        }
      } catch {
        // ignore
      }
    },
    [forms, fetchForms],
  );

  const deleteForm = useCallback(
    async (id: string) => {
      try {
        await fetch(`${API}/admin/forms/${id}`, { method: "DELETE" });
        setForms((prev) => prev.filter((f) => f.id !== id));
        if (activeFormId === id) {
          setActiveFormId(null);
          setView("list");
        }
      } catch {
        // ignore
      }
    },
    [activeFormId],
  );

  const updateForm = useCallback(
    async (updated: Form) => {
      try {
        const res = await fetch(`${API}/admin/forms/${updated.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: updated.title,
            description: updated.description,
            fields: updated.fields,
          }),
        });
        if (res.ok) {
          const saved = await res.json();
          setForms((prev) =>
            prev.map((f) => (f.id === saved.id ? { ...f, ...saved } : f)),
          );
        }
      } catch {
        // ignore
      }
    },
    [],
  );

  const submitResponse = useCallback(
    async (data: Record<string, string | string[]>) => {
      if (!activeForm?.slug) return;
      try {
        const res = await fetch(`${API}/forms/${activeForm.slug}/responses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });
        if (res.ok) {
          const resp = await res.json();
          setResponses((prev) => [...prev, resp]);
        }
      } catch {
        // ignore
      }
    },
    [activeForm],
  );

  const deleteResponse = useCallback(
    async (id: string) => {
      try {
        await fetch(`${API}/admin/form-responses/${id}`, { method: "DELETE" });
        setResponses((prev) => prev.filter((r) => r.id !== id));
      } catch {
        // ignore
      }
    },
    [],
  );

  const openBuilder = useCallback(
    (id: string) => {
      setActiveFormId(id);
      setView("builder");
    },
    [],
  );

  const openPreview = useCallback(
    (id: string) => {
      setActiveFormId(id);
      setView("preview");
    },
    [],
  );

  const openResponses = useCallback(
    (id: string) => {
      setActiveFormId(id);
      fetchResponses(id);
      setView("responses");
    },
    [fetchResponses],
  );

  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {view === "list" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <FormListView
              forms={forms}
              onCreate={createForm}
              onOpen={openBuilder}
              onPreview={openPreview}
              onResponses={openResponses}
              onDuplicate={duplicateForm}
              onDelete={deleteForm}
            />
          </div>
        </div>
      )}
      {view === "builder" && activeForm && (
        <FormBuilderView
          form={activeForm}
          onUpdate={updateForm}
          onBack={() => setView("list")}
          onPreview={() => setView("preview")}
          onResponses={() => setView("responses")}
        />
      )}
      {view === "preview" && activeForm && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <FormPreviewView
            form={activeForm}
            onBack={() => setView("builder")}
            onSubmit={submitResponse}
          />
        </div>
      )}
      {view === "responses" && activeForm && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <FormResponsesView
              form={activeForm}
              responses={activeResponses}
              onBack={() => setView("builder")}
              onDelete={deleteResponse}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Form List ───────────────────────────────────────────────────────────────

function FormListView({
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
              <div className="absolute right-3 top-3" ref={menuOpen === form.id ? menuRef : undefined}>
                <button
                  onClick={() => setMenuOpen(menuOpen === form.id ? null : form.id)}
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
                      onClick={() => { onDuplicate(form.id); setMenuOpen(null); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Copy className="h-3.5 w-3.5" /> Хуулах
                    </button>
                    <button
                      onClick={() => { onDelete(form.id); setMenuOpen(null); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Устгах
                    </button>
                  </div>
                )}
              </div>

              <div
                className="cursor-pointer"
                onClick={() => onOpen(form.id)}
              >
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
                    <><Check className="h-3.5 w-3.5" /> Хуулсан!</>
                  ) : (
                    <><Link2 className="h-3.5 w-3.5" /> Линк</>
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

function FormBuilderView({
  form,
  onUpdate,
  onBack,
  onPreview,
  onResponses,
}: {
  form: Form;
  onUpdate: (f: Form) => void;
  onBack: () => void;
  onPreview: () => void;
  onResponses: () => void;
}) {
  const [draft, setDraft] = useState<Form>(() => structuredClone(form));
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [saved, setSaved] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const fieldPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        fieldPickerRef.current &&
        !fieldPickerRef.current.contains(e.target as Node)
      )
        setShowFieldPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const modify = useCallback(
    (fn: (d: Form) => void) => {
      setDraft((prev) => {
        const next = structuredClone(prev);
        fn(next);
        return next;
      });
      setSaved(false);
    },
    [],
  );

  const handleSave = useCallback(() => {
    onUpdate(draft);
    setSaved(true);
  }, [draft, onUpdate]);

  const addField = useCallback(
    (type: FieldType) => {
      const f: FormField = {
        id: uid(),
        type,
        label:
          type === "label" ? "Хэсгийн гарчиг" : "Асуулт",
        required: false,
        ...(["dropdown", "checkbox", "radio"].includes(type)
          ? {
              options: [
                { id: uid(), value: "Сонголт 1" },
                { id: uid(), value: "Сонголт 2" },
              ],
            }
          : {}),
      };
      modify((d) => d.fields.push(f));
      setActiveFieldId(f.id);
      setShowFieldPicker(false);
    },
    [modify],
  );

  const removeField = useCallback(
    (id: string) => {
      modify((d) => {
        d.fields = d.fields.filter((f) => f.id !== id);
      });
      if (activeFieldId === id) setActiveFieldId(null);
    },
    [modify, activeFieldId],
  );

  const duplicateField = useCallback(
    (id: string) => {
      modify((d) => {
        const idx = d.fields.findIndex((f) => f.id === id);
        if (idx < 0) return;
        const clone: FormField = {
          ...structuredClone(d.fields[idx]),
          id: uid(),
          options: d.fields[idx].options?.map((o) => ({
            ...o,
            id: uid(),
          })),
        };
        d.fields.splice(idx + 1, 0, clone);
      });
    },
    [modify],
  );

  const updateField = useCallback(
    (id: string, patch: Partial<FormField>) => {
      modify((d) => {
        const f = d.fields.find((x) => x.id === id);
        if (f) Object.assign(f, patch);
      });
    },
    [modify],
  );

  const addOption = useCallback(
    (fieldId: string) => {
      modify((d) => {
        const f = d.fields.find((x) => x.id === fieldId);
        if (!f) return;
        const len = f.options?.length ?? 0;
        if (!f.options) f.options = [];
        f.options.push({ id: uid(), value: `Сонголт ${len + 1}` });
      });
    },
    [modify],
  );

  const removeOption = useCallback(
    (fieldId: string, optionId: string) => {
      modify((d) => {
        const f = d.fields.find((x) => x.id === fieldId);
        if (f?.options) f.options = f.options.filter((o) => o.id !== optionId);
      });
    },
    [modify],
  );

  const updateOption = useCallback(
    (fieldId: string, optionId: string, value: string) => {
      modify((d) => {
        const f = d.fields.find((x) => x.id === fieldId);
        const o = f?.options?.find((o) => o.id === optionId);
        if (o) o.value = value;
      });
    },
    [modify],
  );

  // ── Drag reorder ──
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    modify((d) => {
      const [moved] = d.fields.splice(dragIdx, 1);
      d.fields.splice(idx, 0, moved);
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const fieldTypeIcon = (type: FieldType) =>
    FIELD_TYPES.find((t) => t.type === type)?.icon ?? null;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="z-30 flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-6 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Буцах
        </button>
        <div className="mr-auto" />
        <button
          onClick={() => {
            navigator.clipboard.writeText(getFormLink(form.slug));
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-100"
        >
          {linkCopied ? (
            <><Check className="h-4 w-4" /> Хуулсан!</>
          ) : (
            <><Link2 className="h-4 w-4" /> Линк хуулах</>
          )}
        </button>
        <button
          onClick={onPreview}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Eye className="h-4 w-4" /> Урьдчилж харах
        </button>
        <button
          onClick={onResponses}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <FileSpreadsheet className="h-4 w-4" /> Хариултууд
        </button>
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
            saved
              ? "bg-slate-400 cursor-default"
              : "bg-violet-600 hover:bg-violet-700"
          }`}
          disabled={saved}
        >
          <Save className="h-4 w-4" />
          {saved ? "Хадгалсан" : "Хадгалах"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Form editor */}
        <div className="space-y-4">
          {/* Title card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <input
              value={draft.title}
              onChange={(e) => modify((d) => { d.title = e.target.value; })}
              className="w-full text-xl font-bold text-slate-900 outline-none placeholder:text-slate-300"
              placeholder="Маягтын нэр"
            />
            <input
              value={draft.description ?? ""}
              onChange={(e) => modify((d) => { d.description = e.target.value; })}
              className="mt-2 w-full text-sm text-slate-500 outline-none placeholder:text-slate-300"
              placeholder="Тайлбар (заавал биш)"
            />
          </div>

          {/* Fields */}
          {draft.fields.map((field, idx) => (
            <div
              key={field.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onClick={() => setActiveFieldId(field.id)}
              className={`group rounded-2xl border bg-white transition-all ${
                activeFieldId === field.id
                  ? "border-violet-400 shadow-sm ring-2 ring-violet-100"
                  : "border-slate-200 hover:border-slate-300"
              } ${dragIdx === idx ? "opacity-50" : ""}`}
            >
              {/* Field header */}
              <div className="flex items-start gap-3 p-4 pb-2">
                <div className="mt-1 cursor-grab text-slate-300 hover:text-slate-400">
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{fieldTypeIcon(field.type)}</span>
                    <input
                      value={field.label}
                      onChange={(e) =>
                        updateField(field.id, { label: e.target.value })
                      }
                      className="flex-1 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-300"
                      placeholder="Талбарын нэр"
                    />
                    {field.required && (
                      <span className="text-xs font-medium text-rose-500">*</span>
                    )}
                  </div>

                  {/* Field-type specific content */}
                  {field.type === "label" && (
                    <input
                      value={field.placeholder ?? ""}
                      onChange={(e) =>
                        updateField(field.id, { placeholder: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                      placeholder="Тайлбар текст..."
                    />
                  )}

                  {(field.type === "text" || field.type === "number" || field.type === "date") && (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-400">
                      {field.type === "text" && "Таны хариулт"}
                      {field.type === "number" && "Тоон утга оруулна уу"}
                      {field.type === "date" && "Огноо сонгоно уу"}
                    </div>
                  )}

                  {field.type === "textarea" && (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400">
                      Таны хариулт
                    </div>
                  )}

                  {(field.type === "dropdown" ||
                    field.type === "checkbox" ||
                    field.type === "radio") && (
                    <div className="space-y-2">
                      {field.options?.map((opt, oi) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          {field.type === "radio" && (
                            <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                          )}
                          {field.type === "checkbox" && (
                            <div className="h-4 w-4 rounded border-2 border-slate-300" />
                          )}
                          {field.type === "dropdown" && (
                            <span className="text-xs font-medium text-slate-400">
                              {oi + 1}.
                            </span>
                          )}
                          <input
                            value={opt.value}
                            onChange={(e) =>
                              updateOption(field.id, opt.id, e.target.value)
                            }
                            className="flex-1 border-b border-transparent text-sm text-slate-700 outline-none focus:border-violet-300"
                          />
                          {(field.options?.length ?? 0) > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeOption(field.id, opt.id);
                              }}
                              className="rounded p-0.5 text-slate-300 hover:text-rose-500"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addOption(field.id);
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700"
                      >
                        <Plus className="h-3.5 w-3.5" /> Сонголт нэмэх
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Field footer */}
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateField(field.id);
                    }}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Хуулах"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField(field.id);
                    }}
                    className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                    title="Устгах"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                  Заавал
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateField(field.id, { required: !field.required });
                    }}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      field.required ? "bg-violet-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        field.required ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </label>
              </div>
            </div>
          ))}

          {/* Add field button */}
          <div className="relative" ref={fieldPickerRef}>
            <button
              onClick={() => setShowFieldPicker(!showFieldPicker)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white py-4 text-sm font-semibold text-slate-500 transition-colors hover:border-violet-400 hover:text-violet-600"
            >
              <Plus className="h-4 w-4" />
              Талбар нэмэх
            </button>
            {showFieldPicker && (
              <div className="absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Талбарын төрөл
                </p>
                {FIELD_TYPES.map((ft) => (
                  <button
                    key={ft.type}
                    onClick={() => addField(ft.type)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                  >
                    <span className="text-slate-400">{ft.icon}</span>
                    {ft.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="hidden space-y-4 lg:block">
          <div className="sticky top-0 space-y-4">
          {/* Share link */}
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-sky-700">
              <Link2 className="h-4 w-4" />
              Хуваалцах линк
            </h4>
            <p className="mb-3 text-xs text-sky-600">
              Энэ линкээр хүмүүс маягтыг бөглөх боломжтой
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={getFormLink(form.slug)}
                className="flex-1 truncate rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(getFormLink(form.slug));
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                className="shrink-0 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
              >
                {linkCopied ? "Хуулсан!" : "Хуулах"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Settings2 className="h-4 w-4 text-slate-400" />
              Мэдээлэл
            </h4>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Нийт талбар</span>
                <span className="font-semibold text-slate-700">
                  {draft.fields.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Заавал</span>
                <span className="font-semibold text-slate-700">
                  {draft.fields.filter((f) => f.required).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Үүсгэсэн</span>
                <span className="font-medium text-slate-600">
                  {new Date(draft.createdAt).toLocaleDateString("mn-MN")}
                </span>
              </div>
            </div>
          </div>

          {/* Field type summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
              <ListPlus className="h-4 w-4 text-slate-400" />
              Талбарууд
            </h4>
            {draft.fields.length === 0 ? (
              <p className="text-xs text-slate-400">Талбар нэмнэ үү</p>
            ) : (
              <div className="space-y-1.5">
                {draft.fields.map((f, i) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFieldId(f.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                      activeFieldId === f.id
                        ? "bg-violet-50 text-violet-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-slate-400">{fieldTypeIcon(f.type)}</span>
                    <span className="flex-1 truncate">{f.label}</span>
                    {f.required && (
                      <span className="text-[10px] text-rose-400">*</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── Form Preview (Fill) ─────────────────────────────────────────────────────

function FormPreviewView({
  form,
  onBack,
  onSubmit,
}: {
  form: Form;
  onBack: () => void;
  onSubmit: (data: Record<string, string | string[]>) => void;
}) {
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const set = (id: string, val: string | string[]) => {
    setValues((p) => ({ ...p, [id]: val }));
    setErrors((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  };

  const toggleCheckbox = (fieldId: string, optValue: string) => {
    const cur = (values[fieldId] as string[]) || [];
    const next = cur.includes(optValue)
      ? cur.filter((v) => v !== optValue)
      : [...cur, optValue];
    set(fieldId, next);
  };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    for (const f of form.fields) {
      if (f.type === "label") continue;
      if (f.required) {
        const v = values[f.id];
        if (!v || (Array.isArray(v) && v.length === 0) || v === "") {
          errs[f.id] = "Энэ талбарыг заавал бөглөнө үү";
        }
      }
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit(values);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 py-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <Send className="h-7 w-7 text-emerald-600" />
          </div>
          <h3 className="mb-1 text-lg font-bold text-emerald-800">
            Хариулт илгээгдлээ!
          </h3>
          <p className="mb-6 text-sm text-emerald-600">
            Таны хариулт амжилттай бүртгэгдлээ.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setValues({});
                setErrors({});
                setSubmitted(false);
              }}
              className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              Өөр хариулт бөглөх
            </button>
            <button
              onClick={onBack}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Маягт руу буцах
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4" /> Засварлах руу буцах
      </button>

      {/* Header */}
      <div className="rounded-2xl border-t-4 border-t-violet-600 border-x border-b border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-900">{form.title}</h2>
        {form.description && (
          <p className="mt-1 text-sm text-slate-500">{form.description}</p>
        )}
        {form.fields.some((f) => f.required) && (
          <p className="mt-3 text-xs text-rose-500">* Заавал бөглөх</p>
        )}
      </div>

      {/* Fields */}
      {form.fields.map((field) => {
        if (field.type === "label") {
          return (
            <div
              key={field.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <p className="text-sm font-semibold text-slate-700">
                {field.label}
              </p>
              {field.placeholder && (
                <p className="mt-1 text-sm text-slate-500">
                  {field.placeholder}
                </p>
              )}
            </div>
          );
        }

        return (
          <div
            key={field.id}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {field.label}
              {field.required && <span className="ml-1 text-rose-500">*</span>}
            </label>

            {field.type === "text" && (
              <input
                type="text"
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => set(field.id, e.target.value)}
                className="w-full border-b-2 border-slate-200 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-violet-500"
                placeholder="Хариултаа оруулна уу"
              />
            )}

            {field.type === "textarea" && (
              <textarea
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => set(field.id, e.target.value)}
                rows={3}
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                placeholder="Хариултаа оруулна уу"
              />
            )}

            {field.type === "number" && (
              <input
                type="number"
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => set(field.id, e.target.value)}
                className="w-full border-b-2 border-slate-200 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-violet-500"
                placeholder="Тоо оруулна уу"
              />
            )}

            {field.type === "date" && (
              <input
                type="date"
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => set(field.id, e.target.value)}
                className="w-full border-b-2 border-slate-200 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-violet-500"
              />
            )}

            {field.type === "dropdown" && (
              <div className="relative">
                <select
                  value={(values[field.id] as string) ?? ""}
                  onChange={(e) => set(field.id, e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                  <option value="">Сонгоно уу</option>
                  {field.options?.map((o) => (
                    <option key={o.id} value={o.value}>
                      {o.value}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            )}

            {field.type === "radio" &&
              field.options?.map((o) => (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    name={field.id}
                    checked={(values[field.id] as string) === o.value}
                    onChange={() => set(field.id, o.value)}
                    className="h-4 w-4 border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  {o.value}
                </label>
              ))}

            {field.type === "checkbox" &&
              field.options?.map((o) => (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={((values[field.id] as string[]) ?? []).includes(
                      o.value,
                    )}
                    onChange={() => toggleCheckbox(field.id, o.value)}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  {o.value}
                </label>
              ))}

            {errors[field.id] && (
              <p className="mt-2 text-xs text-rose-500">{errors[field.id]}</p>
            )}
          </div>
        );
      })}

      {/* Submit */}
      {form.fields.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700"
          >
            Илгээх
          </button>
          <button
            onClick={() => {
              setValues({});
              setErrors({});
            }}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Цэвэрлэх
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Form Responses (Sheet View) ────────────────────────────────────────────

function FormResponsesView({
  form,
  responses,
  onBack,
  onDelete,
}: {
  form: Form;
  responses: FormResponse[];
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const dataFields = useMemo(
    () => form.fields.filter((f) => f.type !== "label"),
    [form.fields],
  );

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === responses.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(responses.map((r) => r.id)));
    }
  };

  const deleteSelected = () => {
    selectedRows.forEach((id) => onDelete(id));
    setSelectedRows(new Set());
  };

  const cellValue = (resp: FormResponse, fieldId: string): string => {
    const v = resp.data[fieldId];
    if (v === undefined || v === null) return "";
    if (Array.isArray(v)) return v.join(", ");
    return String(v);
  };

  // ── Excel-compatible CSV export (UTF-8 BOM for Mongolian) ──
  const exportCSV = useCallback(() => {
    const headers = [
      "#",
      ...dataFields.map((f) => f.label),
      "Илгээсэн огноо",
    ];
    const rows = responses.map((r, i) => [
      String(i + 1),
      ...dataFields.map((f) => cellValue(r, f.id)),
      new Date(r.submittedAt).toLocaleString("mn-MN"),
    ]);

    const csv =
      "\uFEFF" +
      [headers, ...rows].map((row) => row.map(escapeCSV).join(",")).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.title.replace(/[^a-zA-Z0-9а-яА-ЯөӨүҮёЁ ]/g, "")}_хариултууд.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dataFields, responses, form.title]);

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Маягт руу
        </button>
        <div className="mr-auto">
          <h3 className="text-sm font-bold text-slate-900">
            {form.title} — Хариултууд
          </h3>
          <p className="text-xs text-slate-400">
            Нийт {responses.length} хариулт
          </p>
        </div>
        {selectedRows.size > 0 && (
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            <Trash2 className="h-4 w-4" />
            Устгах ({selectedRows.size})
          </button>
        )}
        <button
          onClick={exportCSV}
          disabled={responses.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          <FileDown className="h-4 w-4" />
          Excel (CSV)
        </button>
      </div>

      {/* Empty */}
      {responses.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white py-16">
          <FileSpreadsheet className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">
            Хариулт байхгүй
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Маягтаа нээж хариулт бөглөнө үү
          </p>
        </div>
      )}

      {/* Sheet table */}
      {responses.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === responses.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                </th>
                <th className="w-10 px-2 py-3 text-center font-semibold text-slate-500">
                  #
                </th>
                {dataFields.map((f) => (
                  <th
                    key={f.id}
                    className="max-w-[200px] px-4 py-3 text-left font-semibold text-slate-600"
                  >
                    <span className="line-clamp-1">{f.label}</span>
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Огноо
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {responses.map((resp, i) => (
                <tr
                  key={resp.id}
                  className={`transition-colors hover:bg-slate-50 ${
                    selectedRows.has(resp.id) ? "bg-violet-50" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(resp.id)}
                      onChange={() => toggleRow(resp.id)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                  </td>
                  <td className="px-2 py-2.5 text-center text-xs font-medium text-slate-400">
                    {i + 1}
                  </td>
                  {dataFields.map((f) => (
                    <td
                      key={f.id}
                      className="max-w-[200px] px-4 py-2.5 text-slate-700"
                    >
                      <span className="line-clamp-2">
                        {cellValue(resp, f.id) || (
                          <span className="text-slate-300">—</span>
                        )}
                      </span>
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">
                    {new Date(resp.submittedAt).toLocaleString("mn-MN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary cards */}
      {responses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-center">
            <p className="text-2xl font-bold text-violet-700">
              {responses.length}
            </p>
            <p className="text-xs font-medium text-violet-500">Нийт хариулт</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">
              {dataFields.length}
            </p>
            <p className="text-xs font-medium text-emerald-500">Нийт талбар</p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-center">
            <p className="text-2xl font-bold text-sky-700">
              {responses.length > 0
                ? new Date(
                    responses[responses.length - 1].submittedAt,
                  ).toLocaleDateString("mn-MN")
                : "—"}
            </p>
            <p className="text-xs font-medium text-sky-500">
              Сүүлийн хариулт
            </p>
          </div>
        </div>
      )}
    </>
  );
}
