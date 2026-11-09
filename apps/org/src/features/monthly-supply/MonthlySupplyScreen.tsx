"use client";

import { SupplyRegisterDialog } from "./SupplyRegisterDialog";
import { SupplyOverviewChart } from "./SupplyOverviewChart";
import {
  PosRecipeBindings,
  type SupplyProductChoice,
} from "./PosRecipeBindings";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import {
  Banknote,
  ChevronDown,
  Package,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import {
  summarizeSupplyMonth,
  analyzePosRecipeConsumption,
  type RecipeSaleSource,
  type SupplyPosBinding,
  SUPPLY_UNITS,
  type SupplyMonthResponse,
  type SupplyUnit,
} from "@mgl/types";
import { useOrg } from "@/components/org/OrgContext";
import { API, authFetch } from "@/lib/api";
import {
  localBusinessDate,
  newMaterial,
  parseSupplyDraft,
  previousSupplyMonth,
  toSupplyDraft,
  type MaterialDraft,
  type ReceiptDraft,
  type UsageDraft,
} from "./supply-draft";

type ProductChoice = SupplyProductChoice;
type ResponseData = SupplyMonthResponse & { products: ProductChoice[] };
const unitLabels: Record<SupplyUnit, string> = {
  kg: "кг",
  l: "л",
  pcs: "ширхэг",
};
const field =
  "mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100";
const sheetField =
  "min-h-10 w-full min-w-0 border border-transparent bg-transparent px-2 py-2 text-sm text-slate-900 outline-none hover:bg-slate-50 focus:border-indigo-500 focus:bg-indigo-50/40 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500";
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";
const primary =
  "min-h-10 rounded-md bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40";
const qty = (value: number | null | undefined) =>
  value == null
    ? "…"
    : new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 6 }).format(
        value,
      );
const money = (value: number | null | undefined) =>
  value == null
    ? "Дутуу мэдээлэл"
    : `${new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 2 }).format(value)} ₮`;

async function read<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      data &&
        typeof data === "object" &&
        "message" in data &&
        typeof data.message === "string"
        ? data.message
        : "Хангамжийн мэдээлэл авч чадсангүй",
    );
  return data as T;
}

export function MonthlySupplyScreen() {
  const { user } = useOrg();
  const manager =
    user.orgRole === "OWNER" ||
    user.orgRole === "ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN";
  if (!manager)
    return (
      <p role="alert" className="rounded-xl bg-rose-50 p-5 text-rose-800">
        Зөвхөн байгууллагын эзэмшигч, админ сарын хангамжийг удирдана.
      </p>
    );
  return <MonthlySupplyContent key={user.organizationId} />;
}
function MonthlySupplyContent() {
  const { user } = useOrg();
  const today = localBusinessDate();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [materials, setMaterials] = useState<MaterialDraft[]>([]);
  const [products, setProducts] = useState<ProductChoice[]>([]);
  const [posBindings, setPosBindings] = useState<SupplyPosBinding[]>([]);
  const [posSources, setPosSources] = useState<RecipeSaleSource[]>([]);
  const [uncapturedSaleLines, setUncapturedSaleLines] = useState(0);
  const [posRefreshError, setPosRefreshError] = useState("");
  const [version, setVersion] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(
    null,
  );
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = loading || saving || copying;
  const defaultDate = today.startsWith(month) ? today : `${month}-01`;
  const soldByProduct = new Map<string, { name: string; servings: number }>();
  for (const source of posSources) {
    const current = soldByProduct.get(source.productId) ?? {
      name: source.productName,
      servings: 0,
    };
    current.servings += source.servings;
    soldByProduct.set(source.productId, current);
  }
  const lockedBindings = [
    ...products.flatMap(
      (product) =>
        product.recipe?.ingredients.flatMap((ingredient) =>
          ingredient.materialId ? [{ materialId: ingredient.materialId }] : [],
        ) ?? [],
    ),
    ...posBindings,
    ...posSources.flatMap((source) => source.bindings ?? []),
  ];
  const parsed = parseSupplyDraft(month, materials, posBindings);
  const analysis = parsed.ok
    ? analyzePosRecipeConsumption(
        parsed.value.materials,
        posBindings,
        posSources,
      )
    : { consumptions: [], issues: [] };
  const summaries = parsed.ok
    ? summarizeSupplyMonth(parsed.value, analysis.consumptions)
    : materials.map(() => null);
  const totalPurchaseCost = parsed.ok
    ? summaries.reduce(
        (sum, item) => sum + Math.round((item?.purchaseCost ?? 0) * 100),
        0,
      ) / 100
    : null;
  const totalStockCost =
    parsed.ok && summaries.every((item) => item?.stockCost !== null)
      ? summaries.reduce(
          (sum, item) => sum + Math.round((item?.stockCost ?? 0) * 100),
          0,
        ) / 100
      : null;
  const endpoint = (selectedMonth = month) =>
    `${API}/restaurant/supply-month?${new URLSearchParams({ organizationId: user.organizationId || "", month: selectedMonth })}`;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoaded(false);
    setError("");
    setNotice("");
    const params = new URLSearchParams({
      organizationId: user.organizationId || "",
      month,
    });
    void authFetch(`${API}/restaurant/supply-month?${params}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(read<ResponseData>)
      .then((data) => {
        if (controller.signal.aborted) return;
        setMaterials(toSupplyDraft(data.data.materials));
        setPosBindings(data.data.posBindings ?? []);
        setPosSources(data.posSources ?? []);
        setUncapturedSaleLines(data.uncapturedSaleLines ?? 0);
        setPosRefreshError("");
        setVersion(data.version);
        setUpdatedAt(data.updatedAt);
        setProducts(data.products);
        setDirty(false);
        setEditing(false);
        setLoaded(true);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Мэдээлэл авч чадсангүй",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, reload, user.organizationId]);

  useEffect(() => {
    if (!loaded || loading || saving || copying) return;
    const controller = new AbortController();
    let inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const params = new URLSearchParams({
          organizationId: user.organizationId || "",
          month,
        });
        const result = await authFetch(
          `${API}/restaurant/supply-month?${params}`,
          { cache: "no-store", signal: controller.signal },
        ).then(read<ResponseData>);
        if (!controller.signal.aborted) {
          setPosSources(result.posSources ?? []);
          setUncapturedSaleLines(result.uncapturedSaleLines ?? 0);
          setProducts(result.products);
          const savedIds = new Set(
            result.data.materials.map((material) => material.id),
          );
          setMaterials((current) =>
            current.map((material) =>
              savedIds.has(material.id) && !material.identityLocked
                ? { ...material, identityLocked: true }
                : material,
            ),
          );
          setPosRefreshError("");
        }
      } catch {
        if (!controller.signal.aborted)
          setPosRefreshError(
            "POS хэрэглээг шинэчилж чадсангүй. Сүүлийн амжилттай тооцоог харуулж байна.",
          );
      } finally {
        inFlight = false;
      }
    };
    const timer = window.setInterval(() => {
      void refresh();
    }, 15000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [loaded, loading, saving, copying, month, user.organizationId]);

  const change = (next: MaterialDraft[]) => {
    setMaterials(next);
    setDirty(true);
    setNotice("");
  };
  const edit = (id: string, patch: Partial<MaterialDraft>) =>
    change(
      materials.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  const receipt = (
    item: MaterialDraft,
    id: string,
    patch: Partial<ReceiptDraft>,
  ) =>
    edit(item.id, {
      receipts: item.receipts.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    });
  const usage = (item: MaterialDraft, id: string, patch: Partial<UsageDraft>) =>
    edit(item.id, {
      usages: item.usages.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    });
  const mayDiscard = () =>
    !dirty || window.confirm("Хадгалаагүй өөрчлөлтөө орхих уу?");
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !loaded || !editing) return;
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const data = await authFetch(endpoint(), {
        method: "PUT",
        body: JSON.stringify({ expectedVersion: version, data: parsed.value }),
      }).then(read<SupplyMonthResponse>);
      setMaterials(toSupplyDraft(data.data.materials));
      setPosBindings(data.data.posBindings ?? []);
      setPosSources(data.posSources ?? []);
      setUncapturedSaleLines(data.uncapturedSaleLines ?? 0);
      setVersion(data.version);
      setUpdatedAt(data.updatedAt);
      setDirty(false);
      setEditing(false);
      setExpandedMaterialId(null);
      setNotice(`${month} сарын хангамж хадгалагдлаа.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Хадгалж чадсангүй");
    } finally {
      setSaving(false);
    }
  };
  const copyPrevious = async () => {
    if (busy || materials.length) return;
    setCopying(true);
    setError("");
    try {
      const result = await authFetch(endpoint(previousSupplyMonth(month)), {
        cache: "no-store",
      }).then(read<ResponseData>);
      if (!result.summary.length) {
        setNotice("Өмнөх сарын бүртгэл алга байна.");
        return;
      }
      if (result.summary.some((item) => item.remainingQuantity < 0))
        throw new Error("Өмнөх сарын сөрөг үлдэгдлийг эхлээд засна уу.");
      setPosBindings(result.data.posBindings ?? []);
      change(
        result.summary.map((item) => ({
          id: item.id,
          name: item.name,
          unit: item.unit,
          identityLocked: true,
          openingUnitPrice:
            item.unitCost === null
              ? ""
              : String(Math.round(item.unitCost * 100) / 100),
          openingQuantity: String(item.remainingQuantity),
          receipts: [],
          usages: [],
        })),
      );
      setNotice(
        "Өмнөх сарын тооцоолсон үлдэгдлийг эхний үлдэгдэлд орууллаа. Шалгаад хадгална уу.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Өмнөх сар авч чадсангүй",
      );
    } finally {
      setCopying(false);
    }
  };

  return (
    <section className="space-y-4 text-slate-800">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Сарын хангамжийн тайлан
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Түүхий эдийн орлого, зарцуулалт, үлдэгдлийн нэгдсэн бүртгэл
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Label title="Тайлангийн сар">
            <input
              type="month"
              min="2000-01"
              max="2099-12"
              value={month}
              disabled={busy}
              onChange={(event) => {
                if (
                  /^20\d{2}-(0[1-9]|1[0-2])$/.test(event.target.value) &&
                  mayDiscard()
                )
                  setMonth(event.target.value);
              }}
              className={field}
            />
          </Label>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (mayDiscard()) setReload((n) => n + 1);
            }}
            className={button}
          >
            Дахин ачаалах
          </button>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className="py-10 text-center">
          Сарын мэдээлэл ачаалж байна…
        </p>
      ) : loaded ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">
                  Бүртгэлтэй материал
                </p>
                <Package className="size-4 text-slate-400" aria-hidden="true" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
                {materials.length}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  төрөл
                </span>
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {month} сарын нэгдсэн бүртгэл
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">
                  Бүртгэсэн нөөцийн өртөг
                </p>
                <Banknote
                  className="size-4 text-indigo-400"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 break-words text-2xl font-bold tabular-nums tracking-tight text-slate-900">
                {money(totalStockCost)}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Эхний үлдэгдэл + сарын орлого
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 sm:col-span-2 xl:col-span-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">
                  Сарын худалдан авалт
                </p>
                <ShoppingCart
                  className="size-4 text-emerald-500"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 break-words text-2xl font-bold tabular-nums tracking-tight text-slate-900">
                {money(totalPurchaseCost)}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Зөвхөн энэ сарын шинэ авалт
              </p>
            </div>
          </div>
          <SupplyOverviewChart
            rows={summaries}
            month={month}
            valid={parsed.ok}
          />
          <form
            id="monthly-supply-form"
            noValidate
            onSubmit={(event) => void save(event)}
            className="space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-300 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">
                {editing
                  ? "Засах горим · Өөрчлөлтөө хийсний дараа хадгална уу."
                  : "Харах горим · Мэдээлэл өөрчлөх бол «Засах» товч дарна уу."}
              </p>
              {editing ? (
                <button
                  type="button"
                  disabled={busy}
                  className={button}
                  onClick={() => {
                    if (mayDiscard()) {
                      setEditing(false);
                      setReload((value) => value + 1);
                    }
                  }}
                >
                  Болих
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  className={button}
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                  Засах
                </button>
              )}
            </div>
            <fieldset
              disabled={saving || copying}
              className="space-y-3 disabled:opacity-60"
            >
              {materials.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <p className="font-bold">
                    Энэ сарын хангамж бүртгэгдээгүй байна.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Хонины мах, үхрийн мах, будаа, сүү зэрэг түүхий эдээ нэмээд
                    орлого, зарцуулалтаа оруулна.
                  </p>
                </div>
              )}
              <p className="text-xs text-slate-500">
                «Авсан нэгж үнэ» баганад эхний үлдэгдлийн 1 кг / л / ширхэгийг
                авсан үнийг оруулна. Энэ сарын нэмэлт авалтын хэмжээ, үнийг
                «Нэмэх» товчоор оруулна. Жорын өртөгт эдгээрийн жигнэсэн дундаж
                үнийг ашиглана.
              </p>
              <div className="overflow-x-auto border border-slate-300 bg-white">
                <table className="w-full min-w-[1080px] border-collapse text-sm [&_td]:border [&_td]:border-slate-200 [&_th]:border [&_th]:border-slate-300">
                  <caption className="border-b border-slate-300 bg-white px-4 py-3 text-left text-sm font-bold">
                    Түүхий эдийн хөдөлгөөн{" "}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      Үлдэгдэл = эхний үлдэгдэл + орлого − зарцуулалт
                    </span>
                  </caption>
                  <thead className="bg-slate-100 text-xs font-semibold text-slate-600">
                    <tr>
                      {[
                        "№",
                        "Түүхий эдийн нэр",
                        "Нэгж",
                        "Эхний үлдэгдэл",
                        "Авсан нэгж үнэ, ₮",
                        "Авсан хэмжээ",
                        "Зарцуулсан",
                        "Эцсийн үлдэгдэл",
                        "Сарын авалтын дүн, ₮",
                        "Үйлдэл",
                      ].map((title) => (
                        <th
                          key={title}
                          scope="col"
                          className="whitespace-nowrap px-3 py-3 text-left"
                        >
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((item, itemIndex) => (
                      <tr
                        key={item.id}
                        className={
                          expandedMaterialId === item.id
                            ? "bg-indigo-50/40"
                            : "hover:bg-slate-50/70"
                        }
                      >
                        <td className="w-10 bg-slate-50 px-3 text-center text-xs tabular-nums text-slate-500">
                          {itemIndex + 1}
                        </td>
                        <td className="min-w-44">
                          <input
                            aria-label={`${itemIndex + 1}. Түүхий эдийн нэр`}
                            disabled={!editing || item.identityLocked}
                            title={
                              item.identityLocked
                                ? "Хадгалсан материалын нэрийг өөрчлөх боломжгүй"
                                : undefined
                            }
                            required
                            maxLength={160}
                            value={item.name}
                            onChange={(event) =>
                              edit(item.id, { name: event.target.value })
                            }
                            placeholder="Түүхий эдийн нэр"
                            className={`${sheetField} font-medium`}
                          />
                        </td>
                        <td className="w-20">
                          <select
                            aria-label={`${itemIndex + 1}. Хэмжих нэгж`}
                            value={item.unit}
                            disabled={
                              !editing ||
                              item.identityLocked ||
                              item.receipts.length > 0 ||
                              item.usages.length > 0 ||
                              lockedBindings.some(
                                (binding) => binding.materialId === item.id,
                              )
                            }
                            onChange={(event) =>
                              edit(item.id, {
                                unit: event.target.value as SupplyUnit,
                              })
                            }
                            className={sheetField}
                          >
                            {SUPPLY_UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unitLabels[unit]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="w-32">
                          <input
                            aria-label={`${itemIndex + 1}. Эхний үлдэгдэл (${unitLabels[item.unit]})`}
                            disabled={!editing}
                            type="number"
                            min="0"
                            step={item.unit === "pcs" ? "1" : "0.000001"}
                            value={item.openingQuantity}
                            onChange={(event) =>
                              edit(item.id, {
                                openingQuantity: event.target.value,
                              })
                            }
                            className={`${sheetField} text-right tabular-nums`}
                          />
                        </td>
                        <td className="w-36 min-w-32">
                          <input
                            aria-label={`${itemIndex + 1}. Авсан нэгж үнэ (₮/${unitLabels[item.unit]})`}
                            title={`Эхний үлдэгдлийн 1 ${unitLabels[item.unit]}-ийг авсан үнэ`}
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!editing}
                            placeholder={`₮/${unitLabels[item.unit]}`}
                            value={item.openingUnitPrice ?? ""}
                            onChange={(event) =>
                              edit(item.id, {
                                openingUnitPrice: event.target.value,
                              })
                            }
                            className={`${sheetField} text-right tabular-nums`}
                          />
                          {(summaries[itemIndex]?.receivedQuantity ?? 0) >
                            0 && (
                            <p className="px-2 pb-1 text-right text-[10px] text-slate-500">
                              Дундаж: {money(summaries[itemIndex]?.unitCost)}
                            </p>
                          )}
                        </td>
                        <td className="px-3 text-right tabular-nums">
                          {qty(summaries[itemIndex]?.receivedQuantity)}
                        </td>
                        <td className="px-3 text-right tabular-nums">
                          {qty(summaries[itemIndex]?.usedQuantity)}
                          {(summaries[itemIndex]?.posUsedQuantity ?? 0) > 0 && (
                            <span className="block text-[10px] text-slate-500">
                              POS: {qty(summaries[itemIndex]?.posUsedQuantity)}
                            </span>
                          )}
                        </td>
                        <td
                          className={`bg-slate-50/80 px-3 text-right font-bold tabular-nums ${summaries[itemIndex] && summaries[itemIndex].remainingQuantity < 0 ? "text-rose-700" : "text-slate-900"}`}
                        >
                          {qty(summaries[itemIndex]?.remainingQuantity)}
                        </td>
                        <td className="whitespace-nowrap px-3 text-right tabular-nums">
                          {money(summaries[itemIndex]?.purchaseCost)}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1 px-1">
                            <button
                              type="button"
                              aria-haspopup="dialog"
                              aria-label={`${item.name || "Түүхий эд"} бүртгэл нээх`}
                              onClick={() => setExpandedMaterialId(item.id)}
                              className="flex min-h-10 items-center gap-1 px-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-indigo-500"
                            >
                              Нэмэх
                              <Plus className="size-3.5" aria-hidden="true" />
                            </button>
                            <Remove
                              label={`${itemIndex + 1}-р түүхий эд устгах`}
                              disabled={!editing}
                              onClick={() => {
                                if (
                                  lockedBindings.some(
                                    (binding) => binding.materialId === item.id,
                                  )
                                ) {
                                  window.alert(
                                    "Энэ материал жорын орцтой холбогдсон эсвэл борлуулалтад зарцуулагдсан байна.",
                                  );
                                  return;
                                }
                                if (
                                  window.confirm(
                                    "Энэ түүхий эд болон тухайн сарын орлого, зарцуулалтын мөрүүдийг хасах уу?",
                                  )
                                )
                                  change(
                                    materials.filter(
                                      (row) => row.id !== item.id,
                                    ),
                                  );
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold">
                    <tr>
                      <th
                        colSpan={8}
                        scope="row"
                        className="px-3 py-3 text-right text-xs"
                      >
                        НИЙТ ХУДАЛДАН АВАЛТ
                      </th>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                        {money(totalPurchaseCost)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!editing || materials.length >= 100}
                  onClick={() => change([...materials, newMaterial()])}
                  className={button}
                >
                  <Plus className="size-4" />
                  Түүхий эд нэмэх
                </button>
                <button
                  type="button"
                  disabled={
                    !editing ||
                    materials.length > 0 ||
                    previousSupplyMonth(month) < "2000-01"
                  }
                  onClick={() => void copyPrevious()}
                  className={button}
                >
                  Өмнөх сарын үлдэгдэл татах
                </button>
              </div>
            </fieldset>
            <div
              className={`flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 ${editing ? "sticky bottom-0 z-10 bg-white shadow-sm" : "bg-slate-50/60"}`}
            >
              <div>
                <p className="text-sm font-bold">
                  {dirty
                    ? "Хадгалаагүй өөрчлөлт байна"
                    : version > 0
                      ? "Хадгалсан мэдээлэл"
                      : "Шинэ сарын бүртгэл"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {updatedAt
                    ? `Сүүлд: ${new Date(updatedAt).toLocaleString("mn-MN")}`
                    : "Хараахан хадгалаагүй"}
                </p>
              </div>
              {editing && (
                <button
                  type="submit"
                  disabled={busy || !editing || !dirty}
                  className={primary}
                >
                  {saving ? "Хадгалж байна…" : "Сарын хангамж хадгалах"}
                </button>
              )}
            </div>
          </form>
          {materials.map((item, itemIndex) =>
            item.id === expandedMaterialId ? (
              <SupplyRegisterDialog
                key={item.id}
                title={item.name || "Түүхий эд"}
                month={month}
                editing={editing}
                saving={saving}
                canSave={!busy && editing && dirty}
                error={error}
                onClose={() => setExpandedMaterialId(null)}
              >
                <fieldset
                  disabled={!editing || saving || copying}
                  className="min-w-0"
                >
                  <details
                    open
                    className="group border-t border-slate-100"
                    aria-label={`${item.name || itemIndex + 1} орлого`}
                  >
                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                      <span>Авсан хангамж, үнэ</span>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">
                        {item.receipts.length}
                      </span>
                      <span className="ml-auto tabular-nums text-slate-900">
                        {money(summaries[itemIndex]?.purchaseCost)}
                      </span>
                      <ChevronDown className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                    </summary>
                    <div className="space-y-3 px-5 pb-4">
                      <p className="text-xs leading-5 text-slate-500">
                        Авсан хэмжээ × нэгж үнэ = нийт авсан үнэ.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse border border-slate-300 bg-white text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-semibold"
                              >
                                Огноо
                              </th>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-semibold"
                              >
                                Авсан хэмжээ
                              </th>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-semibold"
                              >
                                Нэгж үнэ, ₮
                              </th>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-semibold"
                              >
                                Нийлүүлэгч
                              </th>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-semibold"
                              >
                                Нийт үнэ, ₮
                              </th>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-semibold"
                              ></th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.receipts.map((row, index) => (
                              <tr key={row.id}>
                                <SheetCell
                                  title={`Орлого ${itemIndex + 1}.${index + 1}. Огноо`}
                                >
                                  <input
                                    type="date"
                                    value={row.date}
                                    onChange={(event) =>
                                      receipt(item, row.id, {
                                        date: event.target.value,
                                      })
                                    }
                                    className={sheetField}
                                  />
                                </SheetCell>
                                <SheetCell
                                  title={`Орлого ${itemIndex + 1}.${index + 1}. Тоо (${unitLabels[item.unit]})`}
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={row.quantity}
                                    onChange={(event) =>
                                      receipt(item, row.id, {
                                        quantity: event.target.value,
                                      })
                                    }
                                    className={sheetField}
                                  />
                                </SheetCell>
                                <SheetCell
                                  title={`Орлого ${itemIndex + 1}.${index + 1}. Авсан нэгж үнэ (₮/${unitLabels[item.unit]})`}
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={row.unitPrice}
                                    onChange={(event) =>
                                      receipt(item, row.id, {
                                        unitPrice: event.target.value,
                                      })
                                    }
                                    className={sheetField}
                                  />
                                </SheetCell>
                                <SheetCell
                                  title={`Орлого ${itemIndex + 1}.${index + 1}. Нийлүүлэгч`}
                                >
                                  <input
                                    maxLength={160}
                                    value={row.supplier}
                                    onChange={(event) =>
                                      receipt(item, row.id, {
                                        supplier: event.target.value,
                                      })
                                    }
                                    className={sheetField}
                                  />
                                </SheetCell>
                                <td className="whitespace-nowrap px-3 text-right tabular-nums">
                                  <span className="text-sm font-bold tabular-nums text-slate-900">
                                    {row.quantity.trim() &&
                                    row.unitPrice.trim() &&
                                    Number.isFinite(
                                      Number(row.quantity) *
                                        Number(row.unitPrice),
                                    )
                                      ? money(
                                          Number(row.quantity) *
                                            Number(row.unitPrice),
                                        )
                                      : "—"}
                                  </span>
                                </td>
                                <td className="w-10">
                                  <Remove
                                    label={`Орлого ${itemIndex + 1}.${index + 1} хасах`}
                                    onClick={() =>
                                      edit(item.id, {
                                        receipts: item.receipts.filter(
                                          (entry) => entry.id !== row.id,
                                        ),
                                      })
                                    }
                                  />
                                </td>
                              </tr>
                            ))}
                            {item.receipts.length === 0 && (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="px-3 py-4 text-xs text-slate-400"
                                >
                                  Бүртгэл оруулаагүй байна.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <button
                        type="button"
                        disabled={item.receipts.length >= 100}
                        onClick={() =>
                          edit(item.id, {
                            receipts: [
                              ...item.receipts,
                              {
                                id: crypto.randomUUID(),
                                date: defaultDate,
                                quantity: "",
                                unitPrice: "",
                                supplier: "",
                              },
                            ],
                          })
                        }
                        className={button}
                      >
                        <Plus className="size-4" />
                        Орлого, үнэ нэмэх
                      </button>
                    </div>
                  </details>
                  <details
                    open
                    className="group border-t border-slate-100"
                    aria-label={`${item.name || itemIndex + 1} зарцуулалт`}
                  >
                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                      <span>Бусад зарцуулалт</span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {item.usages.length}
                      </span>
                      <ChevronDown className="ml-auto size-4 text-slate-400 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                    </summary>
                    <div className="space-y-3 px-5 pb-4">
                      <p className="text-xs text-slate-500">
                        POS борлуулалтаар тооцсон орцыг энд давхар бүртгэхгүй.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse border border-slate-300 bg-white text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-semibold"
                              >
                                Огноо
                              </th>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-semibold"
                              >
                                Бүтээгдэхүүн
                              </th>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-semibold"
                              >
                                Хоолны нэр
                              </th>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-semibold"
                              >
                                Хэмжээ
                              </th>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-semibold"
                              ></th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.usages.map((row, index) => (
                              <tr key={row.id}>
                                <SheetCell
                                  title={`Зарцуулалт ${itemIndex + 1}.${index + 1}. Огноо`}
                                >
                                  <input
                                    type="date"
                                    value={row.date}
                                    onChange={(event) =>
                                      usage(item, row.id, {
                                        date: event.target.value,
                                      })
                                    }
                                    className={sheetField}
                                  />
                                </SheetCell>
                                <SheetCell
                                  title={`Зарцуулалт ${itemIndex + 1}.${index + 1}. Бүтээгдэхүүн`}
                                >
                                  <select
                                    value={row.productId || ""}
                                    onChange={(event) => {
                                      const product = products.find(
                                        (entry) =>
                                          entry.id === event.target.value,
                                      );
                                      usage(item, row.id, {
                                        productId: product?.id ?? null,
                                        ...(product
                                          ? {
                                              dishName: product.name,
                                            }
                                          : {}),
                                      });
                                    }}
                                    className={sheetField}
                                  >
                                    <option value="">
                                      Хоолны нэр гараар оруулах
                                    </option>
                                    {row.productId &&
                                      !products.some(
                                        (product) =>
                                          product.id === row.productId,
                                      ) && (
                                        <option value={row.productId}>
                                          {row.dishName}
                                        </option>
                                      )}
                                    {products.map((product) => (
                                      <option
                                        key={product.id}
                                        value={product.id}
                                      >
                                        {product.name}
                                      </option>
                                    ))}
                                  </select>
                                </SheetCell>
                                <SheetCell
                                  title={`Зарцуулалт ${itemIndex + 1}.${index + 1}. Хоолны нэр`}
                                >
                                  <input
                                    required
                                    maxLength={160}
                                    value={row.dishName}
                                    disabled={Boolean(row.productId)}
                                    onChange={(event) =>
                                      usage(item, row.id, {
                                        dishName: event.target.value,
                                      })
                                    }
                                    className={sheetField}
                                  />
                                </SheetCell>
                                <SheetCell
                                  title={`Зарцуулалт ${itemIndex + 1}.${index + 1}. Тоо (${unitLabels[item.unit]})`}
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={row.quantity}
                                    onChange={(event) =>
                                      usage(item, row.id, {
                                        quantity: event.target.value,
                                      })
                                    }
                                    className={sheetField}
                                  />
                                </SheetCell>
                                <td className="w-10">
                                  <Remove
                                    label={`Зарцуулалт ${itemIndex + 1}.${index + 1} хасах`}
                                    onClick={() =>
                                      edit(item.id, {
                                        usages: item.usages.filter(
                                          (entry) => entry.id !== row.id,
                                        ),
                                      })
                                    }
                                  />
                                </td>
                              </tr>
                            ))}
                            {item.usages.length === 0 && (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="px-3 py-4 text-xs text-slate-400"
                                >
                                  Бүртгэл оруулаагүй байна.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <button
                        type="button"
                        disabled={item.usages.length >= 300}
                        onClick={() =>
                          edit(item.id, {
                            usages: [
                              ...item.usages,
                              {
                                id: crypto.randomUUID(),
                                date: defaultDate,
                                quantity: "",
                                productId: null,
                                dishName: "",
                              },
                            ],
                          })
                        }
                        className={button}
                      >
                        <Plus className="size-4" />
                        Хоолны зарцуулалт нэмэх
                      </button>
                    </div>
                  </details>
                </fieldset>
                {summaries[itemIndex] && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                    <div className="grid grid-cols-3 gap-3 text-xs text-slate-500">
                      <div>
                        Эхний үлдэгдэл
                        <p className="mt-1 font-bold tabular-nums text-slate-800">
                          {qty(summaries[itemIndex].openingQuantity)}{" "}
                          {unitLabels[item.unit]}
                        </p>
                      </div>
                      <div>
                        Нэмэгдсэн
                        <p className="mt-1 font-bold tabular-nums text-indigo-600">
                          +{qty(summaries[itemIndex].receivedQuantity)}{" "}
                          {unitLabels[item.unit]}
                        </p>
                      </div>
                      <div>
                        Зарцуулсан
                        <p className="mt-1 font-bold tabular-nums text-amber-700">
                          −{qty(summaries[itemIndex].usedQuantity)}{" "}
                          {unitLabels[item.unit]}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1 text-xs text-slate-600 empty:hidden">
                      {summaries[itemIndex].dishes.map((dish) => (
                        <li key={dish.productId || dish.name}>
                          {dish.name}: {qty(dish.quantity)}{" "}
                          {unitLabels[item.unit]}
                          {dish.soldServings
                            ? ` · POS ${qty(dish.soldServings)} зарагдсан`
                            : ""}
                        </li>
                      ))}
                    </ul>
                    {summaries[itemIndex].remainingQuantity < 0 && (
                      <p className="mt-2 text-sm font-bold text-rose-700">
                        Зарцуулалт бүртгэсэн орлогоос их байна. Эхний үлдэгдэл
                        болон авсан хангамжаа шалгана уу.
                      </p>
                    )}
                  </div>
                )}
              </SupplyRegisterDialog>
            ) : null,
          )}
          <details
            className="border border-slate-300 bg-white"
            open={
              analysis.issues.length > 0 ||
              uncapturedSaleLines > 0 ||
              Boolean(posRefreshError)
            }
          >
            <summary className="cursor-pointer bg-slate-100 px-4 py-3 text-sm font-semibold">
              POS борлуулалт, орцын тооцоо{" "}
              <span className="ml-2 text-xs font-normal text-slate-500">
                {soldByProduct.size} бүтээгдэхүүн
                {analysis.issues.length > 0
                  ? ` · ${analysis.issues.length} холбоос дутуу`
                  : ""}
              </span>
            </summary>
            <section className="space-y-3 border-b border-slate-200 bg-white p-4">
              <h2 className="text-lg font-black">
                POS борлуулалтаас тооцсон хэрэглээ
              </h2>
              <p className="text-sm text-slate-600">
                Дууссан борлуулалтыг 15 секунд тутам шинэчилнэ. Цуцалсан
                борлуулалтыг хасалтаас гаргана.
              </p>
              {posRefreshError && (
                <p
                  role="alert"
                  className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
                >
                  {posRefreshError}
                </p>
              )}
              {!posSources.length && (
                <p className="text-sm text-slate-500">
                  Энэ сард жорын бүртгэлтэй шинэ POS борлуулалт алга байна.
                </p>
              )}
              <ul className="space-y-1 text-sm">
                {[...soldByProduct].map(([id, sold]) => (
                  <li key={id}>
                    {sold.name}: <strong>{qty(sold.servings)}</strong>{" "}
                    порц/ширхэг зарагдсан
                  </li>
                ))}
              </ul>
              {analysis.issues.map((issue, index) => (
                <p
                  key={index}
                  role="alert"
                  className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
                >
                  {issue.productName} · {qty(issue.servings)}: {issue.message}.
                  Энэ хоолны орцын хасалт холбоос бүрэн болсны дараа тооцогдоно.
                </p>
              ))}
              {uncapturedSaleLines > 0 && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  Өмнөх {uncapturedSaleLines} борлуулалтын мөрд тухайн үеийн жор
                  хадгалагдаагүй тул орцын хасалтад тооцоогүй.
                </p>
              )}
            </section>
            <PosRecipeBindings
              materials={materials}
              products={products}
              sources={posSources}
              bindings={posBindings}
              disabled={!editing || saving || copying}
              onChange={(bindings) => {
                setPosBindings(bindings);
                setDirty(true);
                setNotice("");
              }}
            />
          </details>
        </>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          Мэдээлэл ачаалсны дараа бүртгэлээ оруулна уу.
        </p>
      )}
    </section>
  );
}
function Label({ title, children }: { title: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-600">
      <span>{title}</span>
      {children}
    </label>
  );
}
function Remove({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      title={label}
      onClick={onClick}
      className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function SheetCell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <td>
      <label className="block">
        <span className="sr-only">{title}</span>
        {children}
      </label>
    </td>
  );
}
