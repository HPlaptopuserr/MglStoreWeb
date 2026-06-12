"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Boxes,
  Megaphone,
  PackageSearch,
  ScanLine,
  Store,
  Globe2,
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

const GLOBAL_WEB_PRODUCTS_SETTING_KEY = "web-products-enabled";

export function VendorFeaturesSection() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [error, setError] = useState("");
  const [globalProductsEnabled, setGlobalProductsEnabled] = useState(true);
  const [loadingGlobalProducts, setLoadingGlobalProducts] = useState(true);
  const [savingGlobalProducts, setSavingGlobalProducts] = useState(false);

  const [toggles, setToggles] = useState<FeatureToggle[]>(
    FEATURES.map((f) => ({
      key: f.suffix,
      label: f.label,
      icon: f.icon,
      enabled: f.defaultEnabled,
      saving: false,
    })),
  );

  const selectedOrg = orgs.find((org) => org.id === selectedOrgId) || null;

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

  useEffect(() => {
    adminFetch(`${API}/site-settings/admin`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((settings) => {
        const raw = settings?.[GLOBAL_WEB_PRODUCTS_SETTING_KEY];
        setGlobalProductsEnabled(
          raw === undefined || raw === null || raw === ""
            ? true
            : raw === "1" || raw === "true" || raw === "on",
        );
      })
      .catch(() => setError("Web бүтээгдэхүүний тохиргоо авахад алдаа гарлаа."))
      .finally(() => setLoadingGlobalProducts(false));
  }, []);

  const loadFeatures = useCallback(async (orgId: string) => {
    if (!orgId) return;
    setLoadingFeatures(true);
    setError("");
    try {
      const res = await adminFetch(`${API}/site-settings/vendor-features/${orgId}`);
      if (!res.ok) {
        throw new Error(res.status === 401 ? "unauthorized" : "failed");
      }
      const settings = (await res.json()) as Record<string, string>;
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
    } catch (error) {
      setError(
        error instanceof Error && error.message === "unauthorized"
          ? "Admin session танигдсангүй. Хуудсаа refresh хийгээд, шаардлагатай бол дахин нэвтэрнэ үү."
          : "Тохиргоог авахад алдаа гарлаа.",
      );
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
        `${API}/site-settings/vendor-features/${selectedOrgId}/${key}`,
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
        setError(
          res.status === 401
            ? "Admin session танигдсангүй. Хуудсаа refresh хийгээд, шаардлагатай бол дахин нэвтэрнэ үү."
            : "Тохиргоо хадгалахад алдаа гарлаа.",
        );
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

  const handleGlobalProductsToggle = async () => {
    const next = !globalProductsEnabled;
    setSavingGlobalProducts(true);
    setError("");

    try {
      const res = await adminFetch(
        `${API}/site-settings/${GLOBAL_WEB_PRODUCTS_SETTING_KEY}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: next ? "true" : "false" }),
        },
      );

      if (!res.ok) {
        throw new Error(res.status === 401 ? "unauthorized" : "failed");
      }

      setGlobalProductsEnabled(next);
    } catch (error) {
      setError(
        error instanceof Error && error.message === "unauthorized"
          ? "Admin session танигдсангүй. Хуудсаа refresh хийгээд, шаардлагатай бол дахин нэвтэрнэ үү."
          : "Web бүтээгдэхүүний тохиргоо хадгалахад алдаа гарлаа.",
      );
    } finally {
      setSavingGlobalProducts(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <Store size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
                Vendor app
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                Vendor тохиргоо
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                Байгууллага бүрт vendor болон org дээр ямар module нээлттэй
                харагдахыг удирдана.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              globalProductsEnabled
                ? "bg-emerald-50 text-emerald-600"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <Globe2 size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              Web дээр бүх бүтээгдэхүүн
            </p>
            <p className="text-xs text-slate-400">
              {GLOBAL_WEB_PRODUCTS_SETTING_KEY}
            </p>
          </div>
          </div>

          <button
            type="button"
            onClick={handleGlobalProductsToggle}
            disabled={loadingGlobalProducts || savingGlobalProducts}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:opacity-60 ${
              globalProductsEnabled
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {loadingGlobalProducts || savingGlobalProducts ? (
              <Loader2 size={14} className="animate-spin" />
            ) : globalProductsEnabled ? (
              <CheckCircle2 size={14} />
            ) : (
              <XCircle size={14} />
            )}
            {globalProductsEnabled ? "Нээлттэй" : "Хаалттай"}
          </button>
        </div>
      </div>

      <div className="relative z-20 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-end">
          <OrgSearchDropdown
            orgs={orgs}
            value={selectedOrgId}
            onChange={setSelectedOrgId}
            loading={loadingOrgs}
            label="Байгууллага сонгох"
            className="w-full"
          />

          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Сонгосон байгууллага
            </p>
            <p className="mt-1 truncate text-sm font-black text-slate-800">
              {selectedOrg ? selectedOrg.name : "Эхлээд байгууллага сонгоно уу"}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
              {selectedOrg?.slug ? `@${selectedOrg.slug}` : `${orgs.length} байгууллагаас хайж сонгоно`}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* feature toggles */}
      {selectedOrgId && (
        <>
          {loadingFeatures ? (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-400">
              <Loader2 size={15} className="animate-spin" /> Ачаалж байна...
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {toggles.map((t) => (
                <div
                  key={t.key}
                  className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
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
                      <p className="text-xs font-semibold text-slate-400">
                        {t.key}-{selectedOrgId.slice(0, 8)}…
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggle(t.key)}
                    disabled={t.saving}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:opacity-60 ${
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
