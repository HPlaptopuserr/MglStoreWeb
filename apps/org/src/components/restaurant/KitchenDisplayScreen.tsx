"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Clock3,
  Expand,
  Flame,
  FlaskConical,
  GlassWater,
  Loader2,
  Radio,
  ReceiptText,
  RefreshCw,
  Salad,
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
import { formatRestaurantOrderNumber } from "@/lib/restaurant-order-number";

type StationFilter = "ALL" | "HOT_KITCHEN" | "COLD_KITCHEN" | "BAR";

const BRANCH_STORAGE_KEY = "org_restaurant_kds_branch_id";
const REFRESH_INTERVAL_MS = 3_000;

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
  DINE_IN: "Энд идэх",
  TO_GO: "Авч явах",
  DELIVERY: "Хүргэлт",
} as const;

const stationLabels: Record<string, string> = {
  HOT_KITCHEN: "Халуун гал тогоо",
  COLD_KITCHEN: "Хүйтэн гал тогоо",
  BAR: "Бар",
  MIXED: "Олон хэсгийн захиалга",
};

const isActiveStatus = (status: KitchenTicketStatus) =>
  status === "NEW" || status === "PREPARING" || status === "READY";

const getElapsedMinutes = (sentAt: string, now: number) => {
  const sent = new Date(sentAt).getTime();
  if (!Number.isFinite(sent)) return 0;
  return Math.max(0, Math.floor((now - sent) / 60_000));
};

const getTicketStation = (ticket: RestaurantKitchenTicket) =>
  new Set(ticket.items.map((item) => item.kitchenStation).filter(Boolean)).size >
  1
    ? "MIXED"
    : ticket.items[0]?.kitchenStation || "HOT_KITCHEN";

const createDemoTickets = (
  currentTime: number,
  branchId: string,
): RestaurantKitchenTicket[] => {
  const sentAt = (minutesAgo: number) =>
    new Date(currentTime - minutesAgo * 60_000).toISOString();

  return [
    {
      id: "demo-ticket-1",
      kitchenTicketNo: "KDS-1042",
      organizationId: "demo-organization",
      branchId,
      status: "NEW",
      sentAt: sentAt(4),
      startedAt: null,
      readyAt: null,
      servedAt: null,
      restaurantTicket: {
        id: "demo-order-1",
        ticketNo: "R-1042",
        orderMode: "DINE_IN",
        status: "KITCHEN",
        table: null,
      },
      items: [
        {
          id: "demo-item-1",
          productId: "demo-product-burger",
          name: "Үхрийн махан бургер",
          qty: 2,
          note: "Сонгиногүй",
          kitchenStation: "HOT_KITCHEN",
          preparationMinutes: 15,
        },
        {
          id: "demo-item-2",
          productId: "demo-product-fries",
          name: "Шарсан төмс",
          qty: 1,
          note: "",
          kitchenStation: "HOT_KITCHEN",
          preparationMinutes: 8,
        },
      ],
    },
    {
      id: "demo-ticket-2",
      kitchenTicketNo: "KDS-1043",
      organizationId: "demo-organization",
      branchId,
      status: "NEW",
      sentAt: sentAt(9),
      startedAt: null,
      readyAt: null,
      servedAt: null,
      restaurantTicket: {
        id: "demo-order-2",
        ticketNo: "R-1043",
        orderMode: "TO_GO",
        status: "KITCHEN",
        table: null,
      },
      items: [
        {
          id: "demo-item-3",
          productId: "demo-product-pasta",
          name: "Карбонара паста",
          qty: 1,
          note: "Соус тусад нь",
          kitchenStation: "HOT_KITCHEN",
          preparationMinutes: 12,
        },
        {
          id: "demo-item-4",
          productId: "demo-product-salad",
          name: "Ногоон салат",
          qty: 1,
          note: "",
          kitchenStation: "COLD_KITCHEN",
          preparationMinutes: 7,
        },
      ],
    },
    {
      id: "demo-ticket-3",
      kitchenTicketNo: "KDS-1044",
      organizationId: "demo-organization",
      branchId,
      status: "NEW",
      sentAt: sentAt(18),
      startedAt: null,
      readyAt: null,
      servedAt: null,
      restaurantTicket: {
        id: "demo-order-3",
        ticketNo: "R-1044",
        orderMode: "DINE_IN",
        status: "KITCHEN",
        table: null,
      },
      items: [
        {
          id: "demo-item-5",
          productId: "demo-product-pizza",
          name: "Пепперони пицца",
          qty: 1,
          note: "Нэмэлт бяслагтай",
          kitchenStation: "HOT_KITCHEN",
          preparationMinutes: 15,
        },
      ],
    },
  ];
};

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
  const [demoMode, setDemoMode] = useState(false);

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
      if (demoMode) return;
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
    [demoMode, selectedBranchId],
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

  const activeTickets = useMemo(
    () => tickets.filter((ticket) => isActiveStatus(ticket.status)),
    [tickets],
  );
  const clockLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("mn-MN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now),
    [now],
  );
  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("mn-MN", {
        month: "short",
        day: "numeric",
        weekday: "short",
      }).format(now),
    [now],
  );

  const getStationTicketCount = (station: StationFilter) =>
    station === "ALL"
      ? activeTickets.length
      : activeTickets.filter((ticket) =>
          ticket.items.some((item) => item.kitchenStation === station),
        ).length;

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setError("Бүтэн дэлгэцийн горим нээж чадсангүй.");
    }
  };

  const showDemoTickets = () => {
    const currentTime = Date.now();
    setDemoMode(true);
    setStationFilter("ALL");
    setNow(currentTime);
    setError("");
    setTickets(
      createDemoTickets(currentTime, selectedBranchId || "demo-branch"),
    );
  };

  const closeDemoMode = () => {
    setDemoMode(false);
    setTickets([]);
  };

  const handleStatusChange = async (ticket: RestaurantKitchenTicket) => {
    if (!isActiveStatus(ticket.status)) return;
    if (demoMode) {
      setTickets((current) =>
        current.filter((item) => item.id !== ticket.id),
      );
      return;
    }
    if (!selectedBranchId) return;
    setBusyTicketId(ticket.id);
    setError("");
    try {
      await updateRestaurantKitchenTicketStatus({
        branchId: selectedBranchId,
        kitchenTicketId: ticket.id,
        status: "SERVED",
      });
      setTickets((current) =>
        current.filter((item) => item.id !== ticket.id),
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
      <div className="flex h-screen items-center justify-center bg-[#101216] px-6 text-slate-200">
        <div className="text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.06] text-slate-100">
            <ChefHat className="size-10" />
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm font-black">
            <Loader2 className="size-4 animate-spin text-slate-300" />
            Гал тогооны дэлгэц ачаалж байна
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-600">
            Захиалгын мэдээллийг бэлтгэж байна...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-[#101216] text-slate-100">
      <header className="relative z-20 shrink-0 border-b border-white/[0.08] bg-[#15181d] px-4 py-3 lg:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Dashboard руу буцах"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-slate-100">
              <ChefHat className="size-7" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-black tracking-tight sm:text-xl">
                  Гал тогооны дэлгэц
                </h1>
                <span
                  className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] sm:inline-flex ${
                    demoMode
                      ? "border-white/15 bg-white/[0.08] text-slate-200"
                      : "border-white/10 bg-white/[0.04] text-slate-400"
                  }`}
                >
                  {demoMode ? (
                    <FlaskConical className="size-3" />
                  ) : (
                    <Radio className="size-3" />
                  )}
                  {demoMode ? "Demo" : "Live"}
                </span>
              </div>
              <p className="truncate text-xs font-semibold text-slate-500">
                {user.organizationName || "Ресторан"} ·{" "}
                {demoMode
                  ? "Демо салбар"
                  : selectedBranch?.name || "Салбар сонгоно уу"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="hidden min-w-24 text-right md:block">
              <p className="text-xl font-black tabular-nums leading-none text-white">
                {clockLabel}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {dateLabel}
              </p>
            </div>
            {branches.length > 1 && !demoMode ? (
              <select
                value={selectedBranchId}
                onChange={(event) => setSelectedBranchId(event.target.value)}
                className="h-11 max-w-48 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-white outline-none transition focus:border-white/30"
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
              onClick={demoMode ? closeDemoMode : showDemoTickets}
              className={`flex h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-black transition ${
                demoMode
                  ? "border-white/20 bg-white/10 text-white hover:bg-white/[0.14]"
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <FlaskConical className="size-4" />
              <span className="hidden lg:inline">
                {demoMode ? "Демо хаах" : "Демо харах"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => void requestFullscreen()}
              className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Бүтэн дэлгэц"
            >
              <Expand className="size-5" />
            </button>
            <button
              type="button"
              onClick={() =>
                demoMode ? showDemoTickets() : void loadTickets()
              }
              disabled={(!selectedBranchId && !demoMode) || refreshing}
              className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {demoMode ? "Дахин эхлэх" : "Шинэчлэх"}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
          <div className="flex max-w-full gap-2 overflow-x-auto pb-0.5">
            {stationOptions.map((station) => {
              const Icon = station.icon;
              const active = stationFilter === station.value;
              return (
                <button
                  key={station.value}
                  type="button"
                  onClick={() => setStationFilter(station.value)}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-black transition ${
                    active
                      ? "border-slate-100 bg-slate-100 text-slate-950"
                      : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  <Icon className="size-4" />
                  {station.label}
                  <span
                    className={`rounded-md px-1.5 py-0.5 tabular-nums ${
                      active ? "bg-black/10" : "bg-white/[0.07] text-slate-300"
                    }`}
                  >
                    {getStationTicketCount(station.value)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-black text-slate-300">
            <ReceiptText className="size-4 text-slate-400" />
            Орж ирсэн захиалга
            <strong className="rounded-md bg-white/[0.09] px-2 py-0.5 text-sm tabular-nums text-white">
              {visibleTickets.length}
            </strong>
          </div>
        </div>

        {error ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm font-bold text-rose-200">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 text-xs font-black uppercase tracking-wide text-rose-100/70 hover:text-white"
            >
              Хаах
            </button>
          </div>
        ) : null}
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-3 sm:p-4 lg:p-5">
        {!selectedBranchId && !demoMode ? (
          <EmptyState
            title="POS касс олдсонгүй"
            description="Энэ байгууллагад идэвхтэй POS register тохируулсны дараа гал тогооны дэлгэц ашиглана."
            actionLabel="Демо захиалга харах"
            onAction={showDemoTickets}
          />
        ) : visibleTickets.length === 0 ? (
          <EmptyState
            title={demoMode ? "Демо захиалга дууслаа" : "Одоогоор захиалга алга"}
            description={
              demoMode
                ? "Демо захиалгуудыг дахин гаргаж дизайн болон товчийг туршина уу."
                : "Шинэ захиалга орж ирмэгц энэ дэлгэц дээр автоматаар харагдана."
            }
            actionLabel={demoMode ? "Дахин эхлэх" : "Демо захиалга харах"}
            onAction={showDemoTickets}
          />
        ) : (
          <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {[...visibleTickets]
              .sort(
                (first, second) =>
                  new Date(first.sentAt).getTime() -
                  new Date(second.sentAt).getTime(),
              )
              .map((ticket) => (
                <KitchenTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  now={now}
                  stationFilter={stationFilter}
                  busy={busyTicketId === ticket.id}
                  onAdvance={() => void handleStatusChange(ticket)}
                />
              ))}
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

  const elapsedMinutes = getElapsedMinutes(ticket.sentAt, now);
  const preparationMinutes = Math.max(
    0,
    ...ticket.items.map((item) => item.preparationMinutes || 0),
  );
  const overdue =
    preparationMinutes > 0 && elapsedMinutes >= preparationMinutes;
  const nearingDeadline =
    !overdue &&
    preparationMinutes > 0 &&
    elapsedMinutes >= preparationMinutes * 0.7;
  const progress =
    preparationMinutes > 0
      ? Math.min(100, (elapsedMinutes / preparationMinutes) * 100)
      : 0;
  const visibleItems =
    stationFilter === "ALL"
      ? ticket.items
      : ticket.items.filter(
          (item) => item.kitchenStation === stationFilter,
        );
  const station =
    stationFilter === "ALL" ? getTicketStation(ticket) : stationFilter;
  const orderMode = ticket.restaurantTicket.orderMode;
  const displayOrderNumber = formatRestaurantOrderNumber(
    ticket.restaurantTicket.ticketNo,
    ticket.restaurantTicket.id,
  );

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-[#191c21] shadow-sm shadow-black/20 transition ${
        overdue
          ? "border-rose-400/70"
          : nearingDeadline
            ? "border-white/20"
            : "border-white/[0.09]"
      }`}
    >
      <span
        className={`absolute inset-x-0 top-0 h-1 ${
          overdue ? "bg-rose-400" : "bg-slate-500"
        }`}
      />

      <div className="border-b border-white/[0.08] px-4 pb-3.5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
              <ReceiptText className="size-3.5" />
              Шинэ захиалга
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-black leading-none tracking-tight text-white">
                Захиалга №{displayOrderNumber}
              </h3>
              <span className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-300">
                {orderModeLabels[orderMode]}
              </span>
            </div>
          </div>
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-sm font-black tabular-nums ${
              overdue
                ? "border-rose-300/40 bg-rose-400 text-white"
                : nearingDeadline
                  ? "border-white/15 bg-white/10 text-white"
                  : "border-white/[0.08] bg-black/20 text-slate-200"
            }`}
          >
            <Clock3 className="size-4" />
            {elapsedMinutes} мин
          </div>
        </div>

        {preparationMinutes > 0 ? (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
              <span>{stationLabels[station] || "Гал тогоо"}</span>
              <span>Зорилт {preparationMinutes} мин</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/30">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${
                  overdue
                    ? "bg-rose-400"
                    : "bg-slate-300"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
            {stationLabels[station] || "Гал тогоо"}
          </p>
        )}
      </div>

      <div className="px-4 py-1">
        <div className="divide-y divide-white/[0.07]">
          {visibleItems.map((item) => (
            <div key={item.id} className="flex gap-3 py-3">
              <span className="flex h-8 min-w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.09] px-2 text-sm font-black text-white">
                ×{item.qty}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-black leading-6 text-white">
                  {item.name}
                </p>
                {item.note ? (
                  <p className="mt-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs font-bold leading-5 text-slate-300">
                    <span className="mr-1 text-slate-400">АНХААР:</span>
                    {item.note}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/[0.08] bg-black/10 p-3">
        <button
          type="button"
          onClick={onAdvance}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-200 text-sm font-black text-emerald-950 transition hover:bg-emerald-100 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {busy ? "Хааж байна..." : "Бэлэн болсон"}
        </button>
      </div>
    </article>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex h-full min-h-72 items-center justify-center">
      <div className="max-w-md text-center">
        <ChefHat className="mx-auto size-12 text-slate-600" />
        <h2 className="mt-4 text-xl font-black">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-950 transition hover:bg-white"
          >
            <FlaskConical className="size-4" />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
