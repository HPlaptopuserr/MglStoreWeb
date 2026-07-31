"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  AlertTriangle,
  Loader2,
  Send,
  Truck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";

type Warehouse = {
  id: string;
  name: string;
  address: string;
  organizations: { id: string; name: string }[];
};

type Provider = {
  id: string;
  name: string;
  address: string | null;
  rating: number;
  deliveryText: string | null;
  _count: { members: number };
};

type Partnership = {
  id: string;
  providerOrganizationId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  providerOrganization: { id: string; name: string };
  _count: { courierAssignments: number };
};

type Courier = {
  id: string;
  email: string;
  profile: {
    fullName: string;
    phoneNumber: string | null;
    avatarUrl: string | null;
  } | null;
  isRegistered: boolean;
};

function ResponseMessage({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
      {message}
    </div>
  );
}

export default function DeliveryNetworkPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [couriersByPartnership, setCouriersByPartnership] = useState<Record<string, Courier[]>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    partnershipId: string;
    providerName: string;
  } | null>(null);
  const [requestTarget, setRequestTarget] = useState<Provider | null>(null);
  const [error, setError] = useState("");

  const selectedWarehouse = useMemo(
    () => warehouses.find((warehouse) => warehouse.id === warehouseId),
    [warehouseId, warehouses],
  );

  const loadScope = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    setError("");
    try {
      const [providerResponse, partnershipResponse] = await Promise.all([
        wmsFetch(`${API}/delivery-providers`),
        wmsFetch(`${API}/delivery-partnerships?warehouseId=${warehouseId}`),
      ]);
      if (!providerResponse.ok || !partnershipResponse.ok) {
        throw new Error("Хүргэлтийн сүлжээний мэдээлэл авахад алдаа гарлаа");
      }
      const nextProviders = (await providerResponse.json()) as Provider[];
      const nextPartnerships = (await partnershipResponse.json()) as Partnership[];
      setProviders(nextProviders);
      setPartnerships(nextPartnerships);

      const active = nextPartnerships.filter((item) => item.status === "ACCEPTED");
      const courierEntries = await Promise.all(
        active.map(async (item) => {
          const response = await wmsFetch(`${API}/delivery-partnerships/${item.id}/couriers`);
          return [item.id, response.ok ? ((await response.json()) as Courier[]) : []] as const;
        }),
      );
      setCouriersByPartnership(Object.fromEntries(courierEntries));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Тодорхойгүй алдаа");
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const response = await wmsFetch(`${API}/warehouses`);
        if (!response.ok) throw new Error("Агуулахын мэдээлэл авахад алдаа гарлаа");
        const payload = await response.json();
        const next = (Array.isArray(payload) ? payload : payload.warehouses || []) as Warehouse[];
        setWarehouses(next);
        const first = next[0];
        if (first) {
          setWarehouseId(first.id);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Тодорхойгүй алдаа");
        setLoading(false);
      }
    };
    void loadWarehouses();
  }, []);

  useEffect(() => {
    void loadScope();
  }, [loadScope]);

  const chooseWarehouse = (nextWarehouseId: string) => {
    setWarehouseId(nextWarehouseId);
  };

  const requestPartnership = async () => {
    if (!requestTarget) return;
    const providerOrganizationId = requestTarget.id;
    setBusyId(providerOrganizationId);
    setError("");
    try {
      const response = await wmsFetch(`${API}/delivery-partnerships`, {
        method: "POST",
        body: JSON.stringify({
          providerOrganizationId,
          warehouseId,
          message: `${selectedWarehouse?.name || "Агуулах"}-ын хүргэлт дээр хамтран ажиллах хүсэлт.`,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "Хүсэлт илгээж чадсангүй");
      setRequestTarget(null);
      await loadScope();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Тодорхойгүй алдаа");
    } finally {
      setBusyId(null);
    }
  };

  const registerCourier = async (partnershipId: string, courierId: string) => {
    setBusyId(courierId);
    setError("");
    try {
      const response = await wmsFetch(
        `${API}/delivery-partnerships/${partnershipId}/courier-assignments`,
        { method: "POST", body: JSON.stringify({ courierId }) },
      );
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "Жолооч бүртгэж чадсангүй");
      await loadScope();
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : "Тодорхойгүй алдаа");
    } finally {
      setBusyId(null);
    }
  };

  const cancelPartnership = async () => {
    if (!cancelTarget) return;
    setBusyId(cancelTarget.partnershipId);
    setError("");
    try {
      const response = await wmsFetch(
        `${API}/delivery-partnerships/${cancelTarget.partnershipId}/cancel`,
        { method: "PATCH" },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || "Хүсэлт цуцалж чадсангүй");
      }
      setCancelTarget(null);
      await loadScope();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error ? cancelError.message : "Тодорхойгүй алдаа",
      );
    } finally {
      setBusyId(null);
    }
  };

  const linkedProviderIds = new Set(
    partnerships
      .filter((item) => item.status === "PENDING" || item.status === "ACCEPTED")
      .map((item) => item.providerOrganizationId),
  );
  const activePartnerships = partnerships.filter((item) => item.status === "ACCEPTED");

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="rounded-3xl bg-slate-950 p-7 text-white shadow-lg">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-300">
              <Truck className="h-3.5 w-3.5" /> Warehouse delivery network
            </div>
            <h1 className="text-3xl font-black">Хүргэлтийн байгууллага ба жолооч</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Агуулах хүргэлтийн компанид шууд хүсэлт илгээнэ. Хүсэлт
              зөвшөөрөгдсөний дараа тухайн компанийн жолоочийг агуулахад бүртгэнэ.
            </p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300">
              Агуулах
              <select value={warehouseId} onChange={(event) => chooseWarehouse(event.target.value)} className="mt-1 block h-11 min-w-56 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none">
                {warehouses.map((warehouse) => <option className="text-slate-900" key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
              </select>
            </label>
          </div>
        </div>
      </header>

      <ResponseMessage message={error} />

      {warehouseId && (
        <>
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Идэвхтэй хамтын ажиллагаа</h2>
              <p className="text-sm text-slate-500">Эндээс жолоочийг тухайн агуулахад албан ёсоор бүртгэнэ.</p>
            </div>
            {loading ? (
              <div className="flex h-40 items-center justify-center rounded-2xl bg-white"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>
            ) : activePartnerships.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Зөвшөөрөгдсөн хамтын ажиллагаа хараахан алга.</div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {activePartnerships.map((partnership) => (
                  <article key={partnership.id} className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-black text-slate-900">{partnership.providerOrganization.name}</h3>
                        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-emerald-600"><Check className="h-3.5 w-3.5" /> Хамтын ажиллагаа идэвхтэй</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{partnership._count.courierAssignments} бүртгэлтэй</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {(couriersByPartnership[partnership.id] || []).map((courier) => (
                        <div key={courier.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{courier.profile?.fullName || courier.email}</p>
                            <p className="text-xs text-slate-500">{courier.profile?.phoneNumber || courier.email}</p>
                          </div>
                          <button onClick={() => registerCourier(partnership.id, courier.id)} disabled={busyId === courier.id || courier.isRegistered} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:bg-emerald-50 disabled:text-emerald-700">
                            {busyId === courier.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : courier.isRegistered ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />} {courier.isRegistered ? "Бүртгэлтэй" : "Агуулахад бүртгэх"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Хүргэлтийн компани нэмэх</h2>
              <p className="text-sm text-slate-500">
                Энд зөвхөн хүргэлтийн төлөв идэвхтэй, жолооч бүртгэлтэй компаниуд
                харагдана. Нэг агуулахад хүссэн тооны компани нэмж болно.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {providers.map((provider) => {
                const requested = linkedProviderIds.has(provider.id);
                const pendingPartnership = partnerships.find(
                  (item) =>
                    item.providerOrganizationId === provider.id &&
                    item.status === "PENDING",
                );
                const pending = Boolean(pendingPartnership);
                return (
                  <article key={provider.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white"><Truck className="h-5 w-5" /></div>
                      <span className="text-sm font-black text-amber-500">★ {provider.rating.toFixed(1)}</span>
                    </div>
                    <h3 className="mt-4 font-black text-slate-900">{provider.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Users className="h-3.5 w-3.5" /> {provider._count.members} жолооч</p>
                    {pending && pendingPartnership ? (
                      <button
                        onClick={() =>
                          setCancelTarget({
                            partnershipId: pendingPartnership.id,
                            providerName: provider.name,
                          })
                        }
                        disabled={busyId === pendingPartnership.id}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                      >
                        {busyId === pendingPartnership.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Хүсэлт цуцлах
                      </button>
                    ) : (
                      <button onClick={() => setRequestTarget(provider)} disabled={requested || busyId === provider.id} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-600 disabled:bg-slate-100 disabled:text-slate-500">
                        {requested ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                        {requested ? "Холбогдсон" : "Хүсэлт илгээх"}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
      {requestTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-partnership-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Send className="h-6 w-6" />
            </div>
            <h2
              id="request-partnership-title"
              className="mt-5 text-xl font-black text-slate-950"
            >
              Хүсэлт илгээхдээ итгэлтэй байна уу?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <strong>{selectedWarehouse?.name || "Сонгосон агуулах"}</strong>
              -аас <strong>{requestTarget.name}</strong> компанид хүргэлтийн
              хамтын ажиллагааны хүсэлт илгээнэ. Компанийн удирдлагад device
              мэдэгдэл очно.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRequestTarget(null)}
                disabled={busyId === requestTarget.id}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Болих
              </button>
              <button
                type="button"
                onClick={() => void requestPartnership()}
                disabled={busyId === requestTarget.id}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {busyId === requestTarget.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Тийм, хүсэлт илгээх
              </button>
            </div>
          </div>
        </div>
      )}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-partnership-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2
              id="cancel-partnership-title"
              className="mt-5 text-xl font-black text-slate-950"
            >
              Хүсэлтийг цуцлах уу?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <strong>{cancelTarget.providerName}</strong> компанид илгээсэн
              хамтын ажиллагааны хүсэлт цуцлагдана. Дараа нь дахин хүсэлт
              илгээх боломжтой.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={busyId === cancelTarget.partnershipId}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Болих
              </button>
              <button
                type="button"
                onClick={() => void cancelPartnership()}
                disabled={busyId === cancelTarget.partnershipId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
              >
                {busyId === cancelTarget.partnershipId && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Хүсэлт цуцлах
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
