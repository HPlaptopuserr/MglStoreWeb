"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  History,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  Trash2,
  Warehouse,
  X,
  XCircle,
} from "lucide-react";
import { useOrg } from "@/components/org/OrgContext";
import {
  createCafeDailyStockReceipt,
  getCafeDailyStock,
  getRestaurantPosRegisters,
  saveCafeDailyStock,
  voidCafeDailyStockReceipt,
  type CafeDailyStockItem,
  type CafeDailyStockResponse,
} from "@/lib/restaurant-pos-api";

type DraftLine = {
  openingQty: string;
  wasteQty: string;
  note: string;
};

const formatQty = (value: number) =>
  new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 3 }).format(value);

const numberValue = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const inputValue = (value: number) => (value === 0 ? "" : String(value));

function todayInUlaanbaatar() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function shiftDate(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function displayDate(dateKey: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateKey}T12:00:00+08:00`));
}

function displayDateTime(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function makeDrafts(items: CafeDailyStockItem[]) {
  return Object.fromEntries(
    items.map((item) => [
      item.productId,
      {
        openingQty: inputValue(item.openingQty),
        wasteQty: inputValue(item.wasteQty),
        note: item.note,
      },
    ]),
  ) as Record<string, DraftLine>;
}

function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(
  data: CafeDailyStockResponse,
  drafts: Record<string, DraftLine>,
) {
  const headers = [
    "Огноо",
    "Салбар",
    "Ангилал",
    "Бүтээгдэхүүн",
    "Нэгж",
    "Эхний үлдэгдэл",
    "Өдрийн орлого",
    "Зарагдсан",
    "Хорогдол",
    "Үлдсэн",
    "Тайлбар",
  ];
  const rows = data.items.map((item) => {
    const draft = drafts[item.productId];
    const openingQty = numberValue(draft?.openingQty ?? "");
    const receivedQty = item.receivedQty;
    const wasteQty = numberValue(draft?.wasteQty ?? "");
    return [
      data.date,
      data.branch.name,
      item.categoryName,
      item.name,
      item.unit,
      openingQty,
      receivedQty,
      item.soldQty,
      wasteQty,
      openingQty + receivedQty - item.soldQty - wasteQty,
      draft?.note ?? "",
    ];
  });
  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `coffee-daily-stock-${data.date}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function CafeDailyStockScreen() {
  const { user, features } = useOrg();
  const isCafe = features.selfServiceMode === "CAFE";
  const [date, setDate] = useState(todayInUlaanbaatar);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<CafeDailyStockResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftLine>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [carrying, setCarrying] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptQuantities, setReceiptQuantities] = useState<
    Record<string, string>
  >({});
  const [receiptQuery, setReceiptQuery] = useState("");
  const [receiptNote, setReceiptNote] = useState("");
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [voidingReceiptId, setVoidingReceiptId] = useState("");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function loadBranches() {
      if (!isCafe || !user.organizationId) {
        setLoading(false);
        return;
      }
      try {
        const registers = await getRestaurantPosRegisters();
        if (!active) return;
        const uniqueBranches = Array.from(
          new Map(
            registers
              .filter(
                (register) =>
                  register.organizationId === user.organizationId &&
                  register.isActive,
              )
              .map((register) => [
                register.branch.id,
                { id: register.branch.id, name: register.branch.name },
              ]),
          ).values(),
        );
        setBranches(uniqueBranches);
        setBranchId((current) =>
          uniqueBranches.some((branch) => branch.id === current)
            ? current
            : uniqueBranches[0]?.id ?? "",
        );
        if (uniqueBranches.length === 0) {
          setError("Өдрийн бүртгэл хөтлөх идэвхтэй касс, салбар олдсонгүй.");
          setLoading(false);
        }
      } catch (cause) {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Салбарын мэдээлэл авахад алдаа гарлаа.",
        );
        setLoading(false);
      }
    }
    void loadBranches();
    return () => {
      active = false;
    };
  }, [isCafe, user.organizationId]);

  const loadStock = useCallback(async () => {
    if (!branchId || !date || !isCafe) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await getCafeDailyStock({ branchId, date });
      setData(result);
      setDrafts(makeDrafts(result.items));
      setDirty(false);
    } catch (cause) {
      setData(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Өдрийн барааны мэдээлэл авахад алдаа гарлаа.",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId, date, isCafe]);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const categories = useMemo(
    () =>
      Array.from(
        new Map(
          (data?.items ?? []).map((item) => [
            item.menuCategory || "UNCATEGORIZED",
            item.categoryName,
          ]),
        ).entries(),
      ).map(([id, name]) => ({ id, name })),
    [data?.items],
  );

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (data?.items ?? []).filter((item) => {
      const itemCategory = item.menuCategory || "UNCATEGORIZED";
      return (
        (category === "ALL" || itemCategory === category) &&
        (!normalized ||
          item.name.toLowerCase().includes(normalized) ||
          (item.sku || "").toLowerCase().includes(normalized))
      );
    });
  }, [category, data?.items, query]);

  const computedItems = useMemo(
    () =>
      (data?.items ?? []).map((item) => {
        const draft = drafts[item.productId];
        const openingQty = numberValue(draft?.openingQty ?? "");
        const receivedQty = item.receivedQty;
        const wasteQty = numberValue(draft?.wasteQty ?? "");
        return {
          ...item,
          openingQty,
          receivedQty,
          wasteQty,
          remainingQty:
            openingQty + receivedQty - item.soldQty - wasteQty,
        };
      }),
    [data?.items, drafts],
  );

  const computedById = useMemo(
    () => new Map(computedItems.map((item) => [item.productId, item])),
    [computedItems],
  );

  const totals = useMemo(
    () =>
      computedItems.reduce(
        (sum, item) => ({
          openingQty: sum.openingQty + item.openingQty,
          receivedQty: sum.receivedQty + item.receivedQty,
          soldQty: sum.soldQty + item.soldQty,
          wasteQty: sum.wasteQty + item.wasteQty,
          remainingQty: sum.remainingQty + item.remainingQty,
        }),
        {
          openingQty: 0,
          receivedQty: 0,
          soldQty: 0,
          wasteQty: 0,
          remainingQty: 0,
        },
      ),
    [computedItems],
  );

  const negativeCount = computedItems.filter(
    (item) => item.remainingQty < 0,
  ).length;

  const receiptProducts = useMemo(() => {
    const normalized = receiptQuery.trim().toLowerCase();
    return (data?.items ?? []).filter(
      (item) =>
        item.isActive &&
        (!normalized ||
          item.name.toLowerCase().includes(normalized) ||
          (item.sku || "").toLowerCase().includes(normalized)),
    );
  }, [data?.items, receiptQuery]);

  const selectedReceiptItems = useMemo(
    () =>
      (data?.items ?? [])
        .map((item) => ({
          productId: item.productId,
          quantity: numberValue(receiptQuantities[item.productId] ?? ""),
        }))
        .filter((item) => item.quantity > 0),
    [data?.items, receiptQuantities],
  );

  const updateDraft = (
    productId: string,
    field: keyof DraftLine,
    value: string,
  ) => {
    setDrafts((current) => ({
      ...current,
      [productId]: {
        ...(current[productId] || {
          openingQty: "",
          wasteQty: "",
          note: "",
        }),
        [field]: value,
      },
    }));
    setDirty(true);
    setNotice("");
  };

  const changeContext = (nextBranchId: string, nextDate: string) => {
    if (
      dirty &&
      !window.confirm("Хадгалаагүй өөрчлөлт байна. Үргэлжлүүлэх үү?")
    ) {
      return;
    }
    setBranchId(nextBranchId);
    setDate(nextDate);
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await saveCafeDailyStock({
        branchId: data.branch.id,
        date: data.date,
        items: data.items.map((item) => {
          const draft = drafts[item.productId];
          return {
            productId: item.productId,
            openingQty: numberValue(draft?.openingQty ?? ""),
            wasteQty: numberValue(draft?.wasteQty ?? ""),
            note: draft?.note ?? "",
          };
        }),
      });
      setData(result);
      setDrafts(makeDrafts(result.items));
      setDirty(false);
      setNotice("Өдрийн барааны бүртгэл хадгалагдлаа.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Өдрийн барааны бүртгэл хадгалахад алдаа гарлаа.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCarryPrevious = async () => {
    if (!data) return;
    setCarrying(true);
    setError("");
    setNotice("");
    try {
      const previous = await getCafeDailyStock({
        branchId: data.branch.id,
        date: shiftDate(data.date, -1),
      });
      const previousByProduct = new Map(
        previous.items.map((item) => [item.productId, item.remainingQty]),
      );
      setDrafts((current) =>
        Object.fromEntries(
          data.items.map((item) => {
            const existing = current[item.productId] || {
              openingQty: "",
              wasteQty: "",
              note: "",
            };
            return [
              item.productId,
              {
                ...existing,
                openingQty: inputValue(
                  Math.max(0, previousByProduct.get(item.productId) ?? 0),
                ),
              },
            ];
          }),
        ),
      );
      setDirty(true);
      setNotice(
        `${displayDate(previous.date)}-ны үлдэгдлийг эхний үлдэгдэлд орууллаа. Хадгалах товч дарна уу.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Өмнөх өдрийн үлдэгдэл авахад алдаа гарлаа.",
      );
    } finally {
      setCarrying(false);
    }
  };

  const openReceipt = () => {
    setReceiptQuantities({});
    setReceiptQuery("");
    setReceiptNote("");
    setReceiptOpen(true);
    setError("");
    setNotice("");
  };

  const handleReceiveStock = async () => {
    if (!data || selectedReceiptItems.length === 0) {
      setError("Орлогодох бүтээгдэхүүний тоог оруулна уу.");
      return;
    }
    setReceiptSaving(true);
    setError("");
    try {
      const result = await createCafeDailyStockReceipt({
        branchId: data.branch.id,
        date: data.date,
        note: receiptNote,
        items: selectedReceiptItems,
      });
      setData(result);
      setReceiptOpen(false);
      setReceiptQuantities({});
      setReceiptNote("");
      setNotice(
        `${selectedReceiptItems.length} бүтээгдэхүүний орлого амжилттай бүртгэгдлээ.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Бараа орлогодоход алдаа гарлаа.",
      );
    } finally {
      setReceiptSaving(false);
    }
  };

  const handleVoidReceipt = async (receiptId: string) => {
    if (!window.confirm("Энэ орлогын мөрийг цуцлах уу?")) return;
    setVoidingReceiptId(receiptId);
    setError("");
    setNotice("");
    try {
      const result = await voidCafeDailyStockReceipt({ receiptId });
      setData(result);
      setNotice("Орлогын мөр цуцлагдаж, өдрийн үлдэгдэл шинэчлэгдлээ.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Орлогын мөр цуцлахад алдаа гарлаа.",
      );
    } finally {
      setVoidingReceiptId("");
    }
  };

  if (!isCafe) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 text-xl font-black text-slate-950">
          Энэ хэсэг зөвхөн кофе шоп горимд ажиллана
        </h1>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-sm sm:px-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
              Кофе шопын өдөр тутмын бүртгэл
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Өдрийн бараа ба үлдэгдэл
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              Өдрийн бараагаа орлогодож, зарагдсан тоог кассын борлуулалтаас
              автоматаар тооцон үлдэгдлээ шууд хянана.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {branches.length > 1 ? (
              <select
                value={branchId}
                onChange={(event) => changeContext(event.target.value, date)}
                className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-black text-white outline-none"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id} className="text-slate-950">
                    {branch.name}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              onClick={() => changeContext(branchId, shiftDate(date, -1))}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 hover:bg-white/10"
              aria-label="Өмнөх өдөр"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <input
              type="date"
              value={date}
              onChange={(event) => changeContext(branchId, event.target.value)}
              className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-black text-white outline-none [color-scheme:dark]"
            />
            <button
              type="button"
              onClick={() => changeContext(branchId, shiftDate(date, 1))}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 hover:bg-white/10"
              aria-label="Дараагийн өдөр"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Өдрийн орлого",
            value: totals.receivedQty,
            icon: Warehouse,
            tone: "bg-sky-50 text-sky-700",
          },
          {
            label: "Зарагдсан",
            value: totals.soldQty,
            icon: ShoppingBag,
            tone: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Хорогдол",
            value: totals.wasteQty,
            icon: Trash2,
            tone: "bg-rose-50 text-rose-700",
          },
          {
            label: "Үлдсэн",
            value: totals.remainingQty,
            icon: PackageCheck,
            tone:
              negativeCount > 0
                ? "bg-amber-50 text-amber-700"
                : "bg-violet-50 text-violet-700",
          },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-black tabular-nums text-slate-950">
                  {formatQty(item.value)}
                </p>
              </div>
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.tone}`}
              >
                <item.icon className="h-5 w-5" />
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
          <div>
            <p className="text-sm font-black text-slate-950">
              {displayDate(date)}
              {data?.branch.name ? ` · ${data.branch.name}` : ""}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Эхний үлдэгдэл + орлого − зарагдсан − хорогдол = үлдсэн
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openReceipt}
              disabled={!data || loading || saving}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Орлого авах
            </button>
            <button
              type="button"
              onClick={() => void handleCarryPrevious()}
              disabled={!data || loading || saving || carrying}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {carrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PackageCheck className="h-4 w-4" />
              )}
              Өмнөх үлдэгдэл татах
            </button>
            <button
              type="button"
              onClick={() => void loadStock()}
              disabled={loading || saving}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Шинэчлэх
            </button>
            <button
              type="button"
              onClick={() => data && downloadCsv(data, drafts)}
              disabled={!data || loading}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              CSV татах
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!data || loading || saving || !dirty}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Хадгалах
            </button>
          </div>
        </div>

        {notice ? (
          <div className="mx-5 mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            {notice}
          </div>
        ) : null}
        {negativeCount > 0 ? (
          <div className="mx-5 mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            {negativeCount} бүтээгдэхүүний үлдэгдэл хасах утгатай байна. Эхний
            үлдэгдэл эсвэл өнөөдөр нэмсэн тоог шалгана уу.
          </div>
        ) : null}
        {error ? (
          <div className="m-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:p-5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Бүтээгдэхүүн хайх"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none"
          >
            <option value="ALL">Бүх ангилал</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-sm font-bold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Өдрийн барааны мэдээлэл ачаалж байна...
          </div>
        ) : !data || visibleItems.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
            <ClipboardList className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-700">
              Бүртгэх бүтээгдэхүүн олдсонгүй
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Бүтээгдэхүүн хэсэгт кофе шопын менюгээ нэмнэ үү.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Бүтээгдэхүүн</th>
                  <th className="w-32 px-3 py-3">Эхний үлдэгдэл</th>
                  <th className="w-32 px-3 py-3 text-right">Өдрийн орлого</th>
                  <th className="w-28 px-3 py-3 text-right">Зарагдсан</th>
                  <th className="w-28 px-3 py-3">Хорогдол</th>
                  <th className="w-28 px-3 py-3 text-right">Үлдсэн</th>
                  <th className="w-64 px-3 py-3">Тайлбар</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const draft = drafts[item.productId];
                  const computed = computedById.get(item.productId) || item;
                  return (
                    <tr key={item.productId} className="border-t border-slate-100">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 bg-slate-100 bg-cover bg-center"
                            style={
                              item.imageUrl
                                ? { backgroundImage: `url(${item.imageUrl})` }
                                : undefined
                            }
                          >
                            {!item.imageUrl ? (
                              <PackageCheck className="m-3 h-6 w-6 text-slate-300" />
                            ) : null}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">
                              {item.name}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              {item.categoryName} · {item.unit}
                              {!item.isActive ? " · Идэвхгүй" : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <input
                          type="number"
                          min="0"
                          max="1000000"
                          step="0.001"
                          value={draft?.openingQty ?? ""}
                          onChange={(event) =>
                            updateDraft(
                              item.productId,
                              "openingQty",
                              event.target.value,
                            )
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-right text-sm font-black tabular-nums outline-none focus:border-slate-400 focus:bg-white"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-black tabular-nums text-sky-700">
                        {formatQty(item.receivedQty)}
                        <span className="ml-1 text-[10px] text-slate-400">
                          {item.unit}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-black tabular-nums text-emerald-700">
                        {formatQty(item.soldQty)}
                        <span className="ml-1 text-[10px] text-slate-400">
                          {item.unit}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <input
                          type="number"
                          min="0"
                          max="1000000"
                          step="0.001"
                          value={draft?.wasteQty ?? ""}
                          onChange={(event) =>
                            updateDraft(
                              item.productId,
                              "wasteQty",
                              event.target.value,
                            )
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-right text-sm font-black tabular-nums outline-none focus:border-slate-400 focus:bg-white"
                          placeholder="0"
                        />
                      </td>
                      <td
                        className={`px-3 py-4 text-right text-base font-black tabular-nums ${
                          computed.remainingQty < 0
                            ? "text-rose-600"
                            : computed.remainingQty === 0
                              ? "text-amber-600"
                              : "text-slate-950"
                        }`}
                      >
                        {formatQty(computed.remainingQty)}
                        <span className="ml-1 text-[10px] text-slate-400">
                          {item.unit}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <input
                          value={draft?.note ?? ""}
                          maxLength={500}
                          onChange={(event) =>
                            updateDraft(item.productId, "note", event.target.value)
                          }
                          placeholder="Ж: 2 ширхэг гэмтсэн"
                          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-slate-400 focus:bg-white"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data ? (
          <footer className="flex flex-col gap-2 border-t border-slate-100 p-4 text-xs font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span>
              {visibleItems.length.toLocaleString("mn-MN")} / {data.items.length.toLocaleString("mn-MN")} бүтээгдэхүүн
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Борлуулалтын тоо хуудсыг шинэчлэхэд автоматаар шинэчлэгдэнэ
            </span>
          </footer>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-slate-500" />
              <h2 className="text-lg font-black text-slate-950">
                Өдрийн орлогын түүх
              </h2>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Орлого бүр бүртгэсэн цаг, ажилтантайгаа хадгалагдана.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
            {data?.receipts.filter((receipt) => !receipt.voidedAt).length ?? 0} мөр
          </span>
        </div>
        {!data || data.receipts.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center">
            <Warehouse className="h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-700">
              Энэ өдөр орлого бүртгээгүй байна
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Цаг</th>
                  <th className="px-4 py-3">Бүтээгдэхүүн</th>
                  <th className="px-4 py-3 text-right">Тоо</th>
                  <th className="px-4 py-3">Бүртгэсэн</th>
                  <th className="px-4 py-3">Тайлбар</th>
                  <th className="w-32 px-4 py-3">Төлөв</th>
                </tr>
              </thead>
              <tbody>
                {data.receipts.map((receipt) => (
                  <tr
                    key={receipt.id}
                    className={`border-t border-slate-100 ${
                      receipt.voidedAt ? "bg-rose-50/50 text-slate-400" : ""
                    }`}
                  >
                    <td className="px-5 py-4 text-sm font-bold tabular-nums">
                      {displayDateTime(receipt.createdAt)}
                    </td>
                    <td className="px-4 py-4 text-sm font-black">
                      {receipt.productName}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-black tabular-nums">
                      {formatQty(receipt.quantity)} {receipt.unit}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold">
                      {receipt.receivedBy}
                    </td>
                    <td className="max-w-xs px-4 py-4 text-sm font-semibold">
                      {receipt.note || "—"}
                    </td>
                    <td className="px-4 py-4">
                      {receipt.voidedAt ? (
                        <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-700">
                          Цуцлагдсан
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleVoidReceipt(receipt.id)}
                          disabled={Boolean(voidingReceiptId)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-black text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                        >
                          {voidingReceiptId === receipt.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          Цуцлах
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {receiptOpen && data ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                  {displayDate(data.date)}
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Бараа орлого авах
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Орлогодох бүтээгдэхүүнүүдийн тоог оруулна уу.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptOpen(false)}
                disabled={receiptSaving}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                aria-label="Хаах"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-slate-100 p-4 sm:px-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={receiptQuery}
                  onChange={(event) => setReceiptQuery(event.target.value)}
                  placeholder="Орлогодох бүтээгдэхүүн хайх"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>
              {error ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-2">
                {receiptProducts.map((item) => (
                  <label
                    key={item.productId}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-3 transition focus-within:border-emerald-400 focus-within:bg-emerald-50/30"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-900">
                        {item.name}
                      </span>
                      <span className="mt-1 block text-xs font-semibold text-slate-400">
                        {item.categoryName} · Одоогийн орлого {formatQty(item.receivedQty)} {item.unit}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="1000000"
                        step="0.001"
                        value={receiptQuantities[item.productId] ?? ""}
                        onChange={(event) =>
                          setReceiptQuantities((current) => ({
                            ...current,
                            [item.productId]: event.target.value,
                          }))
                        }
                        placeholder="0"
                        className="h-10 w-28 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-black tabular-nums outline-none focus:border-emerald-500"
                      />
                      <span className="w-8 text-xs font-black text-slate-500">
                        {item.unit}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {receiptProducts.length === 0 ? (
                <p className="py-10 text-center text-sm font-bold text-slate-400">
                  Бүтээгдэхүүн олдсонгүй
                </p>
              ) : null}
              <label className="mt-5 block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Орлогын тайлбар
                </span>
                <textarea
                  value={receiptNote}
                  onChange={(event) => setReceiptNote(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Ж: Өглөөний бэлтгэл, нийлүүлэгчээс ирсэн"
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold outline-none focus:border-slate-400 focus:bg-white"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm font-bold text-slate-500">
                {selectedReceiptItems.length} бүтээгдэхүүн · Нийт {formatQty(
                  selectedReceiptItems.reduce(
                    (sum, item) => sum + item.quantity,
                    0,
                  ),
                )}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReceiptOpen(false)}
                  disabled={receiptSaving}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-700 disabled:opacity-50"
                >
                  Болих
                </button>
                <button
                  type="button"
                  onClick={() => void handleReceiveStock()}
                  disabled={receiptSaving || selectedReceiptItems.length === 0}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {receiptSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Warehouse className="h-4 w-4" />
                  )}
                  Орлого бүртгэх
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
