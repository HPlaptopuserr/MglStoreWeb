"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Menu,
  Minus,
  Plus,
  RefreshCw,
  Send,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import {
  createPublicRestaurantOrder,
  getPublicRestaurantMenu,
  type RestaurantPublicMenu,
  type RestaurantPublicMenuProduct,
  type RestaurantTicket,
} from "@/lib/restaurant-pos-api";

type CartLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
  note: string;
  stockQty: number;
  imageUrl: string | null;
};

type PublicMenuCategory =
  | NonNullable<RestaurantPublicMenuProduct["menuCategory"]>
  | "OTHER";

const categoryLabels: Record<PublicMenuCategory, string> = {
  HOT: "Халуун хоол",
  COLD: "Хүйтэн хоол",
  SOUP: "Шөл",
  GRILL: "Грилл",
  APPETIZER: "Зууш",
  DESSERT: "Амттан",
  DRINK: "Ундаа",
  OTHER: "Бусад",
};

const moneyFormatter = new Intl.NumberFormat("mn-MN");
const formatMoney = (value: number) => `${moneyFormatter.format(value)}₮`;

const getProductCategory = (
  product: RestaurantPublicMenuProduct,
): PublicMenuCategory => product.menuCategory || "OTHER";

const buildProductDescription = (product: RestaurantPublicMenuProduct) => {
  const parts = [categoryLabels[getProductCategory(product)]];
  if (product.preparationMinutes) {
    parts.push(`${product.preparationMinutes} минут орчим`);
  }
  if (product.kitchenStation === "BAR") parts.push("барнаас гарна");
  return `${parts.join(" · ")}.`;
};

export function RestaurantQrMenuScreen({ token }: { token: string }) {
  const [menu, setMenu] = useState<RestaurantPublicMenu | null>(null);
  const [activeCategory, setActiveCategory] =
    useState<PublicMenuCategory | "ALL">("ALL");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderNote, setOrderNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successTicket, setSuccessTicket] = useState<RestaurantTicket | null>(
    null,
  );

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextMenu = await getPublicRestaurantMenu(token);
      setMenu(nextMenu);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Меню ачаалахад алдаа гарлаа",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  const categories = useMemo(() => {
    if (!menu) return [];
    const orderedCategories: PublicMenuCategory[] = [
      "HOT",
      "SOUP",
      "GRILL",
      "APPETIZER",
      "COLD",
      "DESSERT",
      "DRINK",
      "OTHER",
    ];
    const present = new Set(menu.products.map(getProductCategory));
    return orderedCategories.filter((category) => present.has(category));
  }, [menu]);

  const visibleProducts = useMemo(() => {
    if (!menu) return [];
    return menu.products.filter(
      (product) =>
        activeCategory === "ALL" ||
        getProductCategory(product) === activeCategory,
    );
  }, [activeCategory, menu]);

  const sectionTitle =
    activeCategory === "ALL" ? "Popular Items" : categoryLabels[activeCategory];
  const sectionSubtitle =
    activeCategory === "ALL"
      ? "The most commonly ordered items and dishes from this store"
      : "Энэ ангиллын хоол, уух зүйлс";
  const cartTotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const cartQty = cart.reduce((sum, line) => sum + line.qty, 0);
  const canSubmit =
    Boolean(menu?.orderingAvailable) &&
    cart.length > 0 &&
    cartTotal > 0 &&
    !submitting;

  const addToCart = (product: RestaurantPublicMenuProduct) => {
    setSuccessTicket(null);
    setError("");
    setCart((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (existing) {
        if (existing.qty >= product.stockQty) return current;
        return current.map((line) =>
          line.id === product.id ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      if (product.stockQty <= 0) return current;
      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          qty: 1,
          note: "",
          stockQty: product.stockQty,
          imageUrl: product.imageUrl,
        },
      ];
    });
  };

  const changeQty = (lineId: string, delta: number) => {
    setCart((current) =>
      current
        .map((line) => {
          if (line.id !== lineId) return line;
          return {
            ...line,
            qty: Math.min(line.stockQty, Math.max(0, line.qty + delta)),
          };
        })
        .filter((line) => line.qty > 0),
    );
  };

  const updateLineNote = (lineId: string, note: string) => {
    setCart((current) =>
      current.map((line) => (line.id === lineId ? { ...line, note } : line)),
    );
  };

  const submitOrder = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    setSuccessTicket(null);
    try {
      const result = await createPublicRestaurantOrder(token, {
        note: orderNote.trim() || undefined,
        lines: cart.map((line) => ({
          productId: line.id,
          qty: line.qty,
          note: line.note.trim() || undefined,
        })),
      });
      setSuccessTicket(result.ticket);
      setCart([]);
      setOrderNote("");
      await loadMenu();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Захиалга илгээхэд алдаа гарлаа",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 text-slate-950">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-slate-500" />
          <p className="mt-4 text-sm font-semibold text-slate-600">
            Меню ачааллаж байна...
          </p>
        </div>
      </main>
    );
  }

  if (error && !menu) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 text-slate-950">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <UtensilsCrossed className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-4 text-xl font-bold">QR menu олдсонгүй</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void loadMenu()}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Дахин ачаалах
          </button>
        </div>
      </main>
    );
  }

  if (!menu) return null;

  return (
    <main className="min-h-screen bg-white pb-44 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div>
            <h1 className="text-base font-bold leading-tight">Full Menu</h1>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {menu.branch.name} · Ширээ {menu.table.label}
            </p>
          </div>

          {!menu.orderingAvailable ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              Одоогоор касс нээгдээгүй байна. Та зөөгчид хандаарай.
            </div>
          ) : null}

          {successTicket ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold leading-5 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Захиалга касс болон гал тогоо руу илгээгдлээ. Ticket:{" "}
                {successTicket.ticketNo}
              </span>
            </div>
          ) : null}

          {error ? (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold leading-5 text-rose-800">
              {error}
            </div>
          ) : null}

          <nav className="mt-4 flex items-center gap-6 overflow-x-auto border-t border-slate-100 pt-1">
            <Menu className="h-4 w-4 shrink-0 text-slate-500" />
            <button
              type="button"
              onClick={() => setActiveCategory("ALL")}
              className={`relative h-11 shrink-0 text-xs font-bold transition ${
                activeCategory === "ALL"
                  ? "text-slate-950"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Popular Items
              {activeCategory === "ALL" ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-slate-950" />
              ) : null}
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`relative h-11 shrink-0 text-xs font-bold transition ${
                  activeCategory === category
                    ? "text-slate-950"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {categoryLabels[category]}
                {activeCategory === category ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-slate-950" />
                ) : null}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-7">
        <div className="mb-5">
          <h2 className="text-xl font-bold">{sectionTitle}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {sectionSubtitle}
          </p>
        </div>

        {visibleProducts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center">
            <ShoppingBag className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-500">
              Энэ ангилалд хоол алга байна.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {visibleProducts.map((product) => {
              const cartLine = cart.find((line) => line.id === product.id);
              const selectedQty = cartLine?.qty || 0;
              const soldOut = product.stockQty <= selectedQty;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={!menu.orderingAvailable || soldOut}
                  className="group grid min-h-[136px] grid-cols-[minmax(0,1fr)_120px] overflow-hidden rounded-sm border border-slate-200 bg-white text-left shadow-sm transition hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:grid-cols-[minmax(0,1fr)_148px]"
                >
                  <span className="flex min-w-0 flex-col px-4 py-4">
                    <span className="line-clamp-2 text-sm font-bold leading-5 text-slate-950">
                      {product.name}
                    </span>
                    <span className="mt-1 line-clamp-2 min-h-9 text-xs font-medium leading-4 text-slate-500">
                      {buildProductDescription(product)}
                    </span>
                    <span className="mt-auto flex items-end justify-between gap-2 pt-3">
                      <span className="text-sm font-semibold text-slate-800">
                        {formatMoney(product.price)}
                      </span>
                      {selectedQty > 0 ? (
                        <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[11px] font-bold text-white">
                          {selectedQty}
                        </span>
                      ) : soldOut ? (
                        <span className="text-[11px] font-bold text-slate-400">
                          Дууссан
                        </span>
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition group-hover:bg-slate-950 group-hover:text-white">
                          <Plus className="h-4 w-4" />
                        </span>
                      )}
                    </span>
                  </span>

                  <span className="relative block h-full min-h-[136px] bg-slate-100">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-100 via-amber-100 to-red-100 text-orange-500">
                        <UtensilsCrossed className="h-9 w-9" />
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {cart.length > 0 ? (
        <section className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.10)]">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Таны сагс
                    </p>
                    <p className="text-lg font-bold text-slate-950">
                      {cartQty} item · {formatMoney(cartTotal)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void submitOrder()}
                    disabled={!canSubmit}
                    className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Захиалах
                  </button>
                </div>

                <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                  {cart.map((line) => (
                    <article
                      key={line.id}
                      className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-950">
                            {line.name}
                          </p>
                          <span className="shrink-0 text-xs font-semibold text-slate-500">
                            {formatMoney(line.price * line.qty)}
                          </span>
                        </div>
                        <input
                          value={line.note}
                          onChange={(event) =>
                            updateLineNote(line.id, event.target.value)
                          }
                          placeholder="Тэмдэглэл: сонгино багатай..."
                          className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                        />
                      </div>
                      <div className="flex h-9 items-center gap-1 rounded-full border border-slate-200 bg-white px-1">
                        <button
                          type="button"
                          onClick={() => changeQty(line.id, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                          aria-label={`${line.name} хасах`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQty(line.id, 1)}
                          disabled={line.qty >= line.stockQty}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 disabled:text-slate-300"
                          aria-label={`${line.name} нэмэх`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <textarea
                  value={orderNote}
                  onChange={(event) => setOrderNote(event.target.value)}
                  rows={2}
                  placeholder="Нийт захиалгын тэмдэглэл..."
                  className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
