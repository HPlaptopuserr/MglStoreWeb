"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  ChefHat,
  ChevronDown,
  CreditCard,
  LayoutGrid,
  Loader2,
  Minus,
  Plus,
  QrCode,
  Search,
  Send,
  Trash2,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useOrg } from "@/components/org/OrgContext";
import { API, authFetch } from "@/lib/api";

type OrderMode = "DINE_IN" | "TO_GO" | "DELIVERY";
type MenuCategory =
  | "hot"
  | "cold"
  | "soup"
  | "grill"
  | "appetizer"
  | "dessert"
  | "drink";
type MenuCategoryFilter = "all" | MenuCategory;
type DishTone = "coral" | "amber" | "mint" | "lime" | "orange" | "sky";
type TableStatus = "FREE" | "OPEN" | "KITCHEN" | "RESERVED";
type PaymentMethod = "CASH" | "CARD" | "QPAY";

type MenuItem = {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  available: number;
  tone: DishTone;
  imageUrl?: string;
};

type TicketLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
  note: string;
  tone: DishTone;
  imageUrl?: string;
};

type DiningTable = {
  id: string;
  label: string;
  zone: string;
  seats: number;
  status: TableStatus;
  total: number;
};

type ApiRestaurantProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  isActive: boolean;
  menuCategory:
    | "HOT"
    | "COLD"
    | "SOUP"
    | "GRILL"
    | "APPETIZER"
    | "DESSERT"
    | "DRINK"
    | null;
  images?: Array<{ id: string; url: string }>;
};

const categories: { id: MenuCategoryFilter; label: string }[] = [
  { id: "all", label: "Бүгд" },
  { id: "hot", label: "Халуун хоол" },
  { id: "cold", label: "Хүйтэн хоол" },
  { id: "soup", label: "Шөл" },
  { id: "grill", label: "Грилл" },
  { id: "appetizer", label: "Зууш" },
  { id: "dessert", label: "Амттан" },
  { id: "drink", label: "Ундаа" },
];

const diningTables: DiningTable[] = [
  { id: "A1", label: "A1", zone: "Гол заал", seats: 4, status: "OPEN", total: 213300 },
  { id: "A2", label: "A2", zone: "Гол заал", seats: 2, status: "KITCHEN", total: 92000 },
  { id: "A3", label: "A3", zone: "Гол заал", seats: 6, status: "FREE", total: 0 },
  { id: "A4", label: "A4", zone: "Цонхны тал", seats: 4, status: "RESERVED", total: 216000 },
  { id: "T1", label: "T1", zone: "Террас", seats: 4, status: "OPEN", total: 148000 },
  { id: "VIP", label: "VIP", zone: "VIP", seats: 8, status: "FREE", total: 0 },
];

const dishToneStyles: Record<DishTone, string> = {
  coral: "from-rose-400 via-orange-300 to-emerald-300",
  amber: "from-amber-300 via-orange-500 to-stone-800",
  mint: "from-emerald-200 via-lime-200 to-orange-300",
  lime: "from-lime-300 via-emerald-500 to-yellow-200",
  orange: "from-orange-300 via-amber-600 to-emerald-400",
  sky: "from-sky-300 via-fuchsia-300 to-rose-300",
};

const tableStatusCopy: Record<TableStatus, string> = {
  FREE: "Сул",
  OPEN: "Нээлттэй",
  KITCHEN: "Гал тогоонд",
  RESERVED: "Захиалсан",
};

const tableStatusStyles: Record<TableStatus, string> = {
  FREE: "border-white/10 bg-white/[0.03] text-slate-300",
  OPEN: "border-sky-400/70 bg-sky-400/10 text-sky-200",
  KITCHEN: "border-amber-300/70 bg-amber-300/10 text-amber-200",
  RESERVED: "border-rose-300/70 bg-rose-300/10 text-rose-200",
};

const orderModeCopy: Record<OrderMode, string> = {
  DINE_IN: "Зааланд",
  TO_GO: "Авч явах",
  DELIVERY: "Хүргэлт",
};

const paymentOptions = [
  { value: "CASH", label: "Бэлэн", action: "Бэлэн төлбөр авах", icon: Banknote },
  { value: "CARD", label: "Карт", action: "Картын төлбөр авах", icon: CreditCard },
  { value: "QPAY", label: "QPay", action: "QPay нэхэмжлэх үүсгэх", icon: QrCode },
] satisfies Array<{
  value: PaymentMethod;
  label: string;
  action: string;
  icon: typeof Banknote;
}>;

const moneyFormatter = new Intl.NumberFormat("mn-MN");
const formatMoney = (value: number) => `${moneyFormatter.format(value)}₮`;

const menuCategoryMap: Record<
  NonNullable<ApiRestaurantProduct["menuCategory"]>,
  MenuCategory
> = {
  HOT: "hot",
  COLD: "cold",
  SOUP: "soup",
  GRILL: "grill",
  APPETIZER: "appetizer",
  DESSERT: "dessert",
  DRINK: "drink",
};

const categoryTone: Record<MenuCategory, DishTone> = {
  hot: "orange",
  cold: "mint",
  soup: "amber",
  grill: "coral",
  appetizer: "lime",
  dessert: "sky",
  drink: "sky",
};

export function RestaurantPosScreen() {
  const { user } = useOrg();
  const [activeCategory, setActiveCategory] =
    useState<MenuCategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [orderMode, setOrderMode] = useState<OrderMode>("DINE_IN");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [selectedTableId, setSelectedTableId] = useState("A1");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [ticketLines, setTicketLines] = useState<TicketLine[]>([]);

  const selectedTable =
    diningTables.find((table) => table.id === selectedTableId) ?? diningTables[0];
  const activeTables = diningTables.filter((table) => table.status !== "FREE").length;

  const loadMenu = useCallback(async () => {
    if (!user.organizationId) {
      setMenuLoading(false);
      return;
    }

    setMenuLoading(true);
    setMenuError("");
    try {
      const params = new URLSearchParams({
        organizationId: user.organizationId,
        restaurantMenu: "1",
      });
      const response = await authFetch(`${API}/products?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(payload?.message || "Меню ачаалахад алдаа гарлаа");
      }

      const nextItems = (Array.isArray(payload) ? payload : [])
        .filter(
          (product: ApiRestaurantProduct) =>
            product.isActive && product.menuCategory,
        )
        .map((product: ApiRestaurantProduct) => {
          const category = menuCategoryMap[product.menuCategory!];
          return {
            id: product.id,
            name: product.name,
            category,
            price: Number(product.price) || 0,
            available: Number(product.stock) || 0,
            tone: categoryTone[category],
            imageUrl: product.images?.[0]?.url,
          };
        });
      setMenuItems(nextItems);
    } catch (error) {
      setMenuError(
        error instanceof Error ? error.message : "Меню ачаалахад алдаа гарлаа",
      );
    } finally {
      setMenuLoading(false);
    }
  }, [user.organizationId]);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  const filteredMenu = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory;
      const matchesQuery =
        !normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, menuItems, query]);

  const subtotal = ticketLines.reduce((sum, line) => sum + line.price * line.qty, 0);
  const discount = 0;
  const total = subtotal - discount;
  const selectedPayment =
    paymentOptions.find((option) => option.value === paymentMethod) ?? paymentOptions[0];
  const SelectedPaymentIcon = selectedPayment.icon;

  const addItem = (item: MenuItem) => {
    setTicketLines((current) => {
      const existing = current.find((line) => line.id === item.id);
      if (existing) {
        return current.map((line) =>
          line.id === item.id ? { ...line, qty: line.qty + 1 } : line,
        );
      }

      return [
        ...current,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          qty: 1,
          note: "",
          tone: item.tone,
          imageUrl: item.imageUrl,
        },
      ];
    });
  };

  const changeQty = (lineId: string, delta: number) => {
    setTicketLines((current) =>
      current
        .map((line) =>
          line.id === lineId ? { ...line, qty: Math.max(0, line.qty + delta) } : line,
        )
        .filter((line) => line.qty > 0),
    );
  };

  const updateNote = (lineId: string, note: string) => {
    setTicketLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, note } : line)),
    );
  };

  return (
    <section className="h-full overflow-hidden bg-[#202331] text-slate-100 shadow-2xl shadow-slate-950/20">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_390px] bg-[#222532] max-xl:grid-cols-1 max-xl:overflow-y-auto">
        <main className="flex min-h-0 flex-col px-7 py-5 max-xl:min-h-[760px] max-md:px-4">
          <header className="flex shrink-0 items-start justify-between gap-4 max-lg:flex-col">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#1b1d2b] px-3 text-sm font-bold text-slate-200 transition hover:border-sky-400/60 hover:text-white"
                  aria-label="Буцах"
                  title="Буцах"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Буцах
                </Link>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-400 text-white">
                  <UtensilsCrossed className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-3xl font-semibold tracking-normal text-white">
                    Ресторан касс
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-400">
                    Ширээ {selectedTable.label} · {selectedTable.zone} · Ээлж нээлттэй
                  </p>
                </div>
              </div>
            </div>

            <label className="relative w-80 max-lg:w-full">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-12 w-full rounded-lg border border-white/5 bg-[#303442] pl-11 pr-4 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400/70"
                placeholder="Хоол, ундаа хайх..."
              />
            </label>
          </header>

          <section className="mt-4 shrink-0 rounded-lg border border-white/5 bg-[#1d1d2b] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <LayoutGrid className="h-4 w-4 text-sky-400" />
                Ширээний зураглал
              </div>
              <span className="text-xs font-bold text-slate-500">
                {activeTables} идэвхтэй · {diningTables.length} ширээ
              </span>
            </div>
            <div className="mt-3 grid grid-cols-6 gap-2 max-2xl:grid-cols-3 max-md:grid-cols-2">
              {diningTables.map((table) => {
                const isSelected = table.id === selectedTable.id;
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => setSelectedTableId(table.id)}
                    className={`h-16 rounded-lg border px-3 py-2 text-left transition ${
                      isSelected
                        ? "border-sky-400 bg-sky-400 text-white shadow-lg shadow-sky-500/20"
                        : `${tableStatusStyles[table.status]} hover:border-sky-400/50`
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-base font-black leading-none">{table.label}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold opacity-80">
                        <Users className="h-3 w-3" />
                        {table.seats}
                      </span>
                    </span>
                    <span className="mt-2 block truncate text-xs font-bold opacity-90">
                      {tableStatusCopy[table.status]}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="mt-4 flex shrink-0 items-center justify-between gap-4">
            <div className="flex min-w-0 gap-7 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`relative h-9 shrink-0 text-sm font-bold transition ${
                    activeCategory === category.id ? "text-sky-400" : "text-slate-200 hover:text-white"
                  }`}
                >
                  {category.label}
                  {activeCategory === category.id ? (
                    <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-sky-400" />
                  ) : null}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-white/5 bg-[#1d1d2b] px-4 text-sm font-bold text-slate-100 transition hover:bg-[#292b3b]"
            >
              <ChevronDown className="h-4 w-4" />
              Ширээ {selectedTable.label} · {orderModeCopy[orderMode]}
            </button>
          </div>

          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-4">
              <h3 className="text-xl font-bold tracking-normal text-white">Меню сонгох</h3>
              <p className="text-sm font-semibold text-slate-500">{filteredMenu.length} item</p>
            </div>

            {menuLoading ? (
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
              </div>
            ) : menuError ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
                <p className="text-sm font-bold text-rose-300">{menuError}</p>
                <button
                  type="button"
                  onClick={() => void loadMenu()}
                  className="mt-3 h-9 rounded-lg border border-white/10 px-4 text-sm font-bold text-slate-200 hover:bg-white/5"
                >
                  Дахин ачаалах
                </button>
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center border border-dashed border-white/10 text-center">
                <ChefHat className="h-9 w-9 text-slate-600" />
                <p className="mt-3 text-sm font-bold text-slate-300">
                  {query || activeCategory !== "all"
                    ? "Тохирох хоол олдсонгүй"
                    : "Менюд хоол бүртгэгдээгүй байна"}
                </p>
                {!query && activeCategory === "all" ? (
                  <Link
                    href="/dashboard/products"
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-sky-400 px-4 text-sm font-black text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Хоол нэмэх
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 grid min-h-0 flex-1 auto-rows-[184px] grid-cols-3 content-start gap-x-8 gap-y-5 overflow-y-auto pr-2 max-2xl:gap-x-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
                {filteredMenu.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item)}
                  disabled={item.available <= 0}
                  className="group relative h-full rounded-lg bg-[#1d1b2b] px-5 pb-4 pt-16 text-center shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:bg-[#242235] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                >
                  <DishVisual
                    tone={item.tone}
                    size="lg"
                    imageUrl={item.imageUrl}
                    className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-8"
                  />
                  <div className="flex h-full flex-col items-center justify-end">
                    <p className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-100">
                      {item.name}
                    </p>
                    <p className="mt-2 text-sm font-semibold tabular-nums text-slate-200">{formatMoney(item.price)}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {item.available > 0
                        ? `${item.available} порц боломжтой`
                        : "Дууссан"}
                    </p>
                  </div>
                  <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 text-sky-400 opacity-0 transition group-hover:opacity-100">
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
                ))}
              </div>
            )}
          </div>
        </main>

        <aside className="flex min-h-0 flex-col bg-[#1b1726] px-6 py-5 max-xl:min-h-[660px]">
          <div className="shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">Идэвхтэй захиалга</p>
                <h3 className="text-xl font-bold text-white">Ширээ {selectedTable.label}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {selectedTable.zone} · {selectedTable.seats} суудал
                </p>
              </div>
              <span className="rounded-lg bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
                Нээлттэй
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {(["DINE_IN", "TO_GO", "DELIVERY"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setOrderMode(mode)}
                  className={`h-10 rounded-lg border text-sm font-bold transition ${
                    orderMode === mode
                      ? "border-sky-400 bg-sky-400 text-white"
                      : "border-white/10 bg-transparent text-sky-400 hover:bg-white/5"
                  }`}
                >
                  {orderModeCopy[mode]}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={ticketLines.length === 0}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/40 bg-emerald-300/10 text-sm font-black text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-300 hover:text-slate-950"
            >
              <ChefHat className="h-4 w-4" />
              Гал тогоо руу илгээх
              <Send className="h-4 w-4" />
            </button>

            <div className="mt-4 grid grid-cols-[1fr_70px_74px] border-b border-white/10 pb-3 text-sm font-bold text-slate-200">
              <span>Item</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Price</span>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-4 pr-1">
            {ticketLines.length === 0 ? (
              <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
                <UtensilsCrossed className="h-8 w-8 text-slate-700" />
                <p className="mt-3 text-sm font-bold text-slate-500">
                  Менюгээс хоол сонгоно уу
                </p>
              </div>
            ) : ticketLines.map((line) => (
              <article key={line.id} className="space-y-3">
                <div className="grid grid-cols-[1fr_54px_72px] items-center gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <DishVisual
                      tone={line.tone}
                      size="sm"
                      imageUrl={line.imageUrl}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-100">{line.name}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">{formatMoney(line.price)}</p>
                    </div>
                  </div>

                  <div className="flex h-12 items-center justify-center gap-1 rounded-lg bg-[#2d3142]">
                    <button
                      type="button"
                      onClick={() => changeQty(line.id, -1)}
                      className="flex h-8 w-5 items-center justify-center text-slate-400 hover:text-white"
                      aria-label={`${line.name} хасах`}
                      title="Хасах"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold tabular-nums text-white">{line.qty}</span>
                    <button
                      type="button"
                      onClick={() => changeQty(line.id, 1)}
                      className="flex h-8 w-5 items-center justify-center text-slate-400 hover:text-white"
                      aria-label={`${line.name} нэмэх`}
                      title="Нэмэх"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="text-right text-sm font-bold tabular-nums text-white">
                    {formatMoney(line.price * line.qty)}
                  </p>
                </div>

                <div className="grid grid-cols-[1fr_54px] gap-3">
                  <input
                    value={line.note}
                    onChange={(event) => updateNote(line.id, event.target.value)}
                    placeholder="Захиалгын тэмдэглэл..."
                    className="h-12 rounded-lg border border-white/5 bg-[#2d3142] px-4 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/70"
                  />
                  <button
                    type="button"
                    onClick={() => changeQty(line.id, -line.qty)}
                    className="flex h-12 items-center justify-center rounded-lg border border-sky-400/70 text-sky-400 transition hover:bg-sky-400 hover:text-white"
                    aria-label={`${line.name} устгах`}
                    title="Устгах"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="shrink-0 border-t border-white/10 pt-5">
            <TotalLine label="Discount" value={formatMoney(discount)} />
            <TotalLine label="Sub total" value={formatMoney(subtotal)} />
            <TotalLine label="Total" value={formatMoney(total)} strong />

            <div className="mt-5">
              <p className="mb-2 text-xs font-bold text-slate-500">Төлбөрийн хэлбэр</p>
              <div className="grid grid-cols-3 gap-2">
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = paymentMethod === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPaymentMethod(option.value)}
                      aria-pressed={isActive}
                      className={`flex h-14 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-bold transition ${
                        isActive
                          ? "border-sky-400 bg-sky-400 text-white shadow-lg shadow-sky-500/20"
                          : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-sky-400/50 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              disabled={ticketLines.length === 0}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-sky-400 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
            >
              <SelectedPaymentIcon className="h-4 w-4" />
              {selectedPayment.action}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function DishVisual({
  tone,
  size,
  imageUrl,
  className = "",
}: {
  tone: DishTone;
  size: "sm" | "lg";
  imageUrl?: string;
  className?: string;
}) {
  const sizeClass = size === "lg" ? "h-24 w-24" : "h-11 w-11";
  const innerClass = size === "lg" ? "inset-2.5" : "inset-1.5";

  return (
    <span
      className={`relative block shrink-0 rounded-full bg-slate-200 p-1 shadow-xl shadow-black/20 ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-1 h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)] rounded-full object-cover"
        />
      ) : (
        <>
      <span className={`absolute ${innerClass} rounded-full bg-gradient-to-br ${dishToneStyles[tone]}`} />
      <span className="absolute inset-[24%] rounded-full bg-white/30 blur-[1px]" />
      <span className="absolute left-[22%] top-[30%] h-[12%] w-[24%] rounded-full bg-white/80" />
      <span className="absolute bottom-[22%] right-[24%] h-[16%] w-[28%] rounded-full bg-emerald-400/80" />
        </>
      )}
    </span>
  );
}

function TotalLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 text-sm">
      <span className={strong ? "font-bold text-slate-200" : "font-semibold text-slate-500"}>{label}</span>
      <span className={strong ? "text-base font-black tabular-nums text-white" : "font-bold tabular-nums text-slate-100"}>
        {value}
      </span>
    </div>
  );
}
