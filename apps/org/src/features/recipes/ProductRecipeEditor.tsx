"use client";

import { SupplyMaterialPicker } from "./SupplyMaterialPicker";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X } from "lucide-react";
import {
  calculateRecipeCost,
  RECIPE_UNITS,
  compatibleRecipeUnits,
  type ProductRecipeResponse,
  type RecipeSupplyChoice,
  type RecipeKind,
  type RecipeUnit,
} from "@mgl/types";
import { API, authFetch } from "@/lib/api";
import {
  newIngredient,
  newRecipeDraft,
  parseRecipeDraft,
  toRecipeDraft,
  withSupplyPrices,
  type IngredientDraft,
} from "./recipe-draft";
import { RECIPE_TEMPLATES } from "./recipe-templates";

type RecipeProduct = { id: string; name: string; price: number };
type Props = {
  product: RecipeProduct;
  onClose: () => void;
  onSaved: (costPrice: number | null) => void;
};
const unitNames: Record<RecipeUnit, string> = {
  g: "гр",
  kg: "кг",
  ml: "мл",
  l: "л",
  pcs: "ширхэг",
};
const kindNames: Record<RecipeKind, string> = {
  FOOD: "Хоол",
  COFFEE: "Кофе",
  BUBBLE_TEA: "Bubble tea / смүүти / шейк",
  OTHER: "Бусад",
};
const money = (value: number | null | undefined) =>
  value == null
    ? "Тооцох боломжгүй"
    : `${new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 2 }).format(value)} ₮`;
const inputStyle =
  "mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100";

async function readResponse(
  response: Response,
): Promise<ProductRecipeResponse> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      data &&
        typeof data === "object" &&
        "message" in data &&
        typeof data.message === "string"
        ? data.message
        : "Жорын мэдээлэл авч чадсангүй",
    );
  }
  return data as ProductRecipeResponse;
}

export function ProductRecipeEditor({ product, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [supplyMonth, setSupplyMonth] = useState(() =>
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Ulaanbaatar",
      year: "numeric",
      month: "2-digit",
    }).format(new Date()),
  );
  const [supplyMaterials, setSupplyMaterials] = useState<RecipeSupplyChoice[]>(
    [],
  );
  const [draft, setDraft] = useState(newRecipeDraft);
  const [version, setVersion] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updateProductCost, setUpdateProductCost] = useState(false);
  const [templateIndex, setTemplateIndex] = useState("");
  const parsed = parseRecipeDraft(draft);
  const cost = parsed.ok ? calculateRecipeCost(parsed.value) : null;
  const difference =
    cost?.unitCost == null
      ? null
      : Math.round((product.price - cost.unitCost) * 100) / 100;

  useEffect(() => {
    const dialog = dialogRef.current;
    const focused = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoaded(false);
    setError("");
    void authFetch(
      `${API}/products/${encodeURIComponent(product.id)}/recipe?${new URLSearchParams({ supplyMonth })}`,
      {
        cache: "no-store",
        signal: controller.signal,
      },
    )
      .then(readResponse)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!data.supply)
          throw new Error(
            "Хангамжийн материал авч чадсангүй. Дахин ачаална уу.",
          );
        setSupplyMaterials(data.supply.materials);
        setDraft(
          withSupplyPrices(
            data.recipe ? toRecipeDraft(data.recipe) : newRecipeDraft(),
            data.supply.materials,
          ),
        );
        setLoaded(true);
        setVersion(data.version);
        setUpdatedAt(data.updatedAt);
        setDirty(false);
        setNotice("");
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Жор авч чадсангүй",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [product.id, reloadKey, supplyMonth]);

  const close = () => {
    if (saving) return;
    if (
      !dirty ||
      window.confirm("Жорын хадгалаагүй өөрчлөлтийг орхиод хаах уу?")
    )
      onClose();
  };
  const change = (patch: Partial<typeof draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
    setNotice("");
  };
  const changeRow = (id: string, patch: Partial<IngredientDraft>) =>
    change({
      ingredients: draft.ingredients.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    });
  const changeUnit = (row: IngredientDraft, unit: RecipeUnit) => {
    changeRow(row.id, {
      unit,
      ...(!compatibleRecipeUnits(unit, row.packageUnit)
        ? { packageUnit: unit, packageQuantity: "" }
        : {}),
    });
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || loading) return;
    if (draft.ingredients.some((ingredient) => !ingredient.materialId)) {
      setError("Орц бүрийн нэрийг хангамжийн материалаас сонгоно уу.");
      return;
    }
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    if (updateProductCost && cost?.unitCost == null) {
      setError(
        "Бүтээгдэхүүний өртөг шинэчлэхийн тулд орц бүрийн үнийг оруулна уу",
      );
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await authFetch(
        `${API}/products/${encodeURIComponent(product.id)}/recipe`,
        {
          method: "PUT",
          body: JSON.stringify({
            recipe: parsed.value,
            supplyMonth,
            expectedVersion: version,
            updateProductCost,
          }),
        },
      );
      const result = await readResponse(response);
      setVersion(result.version);
      setUpdatedAt(result.updatedAt);
      setDirty(false);
      setNotice(
        updateProductCost
          ? "Жор хадгалагдаж, бүтээгдэхүүний өртөг шинэчлэгдлээ."
          : "Жор хадгалагдлаа.",
      );
      onSaved(updateProductCost ? (result.cost?.unitCost ?? null) : null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Жор хадгалж чадсангүй",
      );
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      aria-busy={loading || saving}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_2rem)] max-w-6xl overflow-hidden rounded-2xl bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/60"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-bold text-indigo-600">{product.name}</p>
            <h2 id={titleId} className="mt-1 text-xl font-black">
              Орц, жор ба өөрийн өртөг
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Орцын нэр, орох хэмжээ, нэгжийг оруулна. Нэг порцын жор бол гарцыг
              1 гэж тохируулна.
            </p>
          </div>
          <button
            type="button"
            autoFocus
            aria-label="Жорын цонх хаах"
            disabled={saving}
            onClick={close}
            className="rounded-lg p-2 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
            >
              {error}
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (
                    !dirty ||
                    window.confirm(
                      "Хадгалаагүй өөрчлөлтийг орхиод серверийн жорыг дахин ачаалах уу?",
                    )
                  )
                    setReloadKey((n) => n + 1);
                }}
                className="ml-3 font-bold underline"
              >
                Дахин ачаалах
              </button>
            </div>
          )}
          {notice && (
            <p
              role="status"
              className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              {notice}
            </p>
          )}
          {loading ? (
            <p role="status" className="py-10 text-center">
              Жор ачаалж байна…
            </p>
          ) : loaded ? (
            <form
              id="product-recipe-form"
              noValidate
              onSubmit={(event) => void save(event)}
            >
              <fieldset
                disabled={saving}
                className="space-y-5 disabled:opacity-70"
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <Label title="Жорын төрөл">
                    <select
                      value={draft.kind}
                      onChange={(event) =>
                        change({ kind: event.target.value as RecipeKind })
                      }
                      className={inputStyle}
                    >
                      {Object.entries(kindNames).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Label>
                  <Label title="Энэ жороос гарах бүтээгдэхүүний тоо">
                    <input
                      type="number"
                      required
                      min="0.000001"
                      step="any"
                      value={draft.yieldQuantity}
                      onChange={(event) =>
                        change({ yieldQuantity: event.target.value })
                      }
                      className={inputStyle}
                    />
                  </Label>
                  <Label title="Нэгж бүтээгдэхүүний хэмжээ / порц">
                    <input
                      required
                      maxLength={100}
                      placeholder="Жишээ: 1 аяга, 500 мл, 1 порц"
                      value={draft.servingLabel}
                      onChange={(event) =>
                        change({ servingLabel: event.target.value })
                      }
                      className={inputStyle}
                    />
                  </Label>
                </div>
                <details className="rounded-lg border border-slate-200">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-600">
                    Excel-ийн жишээ жор ашиглах (сонголтоор)
                  </summary>
                  <div className="flex flex-wrap items-end gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                    <Label title="Excel-ийн жишээ жор">
                      <select
                        value={templateIndex}
                        onChange={(event) =>
                          setTemplateIndex(event.target.value)
                        }
                        className={inputStyle}
                      >
                        <option value="">Жишээ сонгох</option>
                        {RECIPE_TEMPLATES.map((template, index) => (
                          <option key={template.label} value={index}>
                            {template.label}
                          </option>
                        ))}
                      </select>
                    </Label>
                    <button
                      type="button"
                      disabled={templateIndex === ""}
                      onClick={() => {
                        const template =
                          RECIPE_TEMPLATES[Number(templateIndex)];
                        if (
                          template &&
                          (!dirty ||
                            window.confirm(
                              "Одоогийн орцуудыг жишээ жороор солих уу?",
                            ))
                        ) {
                          setDraft(toRecipeDraft(template.recipe));
                          setDirty(true);
                          setNotice(
                            "Жишээ жор орлоо. Хэмжээ, үнэ болон нэмэлт зардлаа шалгаад хадгална уу.",
                          );
                        }
                      }}
                      className="min-h-10 rounded-lg border border-indigo-300 px-4 text-sm font-bold text-indigo-700 disabled:opacity-40"
                    >
                      Жишээ оруулах
                    </button>
                    <p className="w-full text-xs text-slate-600">
                      Bubble tea sheet-ийн 4 жишээ. Excel-ийн мянган төгрөгийн
                      үнийг төгрөгт шилжүүлсэн.
                    </p>
                  </div>
                </details>
                <section aria-label="Орцын задаргаа" className="space-y-3">
                  <h3 className="font-bold">{product.name} — Орцын задаргаа</h3>
                  <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <Label title="Материал авах хангамжийн сар">
                      <input
                        type="month"
                        min="2000-01"
                        max="2099-12"
                        value={supplyMonth}
                        onChange={(event) => {
                          if (
                            /^20\d{2}-(0[1-9]|1[0-2])$/.test(
                              event.target.value,
                            ) &&
                            (!dirty ||
                              window.confirm(
                                "Хадгалаагүй жорын өөрчлөлтийг орхиод хангамжийн сар солих уу?",
                              ))
                          )
                            setSupplyMonth(event.target.value);
                        }}
                        className={inputStyle}
                      />
                    </Label>
                    <p className="pb-2 text-xs text-slate-500">
                      Хангамжаас нэр, нэгж, сарын дундаж авсан үнийг татна.
                      Хоолонд орох хэмжээг өөрөө оруулна.
                    </p>
                  </div>
                  {supplyMaterials.length === 0 && (
                    <p
                      role="status"
                      className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
                    >
                      Энэ сард хангамжийн материал алга. «Сарын хангамж» хэсэгт
                      материалаа бүртгэж хадгалаад энд дахин ачаална уу.
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Орц бүрийг нэг мөрөөр нэмнэ. Доорх хэмжээ нь дээр
                    тохируулсан гарцад хамаарна.
                  </p>
                  <div className="overflow-x-auto border border-slate-300">
                    <table className="w-full min-w-[800px] border-collapse text-sm [&_td]:border [&_td]:border-slate-200 [&_th]:border [&_th]:border-slate-300">
                      <caption className="sr-only">
                        {product.name} орцын задаргаа
                      </caption>
                      <thead className="bg-slate-100 text-left text-xs text-slate-600">
                        <tr>
                          {[
                            "№",
                            "Орцын нэр",
                            "Орох хэмжээ",
                            "Нэгж",
                            "Авсан нэгж үнэ",
                            "Орцын өртөг",
                            "",
                          ].map((title) => (
                            <th key={title} scope="col" className="px-3 py-2">
                              {title}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {draft.ingredients.map((row, index) => (
                          <tr key={row.id}>
                            <td className="w-10 bg-slate-50 px-3 text-xs text-slate-500">
                              {index + 1}
                            </td>
                            <td className="min-w-52">
                              <SupplyMaterialPicker
                                label={`${index + 1}. Хангамжийн материал`}
                                materials={supplyMaterials}
                                value={row.materialId}
                                fallbackLabel={row.name || undefined}
                                disabled={saving}
                                onChange={(materialId) => {
                                  const material = supplyMaterials.find(
                                    (item) => item.id === materialId,
                                  );
                                  if (!material) {
                                    changeRow(row.id, {
                                      materialId: undefined,
                                      name: "",
                                      packagePrice: "",
                                      packageQuantity: "",
                                    });
                                    return;
                                  }
                                  const unit = compatibleRecipeUnits(
                                    row.unit,
                                    material.unit,
                                  )
                                    ? row.unit
                                    : material.unit === "kg"
                                      ? "g"
                                      : material.unit === "l"
                                        ? "ml"
                                        : "pcs";
                                  changeRow(row.id, {
                                    materialId: material.id,
                                    name: material.name,
                                    unit,
                                    ...(compatibleRecipeUnits(
                                      row.unit,
                                      material.unit,
                                    )
                                      ? {}
                                      : { quantity: "" }),
                                    packageQuantity: "1",
                                    packageUnit: material.unit,
                                    packagePrice:
                                      material.unitPrice === null
                                        ? ""
                                        : String(material.unitPrice),
                                  });
                                }}
                              />
                            </td>
                            <RecipeCell title={`${index + 1}. Орох хэмжээ`}>
                              <input
                                type="number"
                                required
                                min="0.000001"
                                step="any"
                                value={row.quantity}
                                onChange={(event) =>
                                  changeRow(row.id, {
                                    quantity: event.target.value,
                                  })
                                }
                                className="min-h-11 w-full border-0 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:bg-indigo-50 focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                              />
                            </RecipeCell>
                            <RecipeCell title={`${index + 1}. Орцын нэгж`}>
                              <select
                                value={row.unit}
                                onChange={(event) =>
                                  changeUnit(
                                    row,
                                    event.target.value as RecipeUnit,
                                  )
                                }
                                className="min-h-11 w-full border-0 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:bg-indigo-50 focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                              >
                                {RECIPE_UNITS.filter((unit) => {
                                  const material = supplyMaterials.find(
                                    (item) => item.id === row.materialId,
                                  );
                                  return (
                                    !material ||
                                    compatibleRecipeUnits(unit, material.unit)
                                  );
                                }).map((unit) => (
                                  <option key={unit} value={unit}>
                                    {unitNames[unit]}
                                  </option>
                                ))}
                              </select>
                            </RecipeCell>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-slate-600">
                              {row.packagePrice.trim() ? (
                                <>
                                  {money(Number(row.packagePrice))}
                                  <span className="mt-1 block text-[10px] text-slate-400">
                                    / {row.packageQuantity || "—"}{" "}
                                    {unitNames[row.packageUnit]}
                                  </span>
                                </>
                              ) : (
                                <span className="text-amber-700">
                                  Үнэ ороогүй
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-semibold tabular-nums">
                              {money(cost?.lineCosts[index])}
                            </td>
                            <td className="w-11">
                              {" "}
                              <button
                                type="button"
                                aria-label={`${index + 1}-р орц устгах`}
                                onClick={() =>
                                  change({
                                    ingredients: draft.ingredients.filter(
                                      (item) => item.id !== row.id,
                                    ),
                                  })
                                }
                                className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    disabled={draft.ingredients.length >= 100}
                    onClick={() =>
                      change({
                        ingredients: [...draft.ingredients, newIngredient()],
                      })
                    }
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-bold disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                    Орц нэмэх
                  </button>
                  <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Өртөг гаргахын тулд хангамж дээр материал бүрийн авсан
                      үнийг оруулж хадгална. Энд дахин нээхэд шинэ үнийг татна.
                    </p>
                    <p className="text-sm font-bold">
                      Нэг бүтээгдэхүүний өртөг:{" "}
                      <span className="ml-2 tabular-nums text-indigo-700">
                        {money(cost?.unitCost)}
                      </span>
                    </p>
                  </div>
                </section>
                <Label title="Бэлтгэх заавар / тэмдэглэл">
                  <textarea
                    rows={3}
                    maxLength={10000}
                    value={draft.instructions}
                    onChange={(event) =>
                      change({ instructions: event.target.value })
                    }
                    className={inputStyle}
                  />
                </Label>
                <details className="rounded-lg border border-slate-200">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
                    Савлагаа, үнэ, өртгийн тооцоо (заавал биш)
                  </summary>
                  <div className="space-y-4 border-t border-slate-200 p-4">
                    <p className="text-xs text-slate-500">
                      Өртөг тооцох бол савлагааны хэмжээ, нэгж, үнийг оруулна.
                      Үнийг төгрөгөөр бүртгэнэ.
                    </p>
                    <div className="overflow-x-auto border border-slate-300">
                      <table className="w-full min-w-[650px] border-collapse text-sm [&_td]:border [&_td]:border-slate-200 [&_th]:border [&_th]:border-slate-300">
                        <caption className="sr-only">
                          Орцын савлагаа ба үнэ
                        </caption>
                        <thead className="bg-slate-100 text-left text-xs text-slate-600">
                          <tr>
                            {[
                              "Орц",
                              "Савлагааны хэмжээ",
                              "Нэгж",
                              "Савлагааны үнэ, ₮",
                              "Орцын өртөг",
                            ].map((title) => (
                              <th key={title} scope="col" className="px-3 py-2">
                                {title}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {draft.ingredients.map((row, index) => (
                            <tr key={row.id}>
                              <th
                                scope="row"
                                className="px-3 py-2 text-left font-medium"
                              >
                                {row.name || `${index + 1}-р орц`}
                              </th>
                              <RecipeCell
                                title={`${index + 1}. Савлагааны хэмжээ`}
                              >
                                <input
                                  type="number"
                                  min="0.000001"
                                  step="any"
                                  placeholder="Жишээ: 1000"
                                  value={row.packageQuantity}
                                  onChange={(event) =>
                                    changeRow(row.id, {
                                      packageQuantity: event.target.value,
                                    })
                                  }
                                  className="min-h-11 w-full border-0 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:bg-indigo-50 focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                                />
                              </RecipeCell>
                              <RecipeCell
                                title={`${index + 1}. Савлагааны нэгж`}
                              >
                                <select
                                  value={row.packageUnit}
                                  onChange={(event) =>
                                    changeRow(row.id, {
                                      packageUnit: event.target
                                        .value as RecipeUnit,
                                    })
                                  }
                                  className="min-h-11 w-full border-0 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:bg-indigo-50 focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                                >
                                  {RECIPE_UNITS.filter((unit) =>
                                    compatibleRecipeUnits(row.unit, unit),
                                  ).map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unitNames[unit]}
                                    </option>
                                  ))}
                                </select>
                              </RecipeCell>
                              <RecipeCell
                                title={`${index + 1}. Савлагааны үнэ (₮)`}
                              >
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Үнэ дутуу бол хоосон"
                                  value={row.packagePrice}
                                  onChange={(event) =>
                                    changeRow(row.id, {
                                      packagePrice: event.target.value,
                                    })
                                  }
                                  className="min-h-11 w-full border-0 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:bg-indigo-50 focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                                />
                              </RecipeCell>
                              <td className="whitespace-nowrap px-3 text-right tabular-nums">
                                {money(cost?.lineCosts[index])}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Label title="Энэ жорын цалингийн зардал (₮)">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.laborCost}
                          onChange={(event) =>
                            change({ laborCost: event.target.value })
                          }
                          className={inputStyle}
                        />
                      </Label>
                      <Label title="Энэ жорын бусад зардал (₮)">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.overheadCost}
                          onChange={(event) =>
                            change({ overheadCost: event.target.value })
                          }
                          className={inputStyle}
                        />
                      </Label>
                    </div>
                    <p className="text-xs text-slate-500">
                      Нэмэлт зардалгүй бол 0 оруулна. Нийт өртгийг дээрх
                      бүтээгдэхүүний тоонд хувааж нэгжийн өртгийг гаргана.
                    </p>
                    <section
                      aria-label="Өртгийн тооцоо"
                      className="rounded-xl bg-slate-50 p-4"
                    >
                      {!parsed.ok && (
                        <p className="mb-3 text-sm text-slate-600">
                          {parsed.message}
                        </p>
                      )}
                      {cost && cost.missingPriceCount > 0 && (
                        <p className="mb-3 text-sm text-amber-800">
                          {cost.missingPriceCount} орцын үнэ дутуу. Нийт болон
                          нэгжийн өртөг хараахан тодорхойгүй.
                        </p>
                      )}
                      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Amount
                          title="Үнэ орсон орцуудын дүн"
                          value={cost?.knownIngredientsCost}
                        />
                        <Amount
                          title="Жорын нийт өртөг"
                          value={cost?.batchCost}
                        />
                        <Amount
                          title="Нэг бүтээгдэхүүний өртөг"
                          value={cost?.unitCost}
                        />
                        <Amount
                          title="Зарах үнэ − нэгжийн өртөг"
                          value={difference}
                        />
                      </dl>
                      <p className="mt-3 text-xs text-slate-500">
                        Зарах үнэ: {money(product.price)}. Зөрүү нь энэ жорт
                        бүртгэсэн зардлаар тооцогдоно.
                      </p>
                    </section>
                    <label className="flex items-start gap-3 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={updateProductCost}
                        onChange={(event) =>
                          setUpdateProductCost(event.target.checked)
                        }
                        className="mt-1 size-4"
                      />
                      <span>
                        Тооцоолсон нэгжийн өртгийг бүтээгдэхүүний «Өртөг үнэ»-д
                        хадгалах
                      </span>
                    </label>
                  </div>
                </details>
              </fieldset>
            </form>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">
              Жор ачаалсны дараа мэдээллээ оруулна уу.
            </p>
          )}
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">
            {updatedAt
              ? `Сүүлд хадгалсан: ${new Date(updatedAt).toLocaleString("mn-MN")}`
              : "Одоогоор хадгалаагүй жор"}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={close}
              className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-bold"
            >
              Хаах
            </button>
            <button
              type="submit"
              form="product-recipe-form"
              disabled={!loaded || loading || saving}
              className="min-h-11 rounded-lg bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              {saving ? "Хадгалж байна…" : "Жор хадгалах"}
            </button>
          </div>
        </footer>
      </div>
    </dialog>,
    document.body,
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
function Amount({
  title,
  value,
}: {
  title: string;
  value: number | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{title}</dt>
      <dd className="mt-1 text-base font-black tabular-nums">{money(value)}</dd>
    </div>
  );
}

function RecipeCell({
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
