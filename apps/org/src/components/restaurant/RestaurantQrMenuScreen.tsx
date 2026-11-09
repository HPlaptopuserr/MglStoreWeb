"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Menu,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Smartphone,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import { QrGenerator } from "@mgl/ui";
import { QrMenuDialog } from "./QrMenuDialog";
import {
  createPublicRestaurantQPayInvoice,
  getPublicRestaurantQPayStatus,
  getPublicRestaurantMenu,
  type RestaurantPublicMenu,
  type RestaurantPublicMenuProduct,
  type RestaurantPublicQPayInvoice,
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

type PublicMenuCategory = string;

const moneyFormatter = new Intl.NumberFormat("mn-MN");
const formatMoney = (value: number) => `${moneyFormatter.format(value)}₮`;

const LOCAL_BANK_APP_LOGOS = [
  {
    src: "/payment-apps/khan-bank.png",
    patterns: ["khan bank", "khan", "хаан банк", "хаан"],
  },
  {
    src: "/payment-apps/state-bank.png",
    patterns: ["state bank", "statebank", "төрийн банк", "төрийн"],
  },
  {
    src: "/payment-apps/xac-bank.png",
    patterns: [
      "xac bank",
      "xac",
      "khas bank",
      "khas",
      "хас банк",
      "хасбанк",
      "хас",
    ],
  },
  {
    src: "/payment-apps/tdb.png",
    patterns: [
      "trade and development",
      "tdb online",
      "tdb",
      "худалдаа хөгжлийн",
      "худалдаа",
    ],
  },
  {
    src: "/payment-apps/social-pay.png",
    patterns: ["social pay", "socialpay"],
  },
  {
    src: "/payment-apps/most-money.png",
    patterns: ["most money", "mostmoney", "most"],
  },
  {
    src: "/payment-apps/national-investment-bank.png",
    patterns: [
      "national investment bank",
      "national investment",
      "investment bank",
      "nib",
      "үндэсний хөрөнгө оруулалтын банк",
      "үндэсний хөрөнгө",
    ],
  },
  {
    src: "/payment-apps/chinggis-khaan-bank.png",
    patterns: [
      "chinggis khaan",
      "chinggis",
      "chingis",
      "чингис хаан",
      "чингис",
    ],
  },
  {
    src: "/payment-apps/capitron-bank.png",
    patterns: ["capitron bank", "capitron", "капитрон банк", "капитрон"],
  },
  {
    src: "/payment-apps/bogd-bank.png",
    patterns: ["bogd bank", "bogd", "богд банк", "богд"],
  },
  {
    src: "/payment-apps/toki.png",
    patterns: ["toki app", "toki pay", "toki"],
  },
  {
    src: "/payment-apps/arig-bank.png",
    patterns: ["arig bank", "arig", "ариг банк", "ариг"],
  },
  {
    src: "/payment-apps/monpay.png",
    patterns: ["monpay", "mon pay", "мон пэй"],
  },
  {
    src: "/payment-apps/hipay.png",
    patterns: ["hipay", "hi pay"],
  },
  {
    src: "/payment-apps/happy-pay.png",
    patterns: ["happy pay mn", "happy pay", "happypay"],
  },
  {
    src: "/payment-apps/sono.png",
    patterns: ["sono"],
  },
  {
    src: "/payment-apps/payon.png",
    patterns: ["payon", "pay on"],
  },
] as const;

type BankDeepLinkLike = {
  name?: string;
  description?: string;
  logo?: string;
  link?: string;
};

const normalizeBankText = (value?: string) =>
  String(value || "")
    .trim()
    .toLowerCase();

function findLocalBankLogo(link: BankDeepLinkLike) {
  const haystack = normalizeBankText(
    [link.name, link.description, link.link].filter(Boolean).join(" "),
  );
  let bestMatch: { src: string; score: number } | null = null;

  for (const logo of LOCAL_BANK_APP_LOGOS) {
    for (const pattern of logo.patterns) {
      const normalizedPattern = normalizeBankText(pattern);
      if (!normalizedPattern || !haystack.includes(normalizedPattern)) continue;
      if (!bestMatch || normalizedPattern.length > bestMatch.score) {
        bestMatch = { src: logo.src, score: normalizedPattern.length };
      }
    }
  }

  return bestMatch?.src;
}

function looksLikeBase64Image(value: string) {
  if (value.length < 80 || value.includes("/") || value.includes("\\")) {
    return false;
  }
  return /^[A-Za-z0-9+/=]+$/.test(value);
}

function getBankLogoCandidates(link: BankDeepLinkLike) {
  const logo = String(link.logo || "").trim();
  const localLogo = findLocalBankLogo(link);
  const candidates: string[] = [];

  if (logo.startsWith("data:image")) {
    candidates.push(logo);
  } else if (looksLikeBase64Image(logo)) {
    candidates.push(`data:image/png;base64,${logo}`);
  } else if (logo.startsWith("//")) {
    candidates.push(`https:${logo}`);
  } else if (logo.startsWith("http://")) {
    candidates.push(`https://${logo.slice("http://".length)}`, logo);
  } else if (logo.startsWith("https://") || logo.startsWith("/payment-apps/")) {
    candidates.push(logo);
  } else if (logo) {
    const path = logo.replace(/^\/+/, "");
    candidates.push(
      `https://api.minu.mn/${path}`,
      `https://api.minu.mn/qrpay/${path}`,
      `https://api.minu.mn/deeplink/${path}`,
    );
  }

  if (localLogo) candidates.push(localLogo);
  return [...new Set(candidates)];
}

function BankAppLogo({ link }: { link: BankDeepLinkLike }) {
  const candidates = useMemo(() => getBankLogoCandidates(link), [link]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const src = candidates[candidateIndex];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        onError={() => setCandidateIndex((index) => index + 1)}
        className="h-full w-full object-contain p-1"
      />
    );
  }

  return <Smartphone className="h-4 w-4" />;
}

const getProductCategory = (
  product: RestaurantPublicMenuProduct,
): PublicMenuCategory => product.menuCategory || "OTHER";

const buildProductDescription = (
  product: RestaurantPublicMenuProduct,
  categoryLabels: Map<string, string>,
) => {
  const category = getProductCategory(product);
  const parts = [categoryLabels.get(category) || category];
  if (product.preparationMinutes) {
    parts.push(`${product.preparationMinutes} минут орчим`);
  }
  if (product.kitchenStation === "BAR") parts.push("барнаас гарна");
  return `${parts.join(" · ")}.`;
};

export function RestaurantQrMenuScreen({ token }: { token: string }) {
  const [menu, setMenu] = useState<RestaurantPublicMenu | null>(null);
  const [activeCategory, setActiveCategory] = useState<
    PublicMenuCategory | "ALL"
  >("ALL");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderNote, setOrderNote] = useState("");
  const [activeSheet, setActiveSheet] = useState<"cart" | "payment" | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [error, setError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentInvoice, setPaymentInvoice] =
    useState<RestaurantPublicQPayInvoice | null>(null);
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

  const categoryLabels = useMemo(
    () =>
      new Map<string, string>([
        ...(menu?.categories.map(
          (category) => [category.code, category.name] as const,
        ) || []),
        ["OTHER", "Бусад"],
      ]),
    [menu],
  );

  const categories = useMemo(() => {
    if (!menu) return [];
    const present = new Set(menu.products.map(getProductCategory));
    const configured = menu.categories
      .map((category) => category.code)
      .filter((category) => present.has(category));
    return [...configured, ...(present.has("OTHER") ? ["OTHER"] : [])];
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
    activeCategory === "ALL"
      ? "Меню"
      : categoryLabels.get(activeCategory) || activeCategory;
  const sectionSubtitle =
    activeCategory === "ALL"
      ? "Хоол, уух зүйлсээ сонгоод сагсандаа нэмээрэй."
      : "Энэ ангиллын хоол, уух зүйлс";
  const cartTotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const cartQty = cart.reduce((sum, line) => sum + line.qty, 0);
  const paymentPending = paymentInvoice?.status === "PENDING";
  const canSubmit =
    Boolean(menu?.orderingAvailable) &&
    cart.length > 0 &&
    cartTotal > 0 &&
    !submitting &&
    !paymentPending;

  const addToCart = (product: RestaurantPublicMenuProduct) => {
    if (paymentPending || submitting) return;
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
    if (paymentPending || submitting) return;
    if (
      delta < 0 &&
      cart.length === 1 &&
      cart[0].id === lineId &&
      cart[0].qty === 1
    )
      setActiveSheet(null);
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
    if (paymentPending || submitting) return;
    setCart((current) =>
      current.map((line) => (line.id === lineId ? { ...line, note } : line)),
    );
  };

  const submitOrder = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    setSuccessTicket(null);
    setPaymentMessage("");
    try {
      const result = await createPublicRestaurantQPayInvoice(token, {
        note: orderNote.trim() || undefined,
        lines: cart.map((line) => ({
          productId: line.id,
          qty: line.qty,
          note: line.note.trim() || undefined,
        })),
      });
      setPaymentInvoice(result);
      setPaymentMessage("Төлбөрийн апп сонгоно уу.");
      setActiveSheet("payment");
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

  const openPayment = () => {
    if (paymentInvoice) setActiveSheet("payment");
    else void submitOrder();
  };

  const paymentInvoiceId = paymentInvoice?.invoiceId || "";
  const paymentInvoiceStatus = paymentInvoice?.status || "";
  const bankDeepLinks = paymentInvoice?.deepLinks ?? [];
  const hasBankDeepLinks = bankDeepLinks.length > 0;

  const checkPaymentStatus = useCallback(
    async (silent = false) => {
      if (!paymentInvoiceId || paymentInvoiceStatus !== "PENDING") return;
      if (!silent) setCheckingPayment(true);
      try {
        const result = await getPublicRestaurantQPayStatus(
          token,
          paymentInvoiceId,
        );
        setPaymentInvoice(result);
        setPaymentMessage(result.message);
        if (result.status === "PAID" && result.ticket) {
          setSuccessTicket(result.ticket);
          setCart([]);
          setOrderNote("");
          setPaymentInvoice(null);
          setPaymentMessage("");
          setActiveSheet(null);
          await loadMenu();
        } else if (result.status === "EXPIRED") {
          setError(result.message);
        }
      } catch (statusError) {
        setError(
          statusError instanceof Error
            ? statusError.message
            : "QPay төлбөр шалгахад алдаа гарлаа",
        );
      } finally {
        if (!silent) setCheckingPayment(false);
      }
    },
    [loadMenu, paymentInvoiceId, paymentInvoiceStatus, token],
  );

  useEffect(() => {
    if (!paymentInvoiceId || paymentInvoiceStatus !== "PENDING") return;
    void checkPaymentStatus(true);
    const timer = window.setInterval(() => {
      void checkPaymentStatus(true);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [checkPaymentStatus, paymentInvoiceId, paymentInvoiceStatus]);

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
    <main className="min-h-screen bg-white pb-32 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div>
            <h1 className="text-base font-bold leading-tight">
              {menu.organization.name}
            </h1>
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
                Захиалга касс болон гал тогоо руу илгээгдлээ. Захиалгын №:{" "}
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
              Бүгд
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
                {categoryLabels.get(category) || category}
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
                  disabled={
                    !menu.orderingAvailable || soldOut || paymentPending
                  }
                  className="group grid min-h-[136px] grid-cols-[minmax(0,1fr)_120px] overflow-hidden rounded-sm border border-slate-200 bg-white text-left shadow-sm transition hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:grid-cols-[minmax(0,1fr)_148px]"
                >
                  <span className="flex min-w-0 flex-col px-4 py-4">
                    <span className="line-clamp-2 text-sm font-bold leading-5 text-slate-950">
                      {product.name}
                    </span>
                    <span className="mt-1 line-clamp-2 min-h-9 text-xs font-medium leading-4 text-slate-500">
                      {buildProductDescription(product, categoryLabels)}
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

      {cart.length > 0 && (
        <section
          aria-label="Сагсны хураангуй"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setActiveSheet("cart")}
              className="flex min-h-12 min-w-0 items-center gap-3 rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900"
              aria-label="Сагс харах"
            >
              <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100">
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                <span className="absolute -right-1 -top-1 rounded-full bg-slate-950 px-1.5 text-[10px] font-bold leading-5 text-white">
                  {cartQty}
                </span>
              </span>
              <span>
                <span className="block text-xs font-medium text-slate-500">
                  Сагс харах
                </span>
                <span className="block text-base font-bold tabular-nums">
                  {formatMoney(cartTotal)}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={openPayment}
              disabled={submitting || (!canSubmit && !paymentInvoice)}
              className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-7 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CreditCard className="h-4 w-4" aria-hidden="true" />
              )}
              Төлөх
            </button>
          </div>
        </section>
      )}
      {activeSheet === "cart" && cart.length > 0 && (
        <QrMenuDialog
          title="Таны сагс"
          subtitle={`Ширээ ${menu.table.label} · ${cartQty} бүтээгдэхүүн`}
          onClose={() => setActiveSheet(null)}
          footer={
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">Нийт төлөх</p>
                <p className="text-xl font-bold tabular-nums">
                  {formatMoney(cartTotal)}
                </p>
              </div>
              <button
                type="button"
                onClick={openPayment}
                disabled={submitting || (!canSubmit && !paymentInvoice)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-7 text-sm font-bold text-white disabled:opacity-50"
              >
                {submitting && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Төлөх
              </button>
            </div>
          }
        >
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
            >
              {error}
            </p>
          )}
          {paymentPending && (
            <p
              role="status"
              className="mb-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-600"
            >
              Төлбөр хүлээгдэж байна. «Төлөх» товчоор үргэлжлүүлнэ үү.
            </p>
          )}
          <div className="space-y-3">
            {cart.map((line) => (
              <article
                key={line.id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold">{line.name}</p>
                  <p className="shrink-0 text-sm font-bold tabular-nums">
                    {formatMoney(line.price * line.qty)}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    aria-label={`${line.name} тэмдэглэл`}
                    value={line.note}
                    onChange={(event) =>
                      updateLineNote(line.id, event.target.value)
                    }
                    disabled={paymentPending || submitting}
                    placeholder="Нэмэлт хүсэлт…"
                    className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-slate-600"
                  />
                  <div className="flex shrink-0 items-center rounded-lg bg-slate-100">
                    <button
                      type="button"
                      onClick={() => changeQty(line.id, -1)}
                      disabled={paymentPending || submitting}
                      aria-label={`${line.name} хасах`}
                      className="grid h-11 w-9 place-items-center disabled:opacity-30"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeQty(line.id, 1)}
                      disabled={
                        paymentPending ||
                        submitting ||
                        line.qty >= line.stockQty
                      }
                      aria-label={`${line.name} нэмэх`}
                      className="grid h-11 w-9 place-items-center disabled:opacity-30"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <label className="mt-4 block text-xs font-semibold text-slate-600">
            Захиалгын нэмэлт хүсэлт
            <textarea
              value={orderNote}
              onChange={(event) => setOrderNote(event.target.value)}
              disabled={paymentPending || submitting}
              rows={2}
              placeholder="Нэмэлт хүсэлтээ бичээрэй…"
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-slate-600"
            />
          </label>
        </QrMenuDialog>
      )}
      {activeSheet === "payment" && paymentInvoice && (
        <QrMenuDialog
          title="Төлөх"
          subtitle={`Ширээ ${menu.table.label}`}
          onClose={() => setActiveSheet(null)}
          footer={
            paymentInvoice.status === "EXPIRED" ? (
              <button
                type="button"
                onClick={() => {
                  setPaymentInvoice(null);
                  setPaymentMessage("");
                  setActiveSheet("cart");
                }}
                className="min-h-12 w-full rounded-xl bg-slate-950 px-4 text-sm font-bold text-white"
              >
                Дахин төлөх
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void checkPaymentStatus(false)}
                disabled={
                  checkingPayment || paymentInvoice.status !== "PENDING"
                }
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {checkingPayment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Төлбөр шалгах
              </button>
            )
          }
        >
          <div className="mb-4 text-center">
            <p className="text-xs font-medium text-slate-500">Төлөх дүн</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {formatMoney(paymentInvoice.amount)}
            </p>
            <p role="status" className="mt-2 text-sm text-slate-600">
              {paymentInvoice.status === "EXPIRED"
                ? "Төлбөрийн хугацаа дууссан"
                : paymentMessage || "Төлбөрийн апп сонгоно уу."}
            </p>
          </div>
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
            >
              {error}
            </p>
          )}
          {hasBankDeepLinks ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {bankDeepLinks.map((link, index) => (
                <a
                  key={`${link.link}-${index}`}
                  href={
                    paymentInvoice.status === "PENDING" ? link.link : undefined
                  }
                  aria-disabled={paymentInvoice.status !== "PENDING"}
                  className="flex min-h-24 min-w-0 flex-col items-center justify-start gap-2 rounded-xl border border-slate-200 bg-white px-1.5 py-3 text-center transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 aria-disabled:opacity-40"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50">
                    <BankAppLogo link={link} />
                  </span>
                  <span className="break-words text-[11px] font-semibold leading-4">
                    {link.name || link.description || "Төлбөрийн апп"}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-600">
                Өөр төхөөрөмжөөр QR кодыг уншуулж төлнө үү.
              </p>
              {paymentInvoice.qrText ? (
                <QrGenerator
                  value={paymentInvoice.qrText}
                  size={180}
                  level="M"
                />
              ) : paymentInvoice.qrImage ? (
                <Image
                  src={`data:image/png;base64,${paymentInvoice.qrImage}`}
                  unoptimized
                  width={180}
                  height={180}
                  alt="Төлбөрийн QR код"
                  className="h-44 w-44"
                />
              ) : (
                <Loader2 className="h-8 w-8 animate-spin" />
              )}
            </div>
          )}
          <p className="mt-4 text-center text-xs text-slate-400">
            Хүчинтэй хугацаа:{" "}
            {new Date(paymentInvoice.expiresAt).toLocaleTimeString("mn-MN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </QrMenuDialog>
      )}
    </main>
  );
}
