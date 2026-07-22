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

export function FormResponsesView({
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
    const headers = ["#", ...dataFields.map((f) => f.label), "Илгээсэн огноо"];
    const rows = responses.map((r, i) => [
      String(i + 1),
      ...dataFields.map((f) => cellValue(r, f.id)),
      new Date(r.submittedAt).toLocaleString("mn-MN"),
    ]);

    const csv =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) => row.map(escapeCSV).join(","))
        .join("\r\n");

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
            <p className="text-xs font-medium text-sky-500">Сүүлийн хариулт</p>
          </div>
        </div>
      )}
    </>
  );
}
