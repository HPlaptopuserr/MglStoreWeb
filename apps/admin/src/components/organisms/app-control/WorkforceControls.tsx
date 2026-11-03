"use client";
import { useEffect, useState, type FormEvent } from "react";
import { WorkforceAddonPrices } from "./WorkforceAddonPrices";
import { Clock3, Loader2 } from "lucide-react";
import {
  defaultWorkforceFeatures,
  workforceFeatures,
  type WorkforceFeatureFlags,
} from "@mgl/types";
import { API, adminFetch } from "@/lib/api";
interface WorkforceControlsData {
  features: WorkforceFeatureFlags;
  subscription: {
    planName: string;
    expiresAt: string | null;
    seatUnitPrice: number | null;
    currency: string;
    addons: string[];
  };
}
const labels: Record<keyof WorkforceFeatureFlags, string> = {
  dashboard: "Нүүр самбар",
  reports: "Цагийн тайлан",
  requests: "Цагийн хүсэлт",
  employees: "Ажилтан",
  departments: "Алба, хэлтэс",
  schedules: "Ажлын хуваарь",
  locations: "Байршил",
  notifications: "Мэдэгдэл",
  analytics: "Аналитик",
  integrations: "API холболт",
};
export function WorkforceControls({
  organizationId,
}: {
  organizationId: string;
}) {
  const [data, setData] = useState<WorkforceControlsData | null>(null),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    void adminFetch(
      `${API}/admin/organizations/${organizationId}/workforce-controls`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        const result = (await r.json()) as WorkforceControlsData & {
          message?: string;
        };
        if (!r.ok)
          throw new Error(
            result.message ?? "Цаг удирдлагын тохиргоо ачаалсангүй",
          );
        if (!controller.signal.aborted) setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Алдаа");
      });
    return () => controller.abort();
  }, [organizationId, revision]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await adminFetch(
        `${API}/admin/organizations/${organizationId}/workforce-controls`,
        {
          method: "PATCH",
          body: JSON.stringify({
            features: data.features,
            subscription: {
              planName: form.get("planName"),
              expiresAt: form.get("expiresAt")
                ? `${form.get("expiresAt")}T23:59:59Z`
                : null,
              seatUnitPrice: form.get("seatUnitPrice")
                ? Number(form.get("seatUnitPrice"))
                : null,
              addons: form.getAll("addons"),
            },
          }),
        },
      );
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Хадгалж чадсангүй");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
      <div className="mb-4 flex items-center gap-3">
        <Clock3 className="text-blue-600" />
        <div>
          <h3 className="font-bold text-slate-900">
            Цаг удирдлага · Business web
          </h3>
          <p className="text-xs text-slate-500">
            Байгууллагын цаг удирдлагын модуль, багц, үнэ, гэрээний хугацаа.
          </p>
        </div>
      </div>
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => setRevision((v) => v + 1)}
            className="ml-3 underline"
          >
            Дахин оролдох
          </button>
        </div>
      )}
      {!data && !error ? (
        <Loader2 className="animate-spin" />
      ) : (
        data && (
          <form onSubmit={save}>
            <fieldset disabled={saving} className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {workforceFeatures.map((feature) => (
                  <label
                    key={feature}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={
                        data.features[feature] ??
                        defaultWorkforceFeatures[feature]
                      }
                      onChange={(e) => {
                        setSaved(false);
                        setData({
                          ...data,
                          features: {
                            ...data.features,
                            [feature]: e.target.checked,
                          },
                        });
                      }}
                    />
                    {labels[feature]}
                  </label>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  Багцын нэр
                  <input
                    name="planName"
                    defaultValue={data.subscription.planName}
                    required
                    maxLength={100}
                    className="rounded-lg border border-slate-200 bg-white p-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  Гэрээ дуусах
                  <input
                    name="expiresAt"
                    type="date"
                    defaultValue={
                      data.subscription.expiresAt?.slice(0, 10) ?? ""
                    }
                    className="rounded-lg border border-slate-200 bg-white p-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  Нэг ажилтны сарын үнэ (₮)
                  <input
                    name="seatUnitPrice"
                    type="number"
                    min={1}
                    max={100000000}
                    defaultValue={data.subscription.seatUnitPrice ?? ""}
                    className="rounded-lg border border-slate-200 bg-white p-2 text-sm"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-5">
                {[
                  ["tracking", "Байршлын трекинг"],
                  ["mail", "Масс имэйл"],
                ].map(([code, label]) => (
                  <label
                    key={code}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <input
                      type="checkbox"
                      name="addons"
                      value={code}
                      defaultChecked={data.subscription.addons.includes(code)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Хадгалж байна…"
                    : "Цаг удирдлагын тохиргоо хадгалах"}
                </button>
                {saved && (
                  <span role="status" className="text-sm text-emerald-700">
                    Хадгалагдлаа
                  </span>
                )}
              </div>
            </fieldset>
          </form>
        )
      )}
      <div className="mt-5">
        <WorkforceAddonPrices />
      </div>
    </section>
  );
}
