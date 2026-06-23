"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Clock3,
  Flame,
  GlassWater,
  Loader2,
  Play,
  RefreshCw,
  Salad,
  UtensilsCrossed,
} from "lucide-react";
import { useOrg } from "@/components/org/OrgContext";
import {
  getRestaurantKitchenTickets,
  getRestaurantPosRegisters,
  updateRestaurantKitchenTicketStatus,
  type KitchenTicketStatus,
  type RestaurantKitchenTicket,
  type RestaurantPosRegister,
} from "@/lib/restaurant-pos-api";

type StationFilter = "ALL" | "HOT_KITCHEN" | "COLD_KITCHEN" | "BAR";
type ActiveKitchenStatus = "NEW" | "PREPARING" | "READY";

const BRANCH_STORAGE_KEY = "org_restaurant_kds_branch_id";
const REFRESH_INTERVAL_MS = 5_000;

const statusColumns: Array<{
  status: ActiveKitchenStatus;
  label: string;
  empty: string;
  accent: string;
}> = [
  {
    status: "NEW",
    label: "Шинэ",
    empty: "Шинэ захиалга алга",
    accent: "border-rose-400/50 bg-rose-400/10 text-rose-200",
  },
  {
    status: "PREPARING",
    label: "Бэлтгэж байна",
    empty: "Бэлтгэж буй захиалга алга",
    accent: "border-amber-300/50 bg-amber-300/10 text-amber-100",
  },
  {
    status: "READY",
    label: "Бэлэн",
    empty: "Бэлэн захиалга алга",
    accent: "border-emerald-400/50 bg-emerald-400/10 text-emerald-100",
  },
];

const stationOptions: Array<{
  value: StationFilter;
  label: string;
  icon: typeof ChefHat;
}> = [
  { value: "ALL", label: "Бүх хэсэг", icon: ChefHat },
  { value: "HOT_KITCHEN", label: "Халуун", icon: Flame },
  { value: "COLD_KITCHEN", label: "Хүйтэн", icon: Salad },
  { value: "BAR", label: "Бар", icon: GlassWater },
];

const orderModeLabels = {
  DINE_IN: "Зааланд",
  TO_GO: "Авч явах",
  DELIVERY: "Хүргэлт",
} as const;

const stationLabels: Record<string, string> = {
  HOT_KITCHEN: "Халуун гал тогоо",
  COLD_KITCHEN: "Хүйтэн гал тогоо",
  BAR: "Бар",
};

const nextActions: Record<
  ActiveKitchenStatus,
  {
    status: "PREPARING" | "READY" | "SERVED";
    label: string;
    busyLabel: string;
    icon: typeof Play;
    className: string;
  }
> = {
  NEW: {
    status: "PREPARING",
    label: "Бэлтгэж эхлэх",
    busyLabel: "Эхлүүлж байна...",
    icon: Play,
    className: "bg-amber-300 text-slate-950 hover:bg-amber-200",
  },
  PREPARING: {
    status: "READY",
    label: "Бэлэн болгох",
    busyLabel: "Шинэчилж байна...",
    icon: CheckCircle2,
    className: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
  },
  READY: {
    status: "SERVED",
    label: "Зөөгчид өгсөн",
    busyLabel: "Шилжүүлж байна...",
    icon: UtensilsCrossed,
    className: "bg-sky-400 text-slate-950 hover:bg-sky-300",
  },
};

const isActiveStatus = (
  status: KitchenTicketStatus,
): status is ActiveKitchenStatus =>
  status === "NEW" || status === "PREPARING" || status === "READY";

const getElapsedMinutes = (sentAt: string, now: number) => {
  const sent = new Date(sentAt).getTime();
  if (!Number.isFinite(sent)) return 0;
  return Math.max(0, Math.floor((now - sent) / 60_000));
};

const getTicketStation = (ticket: RestaurantKitchenTicket) =>
  ticket.items[0]?.kitchenStation || "HOT_KITCHEN";

export function KitchenDisplayScreen() {
  const { user } = useOrg();
  const [registers, setRegisters] = useState<RestaurantPosRegister[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [tickets, setTickets] = useState<RestaurantKitchenTicket[]>([]);
  const [stationFilter, setStationFilter] = useState<StationFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyTicketId, setBusyTicketId] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const branches = useMemo(() => {
    const unique = new Map<
      string,
      { id: string; name: string; registerName: string }
    >();
    for (const register of registers) {
      if (!unique.has(register.branchId)) {
        unique.set(register.branchId, {
          id: register.branchId,
          name: register.branch.name,
          registerName: register.label || register.name,
        });
      }
    }
    return [...unique.values()];
  }, [registers]);

  const selectedBranch =
    branches.find((branch) => branch.id === selectedBranchId) ?? null;

  const loadSetup = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextRegisters = await getRestaurantPosRegisters();
      setRegisters(nextRegisters);
      const savedBranchId =
        typeof window !== "undefined"
          ? window.localStorage.getItem(BRANCH_STORAGE_KEY)
          : null;
      const nextBranchId =
        nextRegisters.find((register) => register.branchId === savedBranchId)
          ?.branchId ??
        nextRegisters[0]?.branchId ??
        "";
      setSelectedBranchId(nextBranchId);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Гал тогооны тохиргоо ачаалахад алдаа гарлаа",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTickets = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!selectedBranchId) {
        setTickets([]);
        return;
      }
      if (!options?.silent) setRefreshing(true);
      try {
        const nextTickets =
          await getRestaurantKitchenTickets(selectedBranchId);
        setTickets(nextTickets);
        setError("");
        setNow(Date.now());
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Гал тогооны захиалга ачаалахад алдаа гарлаа",
        );
      } finally {
        if (!options?.silent) setRefreshing(false);
      }
    },
    [selectedBranchId],
  );

  useEffect(() => {
    void loadSetup();
  }, [loadSetup]);

  useEffect(() => {
    if (!selectedBranchId) return;
    window.localStorage.setItem(BRANCH_STORAGE_KEY, selectedBranchId);
    void loadTickets();
    const refreshTimer = window.setInterval(() => {
      void loadTickets({ silent: true });
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(refreshTimer);
  }, [loadTickets, selectedBranchId]);

  useEffect(() => {
    const clockTimer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(clockTimer);
  }, []);

  const visibleTickets = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          isActiveStatus(ticket.status) &&
          (stationFilter === "ALL" ||
            ticket.items.some(
              (item) => item.kitchenStation === stationFilter,
            )),
      ),
    [stationFilter, tickets],
  );

  const handleStatusChange = async (ticket: RestaurantKitchenTicket) => {
    if (!selectedBranchId || !isActiveStatus(ticket.status)) return;
    const action = nextActions[ticket.status];
    setBusyTicketId(ticket.id);
    setError("");
    try {
      const updated = await updateRestaurantKitchenTicketStatus({
        branchId: selectedBranchId,
        kitchenTicketId: ticket.id,
        status: action.status,
      });
      setTickets((current) =>
        updated.status === "SERVED"
          ? current.filter((item) => item.id !== updated.id)
          : current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Ticket-ийн төлөв шинэчлэхэд алдаа гарлаа",
      );
      await loadTickets({ silent: true });
    } finally {
      setBusyTicketId("");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#10131c] text-slate-200">
        <Loader2 className="mr-3 size-6 animate-spin text-amber-300" />
        Гал тогооны дэлгэц ачаалж байна...
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-[#10131c] text-slate-100">
      <header className="border-b border-white/10 bg-[#171b27] px-4 py-3 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/restaurant-pos"
              className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Ресторан касс руу буцах"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-300 text-slate-950">
              <ChefHat className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">
                Гал тогооны дэлгэц
              </h1>
              <p className="text-xs text-slate-400">
                {user.organizationName || "Ресторан"} ·{" "}
                {selectedBranch?.name || "Салбар сонгоно уу"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {branches.length > 1 ? (
              <select
                value={selectedBranchId}
                onChange={(event) => setSelectedBranchId(event.target.value)}
                className="h-10 rounded-xl border border-white/10 bg-[#202533] px-3 text-sm font-bold text-white outline-none focus:border-amber-300"
                aria-label="Салбар сонгох"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              onClick={() => void loadTickets()}
              disabled={!selectedBranchId || refreshing}
              className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Шинэчлэх
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {stationOptions.map((station) => {
              const Icon = station.icon;
              const active = stationFilter === station.value;
              return (
                <button
                  key={station.value}
                  type="button"
                  onClick={() => setStationFilter(station.value)}
                  className={`flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-black transition ${
                    active
                      ? "border-amber-300 bg-amber-300 text-slate-950"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <Icon className="size-4" />
                  {station.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
            {statusColumns.map((column) => (
              <span key={column.status}>
                {column.label}:{" "}
                <strong className="text-white">
                  {
                    visibleTickets.filter(
                      (ticket) => ticket.status === column.status,
                    ).length
                  }
                </strong>
              </span>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm font-bold text-rose-200">
            {error}
          </div>
        ) : null}
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-4 lg:p-5">
        {!selectedBranchId ? (
          <EmptyState
            title="POS касс олдсонгүй"
            description="Энэ байгууллагад идэвхтэй POS register тохируулсны дараа гал тогооны дэлгэц ашиглана."
          />
        ) : (
          <div className="grid min-h-full gap-4 xl:grid-cols-3">
            {statusColumns.map((column) => {
              const columnTickets = visibleTickets.filter(
                (ticket) => ticket.status === column.status,
              );
              return (
                <section
                  key={column.status}
                  className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-3"
                >
                  <div
                    className={`mb-3 flex items-center justify-between rounded-xl border px-4 py-3 ${column.accent}`}
                  >
                    <h2 className="font-black">{column.label}</h2>
                    <span className="rounded-lg bg-black/20 px-2.5 py-1 text-sm font-black">
                      {columnTickets.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {columnTickets.map((ticket) => (
                      <KitchenTicketCard
                        key={ticket.id}
                        ticket={ticket}
                        now={now}
                        stationFilter={stationFilter}
                        busy={busyTicketId === ticket.id}
                        onAdvance={() => void handleStatusChange(ticket)}
                      />
                    ))}
                    {columnTickets.length === 0 ? (
                      <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-white/10 px-4 text-center text-sm text-slate-500">
                        {column.empty}
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function KitchenTicketCard({
  ticket,
  now,
  stationFilter,
  busy,
  onAdvance,
}: {
  ticket: RestaurantKitchenTicket;
  now: number;
  stationFilter: StationFilter;
  busy: boolean;
  onAdvance: () => void;
}) {
  if (!isActiveStatus(ticket.status)) return null;

  const action = nextActions[ticket.status];
  const ActionIcon = action.icon;
  const elapsedMinutes = getElapsedMinutes(ticket.sentAt, now);
  const preparationMinutes = Math.max(
    0,
    ...ticket.items.map((item) => item.preparationMinutes || 0),
  );
  const overdue =
    preparationMinutes > 0 && elapsedMinutes >= preparationMinutes;
  const visibleItems =
    stationFilter === "ALL"
      ? ticket.items
      : ticket.items.filter(
          (item) => item.kitchenStation === stationFilter,
        );
  const station = getTicketStation(ticket);
  const tableLabel =
    ticket.restaurantTicket.table?.label ||
    orderModeLabels[ticket.restaurantTicket.orderMode];

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-[#1b202d] shadow-xl shadow-black/10 ${
        overdue ? "border-rose-400/70" : "border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white">{tableLabel}</span>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-300">
              {orderModeLabels[ticket.restaurantTicket.orderMode]}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            {ticket.kitchenTicketNo}
          </p>
        </div>
        <div
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-black ${
            overdue
              ? "bg-rose-400 text-white"
              : "bg-white/10 text-slate-200"
          }`}
        >
          <Clock3 className="size-3.5" />
          {elapsedMinutes} мин
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-500">
          <span>{stationLabels[station] || "Гал тогоо"}</span>
          {preparationMinutes > 0 ? (
            <span>Зорилт {preparationMinutes} мин</span>
          ) : null}
        </div>

        <div className="space-y-3">
          {visibleItems.map((item) => (
            <div key={item.id}>
              <div className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-300 text-sm font-black text-slate-950">
                  {item.qty}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-black leading-6 text-white">{item.name}</p>
                  {item.note ? (
                    <p className="mt-1 rounded-lg border border-amber-300/20 bg-amber-300/10 px-2.5 py-2 text-xs font-bold text-amber-100">
                      Тайлбар: {item.note}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onAdvance}
          disabled={busy}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-black transition disabled:cursor-wait disabled:opacity-60 ${action.className}`}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ActionIcon className="size-4" />
          )}
          {busy ? action.busyLabel : action.label}
        </button>
      </div>
    </article>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full min-h-72 items-center justify-center">
      <div className="max-w-md text-center">
        <ChefHat className="mx-auto size-12 text-slate-600" />
        <h2 className="mt-4 text-xl font-black">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      </div>
    </div>
  );
}
