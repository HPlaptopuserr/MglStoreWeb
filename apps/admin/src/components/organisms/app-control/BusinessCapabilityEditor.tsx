"use client";

import { useState } from "react";
import { BUSINESS_CAPABILITY_OPTIONS } from "@mgl/types";
import { Loader2 } from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import type {
  BusinessAppFeatures,
  BusinessAppMember,
} from "./mgl-business.model";

export function BusinessCapabilityEditor({
  organizationId,
  member,
  features,
  onCancel,
  onSaved,
  onSavingChange,
}: {
  organizationId: string;
  member: BusinessAppMember;
  features: BusinessAppFeatures;
  onCancel: () => void;
  onSaved: (capabilities: string[]) => void;
  onSavingChange: (saving: boolean) => void;
}) {
  const [selected, setSelected] = useState(
    () => new Set(member.capabilities ?? []),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const original = member.capabilities ?? [];
  const dirty =
    selected.size !== original.length ||
    original.some((item) => !selected.has(item));

  async function save() {
    setSaving(true);
    onSavingChange(true);
    setError("");
    try {
      const response = await adminFetch(
        `${API}/admin/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(member.id)}/capabilities`,
        {
          method: "PATCH",
          body: JSON.stringify({
            capabilities: [...selected],
            expectedCapabilities: original,
          }),
        },
      );
      const data: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
            ? data.message
            : "Эрх хадгалахад алдаа гарлаа.";
        throw new Error(message);
      }
      if (
        typeof data !== "object" ||
        data === null ||
        !("capabilities" in data) ||
        !Array.isArray(data.capabilities) ||
        !data.capabilities.every(
          (value): value is string => typeof value === "string",
        )
      )
        throw new Error(
          "Серверийн хариу буруу байна. Жагсаалтаа шинэчлэнэ үү.",
        );
      onSaved(data.capabilities);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Эрх хадгалахад алдаа гарлаа.",
      );
    } finally {
      setSaving(false);
      onSavingChange(false);
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
      <h4 className="font-bold text-slate-900">
        {member.fullName || member.email || "Ажилтан"} · Эрх өөрчлөх
      </h4>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Нэгээс олон эрх сонгож болно. Унтраалттай аппын хуучин эрхийг цуцалж
        болно; шинээр олгохын өмнө байгууллагад аппыг нээнэ.
      </p>
      <fieldset disabled={saving} className="mt-4 grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Ажилтны аппын эрхүүд</legend>
        {Object.entries(BUSINESS_CAPABILITY_OPTIONS).map(([key, option]) => {
          const enabled = features[option.feature];
          return (
            <label
              key={key}
              className={`flex items-start gap-3 rounded-lg border bg-white p-3 text-sm ${!enabled ? "border-slate-100 text-slate-500" : "border-indigo-100 text-slate-900"}`}
            >
              <input
                type="checkbox"
                checked={selected.has(key)}
                disabled={!enabled && !selected.has(key)}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
                onChange={(event) => {
                  const checked = event.target.checked;
                  setSelected((current) => {
                    const next = new Set(current);
                    if (checked) next.add(key);
                    else next.delete(key);
                    return next;
                  });
                }}
              />
              <span>
                {option.label}
                {!enabled && (
                  <span className="mt-1 block text-xs">
                    Байгууллагад унтраалттай
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:opacity-50"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Хадгалж байна…" : "Ажилтны эрх хадгалах"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Болих
        </button>
      </div>
    </div>
  );
}
