"use client";

import { useEffect, useState, useCallback } from "react";
import { Tag, PlusCircle, CheckCircle2 } from "lucide-react";
import type { Product } from "../types";

/**
 * SKU Format: XXX-YYY-NNN
 *   XXX = Product name abbreviation (3 chars, auto)
 *   YYY = Organization abbreviation (3 chars, auto) - Optional/Configurable
 *   NNN = Product type number (selected from dropdown or new)
 */

const CYRILLIC_MAP: Record<string, string> = {
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ё: "YO",
  Ж: "J", З: "Z", И: "I", Й: "I", К: "K", Л: "L", М: "M",
  Н: "N", О: "O", Ө: "O", П: "P", Р: "R", С: "S", Т: "T",
  У: "U", Ү: "U", Ф: "F", Х: "H", Ц: "TS", Ч: "CH", Ш: "SH",
  Щ: "SH", Ъ: "", Ы: "Y", Ь: "", Э: "E", Ю: "YU", Я: "YA",
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
  ж: "j", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m",
  н: "n", о: "o", ө: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ү: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function isCyrillic(text: string): boolean {
  return /[а-яА-ЯөүӨҮёЁ]/.test(text);
}

function transliterate(text: string): string {
  if (!isCyrillic(text)) return text;
  return text.split("").map((ch) => CYRILLIC_MAP[ch] ?? ch).join("");
}

function removeVowels(str: string): string {
  return str.replace(/[aeiouAEIOU]/g, "");
}

function abbreviate(text: string): string {
  if (!text.trim()) return "XXX";
  const latin = transliterate(text);
  const words = latin.trim().split(/\s+/).filter((w) => w.length > 0);

  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  }
  if (words.length === 2) {
    const c1 = removeVowels(words[0]);
    const c2 = removeVowels(words[1]);
    if (c1.length >= 2) return (c1.slice(0, 2) + (c2[0] || words[1][0])).toUpperCase();
    return (words[0][0] + (c1[1] || words[0][1] || "") + words[1][0]).toUpperCase().padEnd(3, "X");
  }
  const word = words[0];
  const consonants = removeVowels(word);
  if (consonants.length >= 3) return consonants.slice(0, 3).toUpperCase();
  const result = word[0] + consonants.replace(word[0].toLowerCase(), "").replace(word[0].toUpperCase(), "");
  if (result.length >= 3) return result.slice(0, 3).toUpperCase();
  return word.slice(0, 3).toUpperCase().padEnd(3, "X");
}

function nextNum(skus: { sku: string }[]): string {
  if (skus.length === 0) return "001";
  const nums = skus.map((s) => {
    const parts = (s.sku || "").split("-");
    return parts.length === 3 ? parseInt(parts[2]) || 0 : 0;
  }).sort((a, b) => a - b);
  return (nums[nums.length - 1] + 1).toString().padStart(3, "0");
}

const NEW_TYPE_VALUE = "__new__";

type SkuGeneratorProps = {
  productName: string;
  organizationName?: string;
  products: Product[];
  value: string;
  onChange: (sku: string) => void;
};

export function VendorSkuGenerator({
  productName,
  organizationName = "MGL",
  products,
  value,
  onChange,
}: SkuGeneratorProps) {
  const [typeNumber, setTypeNumber] = useState("001");
  const [productAbbr, setProductAbbr] = useState("XXX");
  const [orgAbbr, setOrgAbbr] = useState("XXX");

  const [existingSkus, setExistingSkus] = useState<Product[]>([]);
  const [isNewType, setIsNewType] = useState(true);

  // Parse existing value on mount
  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        setProductAbbr(parts[0]);
        setOrgAbbr(parts[1]);
        setTypeNumber(parts[2]);
      } else if (parts.length === 2) {
        setProductAbbr(parts[0]);
        setTypeNumber(parts[1]);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setProductAbbr(abbreviate(productName)); }, [productName]);
  useEffect(() => { setOrgAbbr(abbreviate(organizationName)); }, [organizationName]);

  // Emit full SKU whenever parts change
  useEffect(() => {
    if (productAbbr === "XXX") return;
    onChange(`${productAbbr}-${orgAbbr}-${typeNumber || "000"}`);
  }, [productAbbr, orgAbbr, typeNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const lookupSkus = useCallback((prefix: string) => {
    if (prefix.length < 3) { setExistingSkus([]); return; }
    const matches = products.filter(p => p.sku && p.sku.startsWith(prefix));
    setExistingSkus(matches);
    if (matches.length > 0 && isNewType) {
      setTypeNumber(nextNum(matches.map(m => ({ sku: m.sku || "" }))));
    }
  }, [products, isNewType]);

  useEffect(() => {
    if (productAbbr === "XXX" || orgAbbr === "XXX") return;
    const prefix = `${productAbbr}-${orgAbbr}`;
    const timer = setTimeout(() => lookupSkus(prefix), 400);
    return () => clearTimeout(timer);
  }, [productAbbr, orgAbbr, lookupSkus]);

  const handleDropdownChange = (val: string) => {
    if (val === NEW_TYPE_VALUE) {
      setTypeNumber(nextNum(existingSkus.map(m => ({ sku: m.sku || "" }))));
      setIsNewType(true);
    } else {
      const found = existingSkus.find((s) => (s.sku?.split("-")[2] || "") === val);
      if (found) {
        setTypeNumber(val);
        setIsNewType(false);
      }
    }
  };

  const selectedExisting = !isNewType
    ? existingSkus.find((s) => (s.sku?.split("-")[2] || "") === typeNumber)
    : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Tag className="h-4 w-4 text-indigo-500" />
        SKU код үүсгэгч
      </label>

      {/* Preview */}
      <div className="mb-3 flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-3 py-2 font-mono text-lg font-bold tracking-wider">
        <span className="text-indigo-600">{productAbbr}</span>
        <span className="text-slate-300">-</span>
        <span className="text-emerald-600">{orgAbbr}</span>
        <span className="text-slate-300">-</span>
        <span className="text-amber-600">{typeNumber || "000"}</span>
      </div>

      {/* Abbreviation inputs */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Бүтээгдэхүүн
          </label>
          <input
            value={productAbbr}
            onChange={(e) => setProductAbbr(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3))}
            maxLength={3}
            placeholder="XXX"
            className="h-9 w-full rounded-md border border-slate-200 px-2 text-center font-mono text-sm font-semibold uppercase outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
          />
          <p className="mt-0.5 text-[9px] text-slate-400">Нэрнээс автомат</p>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Байгууллага
          </label>
          <input
            value={orgAbbr}
            onChange={(e) => setOrgAbbr(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3))}
            maxLength={3}
            placeholder="XXX"
            className="h-9 w-full rounded-md border border-slate-200 px-2 text-center font-mono text-sm font-semibold uppercase outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
          />
          <p className="mt-0.5 text-[9px] text-slate-400">Байг. нэрнээс</p>
        </div>
      </div>

      {/* Type number */}
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Төрөл №
        </label>

        {existingSkus.length > 0 ? (
          <>
            <div className="relative">
              <select
                value={isNewType ? NEW_TYPE_VALUE : typeNumber}
                onChange={(e) => handleDropdownChange(e.target.value)}
                className="h-10 w-full appearance-none rounded-md border border-amber-300 bg-amber-50 pl-3 pr-8 font-mono text-sm font-semibold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
              >
                {existingSkus.map((s) => {
                  const num = s.sku?.split("-")[2] || "";
                  return (
                    <option key={s.id} value={num}>
                      {num} · {s.name}
                    </option>
                  );
                })}
                <option value={NEW_TYPE_VALUE}>
                  + Шинэ төрөл ({nextNum(existingSkus.map(m => ({ sku: m.sku || "" })))})
                </option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-500">▾</span>
            </div>

            {isNewType ? (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <PlusCircle className="h-3 w-3" />
                Шинэ төрөл {typeNumber} үүсгэнэ
              </p>
            ) : selectedExisting ? (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-blue-600">
                <CheckCircle2 className="h-3 w-3" />
                Бүртгэлтэй бараатай нийлэх: {selectedExisting.name}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <input
              value={typeNumber}
              onChange={(e) => {
                setTypeNumber(e.target.value.replace(/\D/g, "").slice(0, 3));
                setIsNewType(true);
              }}
              maxLength={3}
              placeholder="001"
              className="h-9 w-full rounded-md border border-amber-300 bg-amber-50 px-2 text-center font-mono text-sm font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
            />
            <p className="mt-0.5 text-[9px] font-medium text-amber-600">Гараар оруулна</p>
          </>
        )}
      </div>
    </div>
  );
}
