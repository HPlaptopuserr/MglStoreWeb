"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  CheckCircle2,
  Edit3,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import { useOrg } from "@/components/org/OrgContext";
import ProtectedSectionGate from "@/components/org/ProtectedSectionGate";
import {
  createCafeRegularCustomer,
  getCafeRegularCustomers,
  updateCafeRegularCustomer,
  type CafeRegularCustomer,
} from "@/lib/restaurant-pos-api";

type CustomerDraft = {
  name: string;
  phone: string;
  discountPercent: string;
};

const EMPTY_DRAFT: CustomerDraft = {
  name: "",
  phone: "",
  discountPercent: "",
};

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("mn-MN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "Ашиглаагүй";

export function CafeRegularCustomersScreen() {
  const { user, features } = useOrg();
  const isCafe = features.selfServiceMode === "CAFE";
  const isRestaurant = features.selfServiceMode === "RESTAURANT";
  const role = String(user.role || "").toUpperCase();
  const canManage =
    user.orgRole === "OWNER" ||
    user.orgRole === "ADMIN" ||
    role === "ADMIN" ||
    role === "SUPER_ADMIN";
  const [unlocked, setUnlocked] = useState(false);

  if ((!isCafe && !isRestaurant) || !canManage) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <UserRoundCheck className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-xl font-black text-slate-900">
          {isCafe ? "Байнгын хэрэглэгч" : "Ажилтны хөнгөлөлт"}
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Энэ хэсгийг байгууллагын эзэмшигч эсвэл админ ашиглана.
        </p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <ProtectedSectionGate
        organizationId={user.organizationId || ""}
        organizationName={user.organizationName}
        userId={user.id}
        eyebrow="Хамгаалалттай хөнгөлөлт"
        title="Удирдах эрхээ баталгаажуулна уу"
        description={`${isCafe ? "байнгын хэрэглэгчийн" : "ажилтны"} утас болон хөнгөлөлтийн хувийг удирдахын тулд эзэмшигч эсвэл админ өөрийн эрхийг баталгаажуулна.`}
        submitLabel="Хөнгөлөлтийн бүртгэл рүү нэвтрэх"
        footer="Хуудсыг хаах эсвэл дахин ачаалахад энэ хэсэг дахин түгжигдэнэ."
        accessDeniedMessage="Зөвхөн байгууллагын эзэмшигч эсвэл админ хөнгөлөлтийн бүртгэл удирдах эрхтэй."
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  return <DiscountProfilesContent />;
}

function DiscountProfilesContent() {
  const { user, features } = useOrg();
  const isCafe = features.selfServiceMode === "CAFE";
  const profileLabel = isCafe ? "Байнгын хэрэглэгч" : "Ажилтан";
  const profilesLabel = isCafe ? "хэрэглэгч" : "ажилтан";
  const profileGenitive = isCafe ? "Байнгын хэрэглэгчийн" : "Ажилтны";
  const profileObject = isCafe
    ? "Байнгын хэрэглэгчийг"
    : "Ажилтны бүртгэлийг";
  const [customers, setCustomers] = useState<CafeRegularCustomer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CafeRegularCustomer | null>(null);
  const [draft, setDraft] = useState<CustomerDraft>(EMPTY_DRAFT);

  const loadCustomers = useCallback(async () => {
    if (!user.organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await getCafeRegularCustomers({
        organizationId: user.organizationId,
      });
      setCustomers(result.customers);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `${profileGenitive} мэдээллийг авч чадсангүй`,
      );
    } finally {
      setLoading(false);
    }
  }, [profileGenitive, user.organizationId]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("mn");
    if (!normalized) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLocaleLowerCase("mn").includes(normalized) ||
        customer.phone.includes(normalized.replace(/\D/g, "")),
    );
  }, [customers, query]);

  const activeCustomers = customers.filter((customer) => customer.isActive);
  const averageDiscount = activeCustomers.length
    ? activeCustomers.reduce(
        (sum, customer) => sum + customer.discountPercent,
        0,
      ) / activeCustomers.length
    : 0;

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const openEdit = (customer: CafeRegularCustomer) => {
    setEditing(customer);
    setDraft({
      name: customer.name,
      phone: customer.phone,
      discountPercent: String(customer.discountPercent),
    });
    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setDraft(EMPTY_DRAFT);
  };

  const saveCustomer = async () => {
    if (!user.organizationId || saving) return;
    const name = draft.name.trim();
    const phone = draft.phone.replace(/\D/g, "");
    const discountPercent = Number(draft.discountPercent);
    if (name.length < 2) {
      setError(`${profileGenitive} нэрийг оруулна уу`);
      return;
    }
    if (!/^\d{8}$/.test(phone)) {
      setError("Утасны дугаар 8 оронтой байна");
      return;
    }
    if (
      draft.discountPercent.trim() === "" ||
      !Number.isFinite(discountPercent) ||
      discountPercent < 0 ||
      discountPercent > 100
    ) {
      setError("Хямдралын хувь 0-100 байна");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const saved = editing
        ? await updateCafeRegularCustomer(editing.id, {
            name,
            phone,
            discountPercent,
          })
        : await createCafeRegularCustomer({
            organizationId: user.organizationId,
            name,
            phone,
            discountPercent,
          });
      setCustomers((current) => {
        const next = editing
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current];
        return next.sort((a, b) => a.name.localeCompare(b.name, "mn"));
      });
      setNotice(
        editing
          ? `${profileGenitive} мэдээлэл шинэчлэгдлээ`
          : `${profileLabel} амжилттай бүртгэгдлээ`,
      );
      closeForm();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `${profileObject} хадгалж чадсангүй`,
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleCustomer = async (customer: CafeRegularCustomer) => {
    if (updatingId) return;
    setUpdatingId(customer.id);
    setError("");
    setNotice("");
    try {
      const updated = await updateCafeRegularCustomer(customer.id, {
        isActive: !customer.isActive,
      });
      setCustomers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(
        updated.isActive
          ? `${updated.name} идэвхтэй боллоо`
          : `${updated.name} идэвхгүй боллоо`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Төлөвийг шинэчилж чадсангүй",
      );
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-[#11231d] p-6 text-white shadow-xl shadow-emerald-950/10 sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-emerald-300">
              <BadgePercent className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-[0.18em]">
                {isCafe ? "Coffee shop loyalty" : "Restaurant staff benefit"}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-black sm:text-3xl">
              {isCafe ? "Байнгын хэрэглэгч" : "Ажилтны хөнгөлөлт"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/55">
              {isCafe
                ? "Хэрэглэгчийг утсаар бүртгэж, өөртөө үйлчлэх кассад үйлчлэх хямдралын хувийг тохируулна."
                : "Ажилтныг утсаар бүртгэж, бэлэн мөнгөний болон өөртөө үйлчлэх кассад эдлэх хөнгөлөлтийн хувийг тохируулна."}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#f4c34f] px-5 text-sm font-black text-[#172219] transition hover:bg-[#ffd66b]"
          >
            <Plus className="h-5 w-5" />
            {profileLabel} бүртгэх
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Users className="h-5 w-5 text-slate-400" />
          <p className="mt-3 text-3xl font-black text-slate-900">
            {customers.length}
          </p>
          <p className="text-sm font-bold text-slate-500">
            Нийт {profilesLabel}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <p className="mt-3 text-3xl font-black text-slate-900">
            {activeCustomers.length}
          </p>
          <p className="text-sm font-bold text-slate-500">Идэвхтэй</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <BadgePercent className="h-5 w-5 text-amber-500" />
          <p className="mt-3 text-3xl font-black text-slate-900">
            {averageDiscount.toFixed(1)}%
          </p>
          <p className="text-sm font-bold text-slate-500">Дундаж хямдрал</p>
        </div>
      </section>

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {notice}
        </div>
      ) : null}
      {error && !formOpen ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Нэр эсвэл утсаар хайх"
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadCustomers()}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Шинэчлэх
          </button>
        </div>

        {loading ? (
          <div className="grid min-h-56 place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <UserRoundCheck className="mx-auto h-12 w-12 text-slate-200" />
            <p className="mt-4 text-base font-black text-slate-700">
              {query
                ? `Хайлтад тохирох ${profilesLabel} алга`
                : `${profileLabel} бүртгээгүй байна`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCustomers.map((customer) => (
              <article
                key={customer.id}
                className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1.4fr)_120px_120px_150px_auto] sm:items-center sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">
                    {customer.name}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Phone className="h-3.5 w-3.5" /> {customer.phone}
                  </p>
                </div>
                <div>
                  <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800">
                    {customer.discountPercent}% хямдрал
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-500">
                  {customer.saleCount} худалдан авалт
                </div>
                <div className="text-xs font-semibold text-slate-400">
                  Сүүлд: {formatDate(customer.lastUsedAt)}
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => openEdit(customer)}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                    aria-label="Засах"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleCustomer(customer)}
                    disabled={updatingId === customer.id}
                    className={`h-10 rounded-xl px-3 text-xs font-black transition disabled:opacity-50 ${
                      customer.isActive
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {updatingId === customer.id
                      ? "..."
                      : customer.isActive
                        ? "Идэвхтэй"
                        : "Идэвхгүй"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {formOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editing
                    ? `${profileLabel} засах`
                    : `${profileLabel} бүртгэх`}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Хямдрал бүтээгдэхүүний үнэд үйлчилнэ. Савны үнэ хасагдахгүй.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Нэр
                </span>
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  maxLength={80}
                  placeholder="Жишээ: Бат Эрдэнэ"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Утасны дугаар
                </span>
                <input
                  inputMode="numeric"
                  value={draft.phone}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      phone: event.target.value.replace(/\D/g, "").slice(0, 8),
                    }))
                  }
                  maxLength={8}
                  placeholder="99112233"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Хямдралын хувь
                </span>
                <div className="relative mt-2">
                  <input
                    inputMode="decimal"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={draft.discountPercent}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        discountPercent: event.target.value,
                      }))
                    }
                    placeholder="10"
                    className="h-12 w-full rounded-xl border border-slate-200 px-4 pr-12 text-sm font-bold outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                    %
                  </span>
                </div>
              </label>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="h-12 rounded-xl border border-slate-200 text-sm font-black text-slate-600"
              >
                Болих
              </button>
              <button
                type="button"
                onClick={() => void saveCustomer()}
                disabled={saving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#11231d] text-sm font-black text-white disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing ? "Хадгалах" : "Бүртгэх"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
