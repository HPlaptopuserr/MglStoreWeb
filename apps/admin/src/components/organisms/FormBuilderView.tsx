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

export function FormBuilderView({
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

  const modify = useCallback((fn: (d: Form) => void) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    onUpdate(draft);
    setSaved(true);
  }, [draft, onUpdate]);

  const addField = useCallback(
    (type: FieldType) => {
      const f: FormField = {
        id: uid(),
        type,
        label: type === "label" ? "Хэсгийн гарчиг" : "Асуулт",
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
            <>
              <Check className="h-4 w-4" /> Хуулсан!
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" /> Линк хуулах
            </>
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
                onChange={(e) =>
                  modify((d) => {
                    d.title = e.target.value;
                  })
                }
                className="w-full text-xl font-bold text-slate-900 outline-none placeholder:text-slate-300"
                placeholder="Маягтын нэр"
              />
              <input
                value={draft.description ?? ""}
                onChange={(e) =>
                  modify((d) => {
                    d.description = e.target.value;
                  })
                }
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
                      <span className="text-slate-400">
                        {fieldTypeIcon(field.type)}
                      </span>
                      <input
                        value={field.label}
                        onChange={(e) =>
                          updateField(field.id, { label: e.target.value })
                        }
                        className="flex-1 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-300"
                        placeholder="Талбарын нэр"
                      />
                      {field.required && (
                        <span className="text-xs font-medium text-rose-500">
                          *
                        </span>
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

                    {(field.type === "text" ||
                      field.type === "number" ||
                      field.type === "date") && (
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
                        <span className="text-slate-400">
                          {fieldTypeIcon(f.type)}
                        </span>
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
