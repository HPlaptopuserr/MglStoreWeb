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
  Tags,
  AlertTriangle,
  Archive,
  Monitor,
  Pencil,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { API, adminFetch, getApiErrorMessage } from "@/lib/api";
import { OrgSearchDropdown } from "@/components/molecules/OrgSearchDropdown";
import { PosRegistersSection } from "@/components/organisms/sections/pos/PosRegistersSection";

type Org = { id: string; name: string; slug: string };

type PartnerPayload = Partial<Org>;

type FeatureToggle = {
  key: string;
  label: string;
  icon: React.ElementType;
  enabled: boolean;
  saving: boolean;
};

const FEATURES = [
  {
    suffix: "contract-archive-enabled",
    label: "Гэрээний архив",
    description:
      "Vendor өөрийн байгууллагын гэрээний мэдээлэл, скан файл, хугацааг бүртгэж хянана.",
    group: "operations",
    icon: Archive,
    defaultEnabled: false,
  },
  {
    suffix: "multi-price-sales-enabled",
    label: "Олон төрлийн борлуулалтын үнэ",
    description:
      "Барааг ширхэгийн, бөөний болон захиалгын үнээс сонгон борлуулна.",
    group: "channels",
    icon: Tags,
    defaultEnabled: false,
  },
  {
    suffix: "pos-enabled",
    label: "POS касс",
    description: "POS дэлгэц болон кассын өдөр тутмын ажиллагааг нээнэ.",
    group: "channels",
    icon: ScanLine,
    defaultEnabled: false,
  },
  {
    suffix: "web-products-enabled",
    label: "Онлайн шоп / Хүнсний дэлгүүр",
    description: "Өөрийн барааг public web болон store каталогт харуулна.",
    group: "channels",
    icon: Store,
    defaultEnabled: false,
  },
  {
    suffix: "supply-products-enabled",
    label: "Нийлүүлэгчийн нэгдсэн каталог",
    description: "Нийлүүлэгч болон төвлөрсөн каталогоос бараа ашиглана.",
    group: "catalog",
    icon: Boxes,
    defaultEnabled: false,
  },
  {
    suffix: "preorder-products-enabled",
    label: "Урьдчилсан захиалгын бараа",
    description: "Нийлүүлэх хугацаатай, урьдчилж захиалдаг барааны урсгал.",
    group: "catalog",
    icon: PackageSearch,
    defaultEnabled: false,
  },
  {
    suffix: "service-posts-enabled",
    label: "Үйлчилгээ нийтлэх",
    description: "Бараанаас тусдаа үйлчилгээний зар болон пост нийтэлнэ.",
    group: "catalog",
    icon: Megaphone,
    defaultEnabled: true,
  },
] as const;

const FEATURE_GROUPS = [
  {
    key: "operations",
    eyebrow: "Үйл ажиллагааны хяналт",
    title: "Vendor дээр ашиглах удирдлагын хэрэгслүүд",
  },
  {
    key: "channels",
    eyebrow: "Борлуулалтын сувгууд",
    title: "Хэрэглэгчид хүрэх сувгууд",
  },
  {
    key: "catalog",
    eyebrow: "Каталогийн боломж",
    title: "Ямар төрлийн контент ашиглах вэ",
  },
] as const;

const GLOBAL_WEB_PRODUCTS_SETTING_KEY = "web-products-enabled";

function parseOrganizations(payload: unknown): Org[] {
  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? ((payload as { data?: unknown; partners?: unknown }).data ??
        (payload as { partners?: unknown }).partners)
      : [];

  if (!Array.isArray(source)) return [];

  return source.flatMap((partner: PartnerPayload) =>
    typeof partner.id === "string" && typeof partner.name === "string"
      ? [
          {
            id: partner.id,
            name: partner.name,
            slug: typeof partner.slug === "string" ? partner.slug : "",
          },
        ]
      : [],
  );
}

export function VendorFeaturesSection() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [error, setError] = useState("");
  const [globalProductsEnabled, setGlobalProductsEnabled] = useState(true);
  const [loadingGlobalProducts, setLoadingGlobalProducts] = useState(true);
  const [savingGlobalProducts, setSavingGlobalProducts] = useState(false);
  const [activePanel, setActivePanel] = useState<"features" | "pos" | null>(
    null,
  );

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
  const organizationWebProductsEnabled =
    toggles.find((toggle) => toggle.key === "web-products-enabled")?.enabled ??
    false;
  const webChannelIsLive =
    globalProductsEnabled && organizationWebProductsEnabled;
  const enabledFeatureCount = toggles.filter((toggle) => toggle.enabled).length;

  useEffect(() => {
    if (!activePanel) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActivePanel(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activePanel]);

  useEffect(() => {
    adminFetch(`${API}/partners?minimal=true`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: unknown) => setOrgs(parseOrganizations(data)))
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
      const res = await adminFetch(
        `${API}/site-settings/vendor-features/${orgId}`,
      );
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
      setToggles(
        FEATURES.map((f) => ({
          key: f.suffix,
          label: f.label,
          icon: f.icon,
          enabled: f.defaultEnabled,
          saving: false,
        })),
      );
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
        const message =
          res.status === 401
            ? "Admin session танигдсангүй. Хуудсаа refresh хийгээд, шаардлагатай бол дахин нэвтэрнэ үү."
            : await getApiErrorMessage(
                res,
                "Тохиргоо хадгалахад алдаа гарлаа.",
              );
        setError(message);
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
    <div className="space-y-4">
      <section className="relative z-20 overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 border-b border-slate-100 p-4 lg:grid-cols-[minmax(280px,420px)_1fr] lg:items-end">
          <OrgSearchDropdown
            orgs={orgs}
            value={selectedOrgId}
            onChange={setSelectedOrgId}
            loading={loadingOrgs}
            label="Байгууллага сонгох"
            className="w-full"
          />

          <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${globalProductsEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
              >
                <Globe2 size={17} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-800">
                  Public web master
                </p>
                <p className="truncate text-xs font-semibold text-slate-400">
                  Бүх байгууллагын каталог
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-pressed={globalProductsEnabled}
              onClick={handleGlobalProductsToggle}
              disabled={loadingGlobalProducts || savingGlobalProducts}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-60 ${globalProductsEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
              aria-label="Public web ерөнхий эрх"
            >
              {loadingGlobalProducts || savingGlobalProducts ? (
                <Loader2
                  size={13}
                  className="absolute left-3.5 top-1.5 animate-spin text-white"
                />
              ) : (
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${globalProductsEnabled ? "translate-x-5" : "translate-x-0.5"}`}
                />
              )}
            </button>
          </div>
        </div>

        {/* feature toggles */}
        {selectedOrgId && (
          <>
            {loadingFeatures ? (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-400">
                <Loader2 size={15} className="animate-spin" /> Ачаалж байна...
              </div>
            ) : (
              <div className="grid gap-3 p-4 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                        <SlidersHorizontal size={19} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-900">
                          Vendor боломжууд
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {enabledFeatureCount}/{toggles.length} боломж нээлттэй
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePanel("features")}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
                    >
                      <Pencil size={14} /> Тохируулах
                    </button>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                        <Monitor size={19} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-900">
                          POS Register
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Касс, терминал, QPay болон eBarimt
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePanel("pos")}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-700 transition hover:bg-cyan-100"
                    >
                      <Pencil size={14} /> Удирдах
                    </button>
                  </div>
                </section>
              </div>
            )}
          </>
        )}

        {!selectedOrgId && (
          <div className="p-6 text-center">
            <p className="text-sm font-bold text-slate-500">
              Удирдах байгууллагаа сонгоно уу
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Vendor болон POS тохиргоо энд гарна.
            </p>
          </div>
        )}

        {selectedOrgId && !loadingFeatures && (
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center gap-2 border-t px-4 py-2.5 text-xs font-bold ${
              organizationWebProductsEnabled && !globalProductsEnabled
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : webChannelIsLive
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-slate-100 bg-slate-50 text-slate-500"
            }`}
          >
            {organizationWebProductsEnabled && !globalProductsEnabled ? (
              <AlertTriangle size={14} />
            ) : webChannelIsLive ? (
              <CheckCircle2 size={14} />
            ) : (
              <XCircle size={14} />
            )}
            {organizationWebProductsEnabled && !globalProductsEnabled
              ? "Байгууллагын web эрх нээлттэй ч master эрх хаалттай байна."
              : webChannelIsLive
                ? `${selectedOrg?.name}: онлайн худалдааны суваг идэвхтэй.`
                : `${selectedOrg?.name}: public web суваг хаалттай.`}
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {activePanel && selectedOrgId && (
        <>
          <button
            type="button"
            aria-label="Тохиргооны цонх хаах"
            onClick={() => setActivePanel(null)}
            className="fixed inset-0 z-40 cursor-default bg-slate-950/50 backdrop-blur-[2px]"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-settings-dialog-title"
            className="fixed inset-x-3 top-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-[#fbfcff] p-4 shadow-2xl sm:inset-x-6 sm:top-6 sm:mx-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-5xl sm:p-5"
          >
            <div className="sticky -top-4 z-30 mb-4 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-1 pb-3 pt-1 sm:-top-5">
              <div>
                <h3
                  id="vendor-settings-dialog-title"
                  className="text-lg font-black text-slate-950"
                >
                  {activePanel === "features"
                    ? "Vendor боломжууд"
                    : "POS Register"}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {selectedOrg?.name} байгууллагын тохиргоо
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Хаах"
              >
                <X size={16} />
              </button>
            </div>

            {activePanel === "features" ? (
              <div className="space-y-4">
                {FEATURE_GROUPS.map((group) => (
                  <section
                    key={group.key}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-500">
                      {group.eyebrow}
                    </p>
                    <h4 className="mt-1 text-base font-black text-slate-950">
                      {group.title}
                    </h4>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      {toggles
                        .filter((toggle) =>
                          FEATURES.some(
                            (feature) =>
                              feature.suffix === toggle.key &&
                              feature.group === group.key,
                          ),
                        )
                        .map((toggle) => {
                          const feature = FEATURES.find(
                            (item) => item.suffix === toggle.key,
                          );
                          return (
                            <VendorFeatureCard
                              key={toggle.key}
                              toggle={toggle}
                              description={feature?.description ?? ""}
                              organizationId={selectedOrgId}
                              onToggle={handleToggle}
                            />
                          );
                        })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <PosRegistersSection organizationId={selectedOrgId} embedded />
            )}
          </section>
        </>
      )}
    </div>
  );
}

interface VendorFeatureCardProps {
  toggle: FeatureToggle;
  description: string;
  organizationId: string;
  onToggle: (key: string) => void;
}

function VendorFeatureCard({
  toggle,
  description,
  organizationId,
  onToggle,
}: VendorFeatureCardProps) {
  const Icon = toggle.icon;

  return (
    <article
      className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center ${
        toggle.enabled
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-slate-200 bg-slate-50/70"
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            toggle.enabled
              ? "bg-white text-emerald-600 shadow-sm"
              : "bg-white text-slate-400"
          }`}
        >
          <Icon size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">{toggle.label}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {description}
          </p>
          <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">
            {toggle.key}-{organizationId.slice(0, 8)}…
          </p>
        </div>
      </div>

      <button
        type="button"
        aria-pressed={toggle.enabled}
        onClick={() => onToggle(toggle.key)}
        disabled={toggle.saving}
        className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
          toggle.enabled
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            : "bg-white text-slate-600 shadow-sm hover:bg-slate-100"
        }`}
      >
        {toggle.saving ? (
          <Loader2 size={14} className="animate-spin" />
        ) : toggle.enabled ? (
          <CheckCircle2 size={14} />
        ) : (
          <XCircle size={14} />
        )}
        {toggle.enabled ? "НЭЭЛТТЭЙ" : "ХААЛТТАЙ"}
      </button>
    </article>
  );
}
