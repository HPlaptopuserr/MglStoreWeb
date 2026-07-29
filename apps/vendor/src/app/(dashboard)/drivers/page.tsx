"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  Clock3,
  Loader2,
  MapPin,
  Search,
  Send,
  Truck,
  Users,
  X,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";

type Provider = {
  id: string;
  name: string;
  logoUrl: string | null;
  phone: string | null;
  address: string | null;
  rating: number;
  deliveryPrice: string | null;
  deliveryText: string | null;
  _count: { members: number };
};

type OrganizationSummary = {
  id: string;
  name: string;
  logoUrl: string | null;
  address: string | null;
};

type Partnership = {
  id: string;
  requesterOrganizationId: string | null;
  providerOrganizationId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  message: string | null;
  rejectionReason: string | null;
  createdAt: string;
  requesterOrganization: OrganizationSummary | null;
  providerOrganization: OrganizationSummary;
  warehouse: { id: string; name: string; address: string } | null;
  _count: { courierAssignments: number };
};

const statusMeta = {
  PENDING: { label: "Хүлээгдэж байна", className: "bg-amber-50 text-amber-700", icon: Clock3 },
  ACCEPTED: { label: "Идэвхтэй", className: "bg-emerald-50 text-emerald-700", icon: Check },
  REJECTED: { label: "Татгалзсан", className: "bg-rose-50 text-rose-700", icon: X },
  CANCELLED: { label: "Цуцалсан", className: "bg-slate-100 text-slate-600", icon: X },
} as const;

function currentOrganizationId() {
  if (typeof window === "undefined") return "";
  try {
    const user = JSON.parse(localStorage.getItem("vendor_user") || "{}") as {
      organizationId?: string;
    };
    return user.organizationId || "";
  } catch {
    return "";
  }
}

export default function DriversPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const organizationId = useMemo(currentOrganizationId, []);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError("");
    try {
      const [providerRes, partnershipRes] = await Promise.all([
        authFetch(`${API}/delivery-providers`),
        authFetch(`${API}/delivery-partnerships?organizationId=${organizationId}`),
      ]);
      if (!providerRes.ok || !partnershipRes.ok) {
        throw new Error("Хүргэлтийн мэдээлэл авахад алдаа гарлаа");
      }
      setProviders((await providerRes.json()) as Provider[]);
      setPartnerships((await partnershipRes.json()) as Partnership[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Тодорхойгүй алдаа");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleProviders = providers.filter((provider) =>
    provider.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const activeProviderIds = new Set(
    partnerships
      .filter((item) => item.status === "PENDING" || item.status === "ACCEPTED")
      .map((item) => item.providerOrganizationId),
  );

  const sendRequest = async (providerId: string) => {
    setBusyId(providerId);
    setError("");
    try {
      const response = await authFetch(`${API}/delivery-partnerships`, {
        method: "POST",
        body: JSON.stringify({
          requesterOrganizationId: organizationId,
          providerOrganizationId: providerId,
          message: "Манай байгууллагын захиалгын хүргэлт дээр хамтран ажиллах хүсэлт.",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "Хүсэлт илгээж чадсангүй");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Тодорхойгүй алдаа");
    } finally {
      setBusyId(null);
    }
  };

  const respond = async (partnershipId: string, action: "ACCEPT" | "REJECT") => {
    setBusyId(partnershipId);
    try {
      const response = await authFetch(`${API}/delivery-partnerships/${partnershipId}/respond`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "Хүсэлт шийдвэрлэж чадсангүй");
      await load();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : "Тодорхойгүй алдаа");
    } finally {
      setBusyId(null);
    }
  };

  const incoming = partnerships.filter(
    (item) => item.providerOrganizationId === organizationId,
  );
  const outgoing = partnerships.filter(
    (item) => item.requesterOrganizationId === organizationId,
  );

  return (
    <main className="mx-auto max-w-7xl space-y-8 pb-12">
      <header className="overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300">
              <Truck className="h-3.5 w-3.5" /> Хүргэлтийн сүлжээ
            </div>
            <h1 className="text-3xl font-black tracking-tight">Хүргэлтийн хамтын ажиллагаа</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Хүргэлтийн байгууллага сонгож хүсэлт илгээнэ. Зөвшөөрсний дараа жолоочид
              харагдаж, захиалга оноох боломж нээгдэнэ.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 px-5 py-3">
              <p className="text-2xl font-black">{outgoing.filter((item) => item.status === "ACCEPTED").length}</p>
              <p className="text-xs text-slate-400">Идэвхтэй түнш</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-3">
              <p className="text-2xl font-black">{incoming.filter((item) => item.status === "PENDING").length}</p>
              <p className="text-xs text-slate-400">Ирсэн хүсэлт</p>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {incoming.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">Танай байгууллагад ирсэн хүсэлт</h2>
            <p className="text-sm text-slate-500">Удирдах эрхтэй ажилтан хүсэлтийг шийдвэрлэнэ.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {incoming.map((item) => {
              const meta = statusMeta[item.status];
              const StatusIcon = meta.icon;
              return (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-900">
                        {item.requesterOrganization?.name || item.warehouse?.name || "Агуулах"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.warehouse ? `${item.warehouse.name} агуулах` : "Vendor шууд хүсэлт"}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${meta.className}`}>
                      <StatusIcon className="h-3.5 w-3.5" /> {meta.label}
                    </span>
                  </div>
                  {item.status === "PENDING" && (
                    <div className="mt-5 flex gap-2">
                      <button onClick={() => respond(item.id, "ACCEPT")} disabled={busyId === item.id} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                        <Check className="h-4 w-4" /> Зөвшөөрөх
                      </button>
                      <button onClick={() => respond(item.id, "REJECT")} disabled={busyId === item.id} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                        <X className="h-4 w-4" /> Татгалзах
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-xl font-black text-slate-900">Хүргэлт хийх боломжтой байгууллагууд</h2>
            <p className="text-sm text-slate-500">Идэвхтэй жолоочтой, хүргэлтийн module нээгдсэн байгууллагууд.</p>
          </div>
          <label className="relative block w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Байгууллага хайх" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-slate-400" />
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center rounded-3xl border border-slate-200 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : visibleProviders.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
            <Building2 className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-bold text-slate-700">Хүргэлтийн байгууллага олдсонгүй</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleProviders.map((provider) => {
              const requested = activeProviderIds.has(provider.id);
              return (
                <article key={provider.id} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Truck className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-black text-slate-900">{provider.name}</h3>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Users className="h-3.5 w-3.5" /> {provider._count.members} жолооч
                      </div>
                    </div>
                    <span className="text-sm font-black text-amber-500">★ {provider.rating.toFixed(1)}</span>
                  </div>
                  <div className="mt-5 min-h-12 space-y-1 text-sm text-slate-500">
                    {provider.address && <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{provider.address}</p>}
                    {provider.deliveryText && <p>{provider.deliveryText}</p>}
                  </div>
                  <button onClick={() => sendRequest(provider.id)} disabled={requested || busyId === provider.id || provider.id === organizationId} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">
                    {busyId === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : requested ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {requested ? "Хүсэлт илгээгдсэн" : "Хамтран ажиллах хүсэлт"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
