"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  BellRing,
  BrainCircuit,
  CalendarClock,
  Check,
  ClipboardList,
  Clock3,
  Loader2,
  Package,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Users,
  ChartNoAxesCombined,
  FileChartColumnIncreasing,
  ShieldAlert,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

import {
  CEO_SERVICE_OPTIONS,
  DEFAULT_CEO_SERVICE,
  DEFAULT_FEATURES,
  DEFAULT_SETTINGS,
  FEATURE_OPTIONS,
  ROLE_LABEL,
  ROLE_OPTIONS,
  filterOrganizations,
  hasFeatureDiff,
  normalizeBusinessAppControl,
  type AppFeatureOption,
  type BusinessAppControl,
  type BusinessAppFeatures,
  type BusinessAppMember,
  type BusinessAppRole,
  type BusinessAppSettings,
  type CeoServiceControls,
} from "./mgl-business.model";
export function MglBusinessTab() {
  const [controls, setControls] = useState<BusinessAppControl[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [organizationSearch, setOrganizationSearch] = useState("");
  const [draftFeatures, setDraftFeatures] =
    useState<BusinessAppFeatures>(DEFAULT_FEATURES);
  const [draftSettings, setDraftSettings] =
    useState<BusinessAppSettings>(DEFAULT_SETTINGS);
  const [draftCeoService, setDraftCeoService] =
    useState<CeoServiceControls>(DEFAULT_CEO_SERVICE);
  const [draftMaxMembers, setDraftMaxMembers] = useState("5");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingControls, setSavingControls] = useState(false);
  const [savingRoleUserId, setSavingRoleUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const selectedOrg = controls.find((item) => item.id === selectedOrgId);
  const filteredOrganizations = useMemo(
    () => filterOrganizations(controls, organizationSearch),
    [controls, organizationSearch],
  );
  const enabledFeatureCount = FEATURE_OPTIONS.filter(
    (feature) => draftFeatures[feature.key],
  ).length;
  const controlsDirty = Boolean(
    selectedOrg &&
    (draftMaxMembers !== String(selectedOrg.maxMembers) ||
      hasFeatureDiff(draftFeatures, selectedOrg.features) ||
      draftSettings.attendanceManual !==
        selectedOrg.settings.attendanceManual ||
      JSON.stringify(draftCeoService) !==
        JSON.stringify(selectedOrg.ceoService)),
  );

  const loadControls = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    setError("");

    try {
      const response = await adminFetch(
        `${API}/admin/organizations/app-controls`,
      );
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const serverMessage =
          payload &&
          typeof payload === "object" &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : null;
        throw new Error(
          serverMessage ??
            `Байгууллагын app control татахад алдаа гарлаа (${response.status})`,
        );
      }

      const organizations = (
        (await response.json()) as BusinessAppControl[]
      ).map(normalizeBusinessAppControl);
      setControls(organizations);

      const nextSelected =
        organizations.find((item) => item.id === selectedOrgId) ??
        organizations[0];
      if (nextSelected) {
        setSelectedOrgId(nextSelected.id);
        setDraftFeatures(nextSelected.features);
        setDraftSettings(nextSelected.settings);
        setDraftCeoService(nextSelected.ceoService);
        setDraftMaxMembers(String(nextSelected.maxMembers));
      } else {
        setSelectedOrgId("");
        setDraftFeatures(DEFAULT_FEATURES);
        setDraftSettings(DEFAULT_SETTINGS);
        setDraftCeoService(DEFAULT_CEO_SERVICE);
        setDraftMaxMembers("5");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "App control татахад алдаа гарлаа",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadControls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectOrganization = (organizationId: string) => {
    const organization = controls.find((item) => item.id === organizationId);
    setSelectedOrgId(organizationId);
    setSaved(false);
    setError("");
    if (!organization) return;
    setDraftFeatures(organization.features);
    setDraftSettings(organization.settings);
    setDraftCeoService(organization.ceoService);
    setDraftMaxMembers(String(organization.maxMembers));
  };

  const toggleFeature = (key: keyof BusinessAppFeatures) => {
    setDraftFeatures((current) => ({ ...current, [key]: !current[key] }));
    setSaved(false);
  };

  const toggleSetting = (key: keyof BusinessAppSettings) => {
    setDraftSettings((current) => ({ ...current, [key]: !current[key] }));
    setSaved(false);
  };

  const toggleCeoService = (key: keyof CeoServiceControls) => {
    setDraftCeoService((current) => ({ ...current, [key]: !current[key] }));
    setSaved(false);
  };

  const handleSaveControls = async () => {
    if (!selectedOrg) return;
    setSavingControls(true);
    setError("");
    setSaved(false);

    try {
      const nextMaxMembers = Number(draftMaxMembers);
      if (!Number.isInteger(nextMaxMembers) || nextMaxMembers < 1) {
        throw new Error("Ажилчдын лимит 1-ээс их бүхэл тоо байна");
      }
      if (nextMaxMembers < selectedOrg.activeMembers) {
        throw new Error(
          `Одоо ${selectedOrg.activeMembers} идэвхтэй ажилтантай тул лимит түүнээс бага байж болохгүй`,
        );
      }

      const response = await adminFetch(
        `${API}/admin/organizations/${selectedOrg.id}/app-controls`,
        {
          method: "PATCH",
          body: JSON.stringify({
            maxMembers: nextMaxMembers,
            features: draftFeatures,
            settings: draftSettings,
            ceoService: draftCeoService,
          }),
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message || "App control хадгалахад алдаа гарлаа");
      }

      const updated = normalizeBusinessAppControl(
        (await response.json()) as BusinessAppControl,
      );
      setControls((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setDraftFeatures(updated.features);
      setDraftSettings(updated.settings);
      setDraftCeoService(updated.ceoService);
      setDraftMaxMembers(String(updated.maxMembers));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "App control хадгалахад алдаа гарлаа",
      );
    } finally {
      setSavingControls(false);
    }
  };

  const handleRoleChange = async (
    member: BusinessAppMember,
    role: BusinessAppRole,
  ) => {
    if (!selectedOrg || member.role === role || member.role === "OWNER") return;
    setSavingRoleUserId(member.userId);
    setError("");
    setSaved(false);

    try {
      const response = await adminFetch(
        `${API}/partners/${selectedOrg.id}/members/${member.userId}/role`,
        {
          method: "PATCH",
          body: JSON.stringify({ role }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        members?: BusinessAppMember[];
      };
      if (!response.ok) {
        throw new Error(body.message || "Role солиход алдаа гарлаа");
      }

      setControls((current) =>
        current.map((organization) =>
          organization.id === selectedOrg.id
            ? { ...organization, members: body.members ?? organization.members }
            : organization,
        ),
      );
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Role солиход алдаа гарлаа",
      );
    } finally {
      setSavingRoleUserId(null);
    }
  };

  if (loading) {
    return <BusinessControlsLoading />;
  }

  return (
    <div className="p-6">
      <BusinessControlsHeader
        refreshing={refreshing}
        onRefresh={() => void loadControls("refresh")}
      />

      {error && <BusinessControlsError message={error} />}

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <OrganizationPicker
            organizations={filteredOrganizations}
            selectedOrg={selectedOrg}
            search={organizationSearch}
            onSearchChange={setOrganizationSearch}
            onSelect={selectOrganization}
          />

          {selectedOrg ? (
            <div className="space-y-5">
              <SelectedOrganizationSummary
                organization={selectedOrg}
                enabledFeatureCount={enabledFeatureCount}
              />

              <FeatureControlsGrid
                features={draftFeatures}
                onToggle={toggleFeature}
              />

              <AttendanceBehaviorControls
                settings={draftSettings}
                onToggle={toggleSetting}
              />

              <SalesRepresentativeBehaviorControls
                settings={draftSettings}
                onToggle={toggleSetting}
              />

              <CeoServiceControlPanel
                controls={draftCeoService}
                onToggle={toggleCeoService}
              />

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <AppScopeNote />
                <MemberLimitCard
                  activeMembers={selectedOrg.activeMembers}
                  value={draftMaxMembers}
                  onChange={setDraftMaxMembers}
                />
              </div>

              <MemberRoleControls
                members={selectedOrg.members ?? []}
                savingRoleUserId={savingRoleUserId}
                onRoleChange={handleRoleChange}
              />
            </div>
          ) : (
            <EmptyOrganizationState />
          )}
        </div>

        <BusinessControlsFooter
          disabled={!selectedOrg || !controlsDirty || savingControls}
          saved={saved}
          saving={savingControls}
          onSave={handleSaveControls}
        />
      </section>
    </div>
  );
}

function BusinessControlsHeader({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 shadow-lg shadow-slate-200">
          <SlidersHorizontal size={22} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
            MGL Business app
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Байгууллагын app тохиргоо
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Сонгосон байгууллагад app-ийн ямар module харагдах, хэдэн ажилтан
            ашиглах эрхтэйг эндээс удирдана.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        Шинэчлэх
      </button>
    </div>
  );
}

function BusinessControlsLoading() {
  return (
    <div className="flex min-h-[420px] items-center justify-center p-20">
      <div className="flex flex-col items-center gap-3 text-sm font-bold text-slate-500">
        <Loader2 size={30} className="animate-spin text-emerald-500" />
        App control ачааллаж байна
      </div>
    </div>
  );
}

function BusinessControlsError({ message }: { message: string }) {
  return (
    <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
      {message}
    </div>
  );
}

function OrganizationPicker({
  organizations,
  selectedOrg,
  search,
  onSearchChange,
  onSelect,
}: {
  organizations: BusinessAppControl[];
  selectedOrg?: BusinessAppControl;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (organizationId: string) => void;
}) {
  return (
    <aside className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        Байгууллага
      </label>

      <div className="relative">
        <Search
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Нэр эсвэл slug хайх..."
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {organizations.map((organization) => {
          const selected = organization.id === selectedOrg?.id;
          return (
            <button
              key={organization.id}
              type="button"
              onClick={() => onSelect(organization.id)}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                selected
                  ? "border-emerald-200 bg-white shadow-sm ring-2 ring-emerald-100"
                  : "border-transparent bg-white/70 hover:border-slate-200 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">
                    {organization.name}
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                    {organization.slug}
                  </p>
                </div>
                {selected && (
                  <Check size={18} className="shrink-0 text-emerald-600" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {organizations.length === 0 && (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-bold text-slate-500">
          Байгууллага олдсонгүй.
        </div>
      )}
    </aside>
  );
}

function SelectedOrganizationSummary({
  organization,
  enabledFeatureCount,
}: {
  organization: BusinessAppControl;
  enabledFeatureCount: number;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
            <Building2 size={20} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-slate-950">
              {organization.name}
            </p>
            <p className="mt-1 truncate text-xs font-bold text-slate-400">
              {organization.slug}
            </p>
          </div>
        </div>
      </div>

      <SummaryMetric
        label="Идэвхтэй ажилтан"
        value={`${organization.activeMembers} / ${organization.maxMembers}`}
        icon={Users}
      />
      <SummaryMetric
        label="Нээлттэй module"
        value={`${enabledFeatureCount} / ${FEATURE_OPTIONS.length}`}
        icon={ShieldCheck}
      />
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <Icon size={18} className="mb-3 text-emerald-600" />
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function FeatureControlsGrid({
  features,
  onToggle,
}: {
  features: BusinessAppFeatures;
  onToggle: (key: keyof BusinessAppFeatures) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Дотоод ажиллагаа
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">
            MGL Business app-д харагдах хэсгүүд
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Эдгээр нь ажилтны mobile app-д нөлөөлнө. Web дэлгүүрт бараа нийтлэх
            эрхийг Vendor тохиргооноос удирдана.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {FEATURE_OPTIONS.map((feature) => (
          <FeatureToggleCard
            key={feature.key}
            feature={feature}
            enabled={features[feature.key]}
            onToggle={() => onToggle(feature.key)}
          />
        ))}
      </div>
    </div>
  );
}

function FeatureToggleCard({
  feature,
  enabled,
  onToggle,
}: {
  feature: AppFeatureOption;
  enabled: boolean;
  onToggle: () => void;
}) {
  const Icon = feature.icon;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
        enabled
          ? "border-emerald-200 bg-emerald-50 shadow-sm ring-2 ring-emerald-100"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            enabled ? "bg-white text-emerald-600" : "bg-slate-50 text-slate-500"
          }`}
        >
          <Icon size={20} />
        </span>
        <span
          className={`h-6 w-11 rounded-full p-0.5 transition ${
            enabled ? "bg-emerald-500" : "bg-slate-200"
          }`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
      </div>
      <p className="text-sm font-black text-slate-950">{feature.label}</p>
      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
        {feature.shortLabel}
      </p>
      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
        {feature.description}
      </p>
    </button>
  );
}

function CeoServiceControlPanel({
  controls,
  onToggle,
}: {
  controls: CeoServiceControls;
  onToggle: (key: keyof CeoServiceControls) => void;
}) {
  return (
    <section
      className={`overflow-hidden rounded-3xl border transition ${
        controls.enabled
          ? "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 shadow-lg shadow-violet-100/60"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              controls.enabled
                ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                : "bg-white text-slate-400"
            }`}
          >
            <BrainCircuit size={22} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
              Premium entitlement
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-950">
              CEO тусгай үйлчилгээ
            </h3>
            <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500">
              Байгууллагын CEO / Owner эрхтэй хэрэглэгчдэд удирдлагын
              notification, сануулга, тайлан болон insight нээнэ.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggle("enabled")}
          aria-pressed={controls.enabled}
          aria-label="CEO тусгай үйлчилгээг идэвхжүүлэх"
          className={`inline-flex min-h-12 shrink-0 items-center gap-3 rounded-2xl px-4 text-sm font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 ${
            controls.enabled
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300"
          }`}
        >
          <span>{controls.enabled ? "Идэвхтэй" : "Идэвхгүй"}</span>
          <span
            className={`h-7 w-12 rounded-full p-0.5 transition ${
              controls.enabled ? "bg-white/30" : "bg-slate-200"
            }`}
          >
            <span
              className={`block h-6 w-6 rounded-full bg-white shadow-sm transition ${
                controls.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </span>
        </button>
      </div>

      <div className="grid gap-3 border-t border-violet-100/80 p-5 md:grid-cols-2 xl:grid-cols-3">
        {CEO_SERVICE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const enabled = controls[option.key];
          return (
            <button
              key={option.key}
              type="button"
              disabled={!controls.enabled}
              onClick={() => onToggle(option.key)}
              aria-pressed={enabled}
              className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-45 ${
                enabled && controls.enabled
                  ? "border-violet-200 bg-white shadow-sm hover:-translate-y-0.5"
                  : "border-slate-200 bg-white/70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Icon size={18} />
                </span>
                <span
                  className={`h-6 w-11 rounded-full p-0.5 transition ${
                    enabled ? "bg-violet-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${
                      enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
              </div>
              <p className="mt-3 text-sm font-black text-slate-950">
                {option.label}
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AttendanceBehaviorControls({
  settings,
  onToggle,
}: {
  settings: BusinessAppSettings;
  onToggle: (key: keyof BusinessAppSettings) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
          <Clock3 size={19} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Цаг бүртгэлийн үйлдэл
          </p>
          <h3 className="mt-1 text-base font-black text-slate-950">
            Manual button удирдлага
          </h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            Default үед app дээр “Ирлээ/Явлаа” товч харагдахгүй. Бүсэд ороход
            автомат бүртгэл секунд тоолж ажиллана.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onToggle("attendanceManual")}
        aria-pressed={settings.attendanceManual}
        className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${
          settings.attendanceManual
            ? "border-amber-200 bg-amber-50 shadow-sm ring-2 ring-amber-100"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">
            “Ирлээ / Явлаа” товч харуулах
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            Асаавал ажилтны цаг бүртгэлийн дэлгэц дээр manual clock in/out товч
            гарна.
          </p>
        </div>
        <span
          className={`h-7 w-12 shrink-0 rounded-full p-0.5 transition ${
            settings.attendanceManual ? "bg-amber-500" : "bg-slate-200"
          }`}
        >
          <span
            className={`block h-6 w-6 rounded-full bg-white shadow-sm transition ${
              settings.attendanceManual ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
      </button>
    </div>
  );
}

function SalesRepresentativeBehaviorControls({
  settings,
  onToggle,
}: {
  settings: BusinessAppSettings;
  onToggle: (key: keyof BusinessAppSettings) => void;
}) {
  const restricted = settings.restrictSalesRepVendors;
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
          <UserCog size={19} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Худалдааны төлөөлөгч
          </p>
          <h3 className="mt-1 text-base font-black text-slate-950">
            Vendor хандалтын хязгаар
          </h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            Унтраалттай үед Х/Т бүтэн утас эсвэл имэйлээр дурын vendor-ийг
            шалгаж ажиллана.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onToggle("restrictSalesRepVendors")}
        aria-pressed={restricted}
        className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${
          restricted
            ? "border-indigo-200 bg-indigo-50 shadow-sm ring-2 ring-indigo-100"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">
            Зөвхөн оноосон vendor-той ажиллуулах
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {restricted
              ? "Х/Т зөвхөн өөрт оноосон vendor-ийг хайж, төлбөр болон захиалгатай ажиллана."
              : "Хязгааргүй: exact утас/имэйлээр бүртгэлтэй vendor-ийг олж ажиллана."}
          </p>
        </div>
        <span
          className={`h-7 w-12 shrink-0 rounded-full p-0.5 transition ${
            restricted ? "bg-indigo-500" : "bg-slate-200"
          }`}
        >
          <span
            className={`block h-6 w-6 rounded-full bg-white shadow-sm transition ${
              restricted ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
      </button>
    </section>
  );
}

function AppScopeNote() {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600">
          <ShieldCheck size={19} />
        </div>
        <div>
          <p className="text-sm font-black text-slate-950">
            Дотоод app-ийн эрх
          </p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
            Энэ тохиргоо тухайн байгууллагад хамааралтай ажилчдын MGL Business
            mobile account дээр menu, bottom tab, route access хэлбэрээр
            хэрэгжинэ. Public web каталог болон POS сувгийг өөрчлөхгүй.
          </p>
        </div>
      </div>
    </div>
  );
}

function MemberLimitCard({
  activeMembers,
  value,
  onChange,
}: {
  activeMembers: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        Ажилчдын лимит
      </label>
      <input
        type="number"
        min={Math.max(1, activeMembers)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-black text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
      />
      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
        Одоо {activeMembers} идэвхтэй ажилтантай. Лимитээс дээш шинэ ажилтан
        нэмэх үед API хаана.
      </p>
    </div>
  );
}

function MemberRoleControls({
  members,
  savingRoleUserId,
  onRoleChange,
}: {
  members: BusinessAppMember[];
  savingRoleUserId: string | null;
  onRoleChange: (member: BusinessAppMember, role: BusinessAppRole) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Ажилчдын app role
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">
            CEO, Manager, Staff эрх оноох
          </h3>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
            Энэ role нь MGL Business app дээр navbar, task оноох, ажилтан
            удирдах боломжийг тодорхойлно.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600">
          <UserCog size={14} />
          {members.length} ажилтан
        </span>
      </div>

      {members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-bold text-slate-500">
          Энэ байгууллагад app login эрхтэй ажилтан алга байна.
        </div>
      ) : (
        <div className="grid gap-3">
          {members.map((member) => {
            const locked = member.role === "OWNER" || Boolean(member.isPrimary);
            const displayName = member.fullName || member.email || "Ажилтан";
            return (
              <div
                key={member.userId}
                className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-3 md:grid-cols-[minmax(0,1fr)_220px]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
                    {displayName.trim().charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {displayName}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                      {member.email || member.phone || "Login мэдээлэл алга"}
                    </p>
                  </div>
                </div>

                <label className="grid gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    App role
                  </span>
                  <select
                    value={member.role}
                    disabled={locked || savingRoleUserId === member.userId}
                    onChange={(event) =>
                      onRoleChange(
                        member,
                        event.target.value as BusinessAppRole,
                      )
                    }
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {member.role === "OWNER" && (
                      <option value="OWNER">{ROLE_LABEL.OWNER}</option>
                    )}
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] font-semibold leading-4 text-slate-400">
                    {locked
                      ? "CEO / Owner эрхийг эндээс солихгүй."
                      : ROLE_OPTIONS.find((role) => role.value === member.role)
                          ?.description || ROLE_LABEL[member.role]}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyOrganizationState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
      <Building2 size={30} className="mx-auto text-slate-300" />
      <p className="mt-3 text-sm font-black text-slate-700">
        Байгууллага сонгогдоогүй байна
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-400">
        Зүүн талаас app тохиргоо хийх байгууллагаа сонгоно уу.
      </p>
    </div>
  );
}

function BusinessControlsFooter({
  disabled,
  saved,
  saving,
  onSave,
}: {
  disabled: boolean;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold leading-5 text-slate-400">
        Хадгалсны дараа ажилчид app-аа дахин нээх эсвэл session refresh хийхэд
        шинэ эрхүүд уншигдана.
      </p>
      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
          saved
            ? "bg-emerald-500 shadow-emerald-200"
            : "bg-slate-950 shadow-slate-200 hover:bg-emerald-700"
        }`}
      >
        {saving ? (
          <Loader2 size={17} className="animate-spin" />
        ) : saved ? (
          <Check size={17} />
        ) : (
          <Save size={17} />
        )}
        {saved ? "Хадгалагдлаа" : "App тохиргоо хадгалах"}
      </button>
    </div>
  );
}
