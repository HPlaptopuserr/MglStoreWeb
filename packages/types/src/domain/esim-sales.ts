export const ESIM_SALES_SETTINGS_KEY = "private-esim-sales-v1";
export interface EsimSalesSettings {
  mode: "coming-soon" | "live";
  announcement: string;
  terms: string;
  prices: Record<string, number>;
}
export interface EsimSalesDocument {
  settings: EsimSalesSettings;
  revision: number;
}
export const emptyEsimSalesSettings = (): EsimSalesSettings => ({
  mode: "coming-soon",
  announcement: "Тун удахгүй — аяллын eSIM багцуудын үнэ зарлагдана.",
  terms: "",
  prices: {},
});
export function parseEsimSalesSettings(raw: unknown): EsimSalesSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Тохиргооны бүтэц буруу байна.");
  const value = raw as Record<string, unknown>;
  if (
    Object.keys(value).some(
      (k) => !["mode", "announcement", "terms", "prices"].includes(k),
    ) ||
    !["coming-soon", "live"].includes(String(value.mode)) ||
    typeof value.announcement !== "string" ||
    value.announcement.length > 240 ||
    typeof value.terms !== "string" ||
    value.terms.length > 5000 ||
    !value.prices ||
    typeof value.prices !== "object" ||
    Array.isArray(value.prices)
  )
    throw new Error("Тохиргооны утгууд буруу байна.");
  const prices: Record<string, number> = {};
  const entries = Object.entries(value.prices);
  if (entries.length > 5000) throw new Error("Багцын тоо хэтэрсэн байна.");
  for (const [id, price] of entries) {
    if (
      !/^esim-access:[A-Za-z0-9_.:-]{1,180}$/.test(id) ||
      typeof price !== "number" ||
      !Number.isSafeInteger(price) ||
      price < 1 ||
      price > 2147483647
    )
      throw new Error("Багцын үнэ бүхэл төгрөгөөр, 0-ээс их байх ёстой.");
    prices[id] = price;
  }
  if (value.mode === "live" && entries.length === 0)
    throw new Error("Үнэ нийтлэхийн өмнө дор хаяж нэг багцад үнэ оруулна уу.");
  return {
    mode: value.mode as EsimSalesSettings["mode"],
    announcement: value.announcement.trim(),
    terms: value.terms.trim(),
    prices,
  };
}
