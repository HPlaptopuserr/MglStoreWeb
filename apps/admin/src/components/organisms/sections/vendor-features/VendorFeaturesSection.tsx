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
  Info,
  AlertTriangle,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import { OrgSearchDropdown } from "@/components/molecules/OrgSearchDropdown";

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
    suffix: "pos-enabled",
    label: "POS касс",
    description: "POS дэлгэц болон кассын өдөр тутмын ажиллагааг нээнэ.",
    group: "channels",
    icon: ScanLine,
    defaultEnabled: false,
  },
  {
    suffix: "web-products-enabled",
    label: "Web дэлгүүрт бараа нийтлэх",
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

        <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                globalProductsEnabled
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <Globe2 size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Public web бүтээгдэхүүний ерөнхий эрх
              </p>
              <p className="text-xs text-slate-400">
                Бүх байгууллагын public каталогийн master switch
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-pressed={globalProductsEnabled}
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
              {selectedOrg?.slug
                ? `@${selectedOrg.slug}`
                : `${orgs.length} байгууллагаас хайж сонгоно`}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-bold text-blue-950">
              Public суваг болон Vendor боломж
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-blue-700">
              Энэ хэсэг MGL Business mobile app-ийн дотоод “Бараа, агуулах”
              эрхээс тусдаа. System admin visibility хязгаарлалтыг тойрч харах
              боломжтой тул public үр дүнг guest горимоор шалгана уу.
            </p>
          </div>
        </div>
      </div>

      {selectedOrgId &&
        organizationWebProductsEnabled &&
        !globalProductsEnabled && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-amber-600"
              />
              <div>
                <p className="text-sm font-bold text-amber-950">
                  Байгууллагын web эрх нээлттэй боловч global эрх хаалттай
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
                  Энэ байгууллагын бараа public хэрэглэгчдэд харагдахгүй.
                  Ерөнхий эрхийг нээсний дараа байгууллагын тохиргоо үйлчилнэ.
                </p>
              </div>
            </div>
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
            <div className="space-y-5">
              {FEATURE_GROUPS.map((group) => (
                <section
                  key={group.key}
                  aria-labelledby={`vendor-feature-group-${group.key}`}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">
                    {group.eyebrow}
                  </p>
                  <h3
                    id={`vendor-feature-group-${group.key}`}
                    className="mt-1 text-lg font-black text-slate-950"
                  >
                    {group.title}
                  </h3>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
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
          )}
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
