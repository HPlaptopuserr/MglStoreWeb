"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Boxes,
  Megaphone,
  PackageSearch,
  ScanLine,
  Store,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import { OrgSearchDropdown } from "@/components/molecules/OrgSearchDropdown";

type Org = { id: string; name: string; slug: string };

type FeatureToggle = {
  key: string;
  label: string;
  icon: React.ElementType;
  enabled: boolean;
  saving: boolean;
};

const FEATURES = [
  { suffix: "pos-enabled", label: "POS касс", icon: ScanLine, defaultEnabled: false },
  { suffix: "web-products-enabled", label: "Web дээр өөрийн бараа", icon: Store, defaultEnabled: false },
  { suffix: "supply-products-enabled", label: "Нэгдсэн бараа", icon: Boxes, defaultEnabled: false },
  { suffix: "preorder-products-enabled", label: "Захиалгын бараа", icon: PackageSearch, defaultEnabled: false },
  { suffix: "service-posts-enabled", label: "Үйлчилгээний постууд", icon: Megaphone, defaultEnabled: true },
];

export function VendorFeaturesSection() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [error, setError] = useState("");

  const [toggles, setToggles] = useState<FeatureToggle[]>(
    FEATURES.map((f) => ({
      key: f.suffix,
      label: f.label,
      icon: f.icon,
      enabled: f.defaultEnabled,
      saving: false,
    })),
  );

  useEffect(() => {
    adminFetch(`${API}/partners?minimal=true`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data || data?.partners || [];
        setOrgs(list.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug ?? "" })));
      })
      .catch(() => setError("Байгууллагын жагсаалт авахад алдаа гарлаа."))
      .finally(() => setLoadingOrgs(false));
  }, []);

  const loadFeatures = useCallback(async (orgId: string) => {
    if (!orgId) return;
    setLoadingFeatures(true);
    setError("");
    try {
      const res = await adminFetch(`${API}/site-settings`);
      const settings = res.ok ? ((await res.json()) as Record<string, string>) : {};
      setToggles((prev) =>
        prev.map((t) => {
          const raw = settings[`${t.key}-${orgId}`];
          const feature = FEATURES.find((f) => f.suffix === t.key);
          const defaultEnabled = feature?.defaultEnabled ?? false;
          const enabled =
            raw === undefined
              ? defaultEnabled
              : raw === "1" || raw === "true" || raw === "on";
          return { ...t, enabled, saving: false };
        }),
      );
    } catch {
      setError("Тохиргоог авахад алдаа гарлаа.");
    } finally {
      setLoadingFeatures(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOrgId) loadFeatures(selectedOrgId);
    else
      setToggles(FEATURES.map((f) => ({ key: f.suffix, label: f.label, icon: f.icon, enabled: f.defaultEnabled, saving: false })));
  }, [selectedOrgId, loadFeatures]);

  const handleToggle = async (key: string) => {
    if (!selectedOrgId) return;
    const idx = toggles.findIndex((t) => t.key === key);
    if (idx < 0) return;
    const next = !toggles[idx].enabled;

    setToggles((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, saving: true } : t)),
    );

    try {
      const res = await adminFetch(
        `${API}/site-settings/${key}-${selectedOrgId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: next ? "true" : "false" }),
        },
      );
      if (res.ok) {
        setToggles((prev) =>
          prev.map((t, i) =>
            i === idx ? { ...t, enabled: next, saving: false } : t,
          ),
        );
      } else {
        setError("Тохиргоо хадгалахад алдаа гарлаа.");
        setToggles((prev) =>
          prev.map((t, i) => (i === idx ? { ...t, saving: false } : t)),
        );
      }
    } catch {
      setError("Сервертэй холбогдоход алдаа гарлаа.");
      setToggles((prev) =>
        prev.map((t, i) => (i === idx ? { ...t, saving: false } : t)),
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          Vendor цэсний тохиргоо
        </h2>
        <p className="text-sm text-slate-400">
          Байгууллага бүрт ямар цэс харагдахыг удирдана. Default-аар бүгд
          хаалттай, энд нээнэ.
        </p>
      </div>

      {/* org selector */}
      <OrgSearchDropdown
        orgs={orgs}
        value={selectedOrgId}
        onChange={setSelectedOrgId}
        loading={loadingOrgs}
        label="Байгууллага сонгох"
        className="w-80"
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* feature toggles */}
      {selectedOrgId && (
        <>
          {loadingFeatures ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
              <Loader2 size={15} className="animate-spin" /> Ачаалж байна...
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {toggles.map((t) => (
                <div
                  key={t.key}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        t.enabled
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <t.icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {t.label}
                      </p>
                      <p className="text-xs text-slate-400">
                        {t.key}-{selectedOrgId.slice(0, 8)}…
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggle(t.key)}
                    disabled={t.saving}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                      t.enabled
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t.saving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : t.enabled ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <XCircle size={14} />
                    )}
                    {t.enabled ? "НЭЭЛТТЭЙ" : "ХААЛТТАЙ"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
