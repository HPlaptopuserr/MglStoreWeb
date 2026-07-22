import type React from "react";
import {
  Building2,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { NetworkPartner, TeamDepartment } from "./team.types";

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 transition-all";

export function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

export function DepartmentManager({
  departments,
  input,
  draft,
  editing,
  saving,
  onInputChange,
  onDraftChange,
  onCreate,
  onStartRename,
  onCancelRename,
  onRename,
  onDelete,
}: {
  departments: TeamDepartment[];
  input: string;
  draft: string;
  editing: string | null;
  saving: boolean;
  onInputChange: (value: string) => void;
  onDraftChange: (value: string) => void;
  onCreate: () => void;
  onStartRename: (department: string) => void;
  onCancelRename: () => void;
  onRename: () => void;
  onDelete: (department: TeamDepartment) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm">
            <Building2 size={17} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Алба хэлтэс нэмэх
            </h3>
            <p className="text-xs font-medium text-slate-500">
              Шинэ хэлтэс үүсгээд ажилчдын form дээр сонгодог болно.
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCreate();
              }
            }}
            placeholder="Шинэ хэлтэс нэмэх..."
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            onClick={onCreate}
            disabled={saving || !input.trim()}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Нэмэх
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Үүссэн алба хэлтэс засах
            </h3>
            <p className="text-xs font-medium text-slate-400">
              Нэр солих үед тухайн хэлтэстэй ажилчдын мэдээлэл хамт
              шинэчлэгдэнэ.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
            {departments.length} хэлтэс
          </span>
        </div>

        {departments.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-400">
            Одоогоор үүссэн хэлтэс байхгүй байна.
          </div>
        ) : (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {departments.map((department) => {
              const isEditing = editing === department.name;
              return (
                <div
                  key={department.name}
                  className={`min-w-0 rounded-xl border px-3 py-3 transition-colors ${
                    isEditing
                      ? "border-violet-200 bg-violet-50/70"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-violet-500">
                        Хэлтсийн нэр засах
                      </label>
                      <input
                        value={draft}
                        onChange={(e) => onDraftChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            onRename();
                          }
                          if (e.key === "Escape") onCancelRename();
                        }}
                        autoFocus
                        className={`${inputCls} bg-white`}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={onRename}
                          disabled={saving || !draft.trim()}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {saving ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          Хадгалах
                        </button>
                        <button
                          type="button"
                          onClick={onCancelRename}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          <X size={14} />
                          Болих
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900">
                          {department.name}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                          {department.count} ажилчин холбоотой
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onStartRename(department.name)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                        >
                          <Pencil size={12} />
                          Засах
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(department)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          Устгах
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function NetworkPartnersPreview({
  partners,
}: {
  partners: NetworkPartner[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900">
            Сүлжээ компаниуд
          </h3>
          <p className="text-xs font-medium text-slate-400">
            Энэ хэсэг түнш байгууллагын бүртгэлээс шууд татагдаж public team
            page дээр харагдана.
          </p>
        </div>
        <a
          href="/partners"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Түнш байгууллага засах
        </a>
      </div>

      {partners.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-400">
          Түнш байгууллага байхгүй байна.
        </div>
      ) : (
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {partners.slice(0, 9).map((partner) => (
            <a
              key={partner.id}
              href={`/partners/${partner.id}`}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition-colors hover:border-violet-200 hover:bg-violet-50/60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-slate-400 shadow-sm">
                {partner.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={partner.logoUrl}
                    alt={partner.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 size={16} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-black text-slate-900">
                    {partner.name}
                  </p>
                  {partner.isInvestor && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
                      investor
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] font-semibold text-slate-400">
                  {partner.businessCategory ||
                    partner.shortDescription ||
                    "Түнш байгууллага"}
                </p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-400">
                {partner.stats?.branches ?? 0} салбар
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function SuggestionPills({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="mt-2 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto pr-1">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              active
                ? "border-violet-200 bg-violet-600 text-white shadow-sm shadow-violet-100"
                : "border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
