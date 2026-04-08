"use client";

import { useEffect, useState, useCallback } from "react";
import { Tag, ChevronDown, Plus, Loader2 } from "lucide-react";
import { API, wmsFetch } from "@/lib/api";

/**
 * SKU Format: XXX-YYY-NNN
 *   XXX = Product name abbreviation (3 chars, auto)
 *   YYY = Organization name abbreviation (3 chars, auto)
 *   NNN = Product type number (operator enters manually OR selected from existing)
 *
 * Mongolian (Cyrillic) text is transliterated to Latin automatically.
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
  return text
    .split("")
    .map((ch) => CYRILLIC_MAP[ch] ?? ch)
    .join("");
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

function removeVowels(str: string): string {
  return str.replace(/[aeiouAEIOU]/g, "");
}

type ExistingSku = { id: string; name: string; sku: string };

type SkuGeneratorProps = {
  productName: string;
  organizationName: string;
  warehouseId: string;
  value: string;
  onChange: (sku: string) => void;
};

export default function SkuGenerator({
  productName,
  organizationName,
  warehouseId,
  value,
  onChange,
}: SkuGeneratorProps) {
  const [typeNumber, setTypeNumber] = useState("001");
  const [productAbbr, setProductAbbr] = useState("XXX");
  const [orgAbbr, setOrgAbbr] = useState("XXX");

  // Existing SKU lookup
  const [existingSkus, setExistingSkus] = useState<ExistingSku[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNewType, setIsNewType] = useState(true);

  // Parse existing value on mount
  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        setProductAbbr(parts[0]);
        setOrgAbbr(parts[1]);
        setTypeNumber(parts[2]);
        return;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate abbreviations from names
  useEffect(() => {
    setProductAbbr(abbreviate(productName));
  }, [productName]);

  useEffect(() => {
    setOrgAbbr(abbreviate(organizationName));
  }, [organizationName]);

  // Emit full SKU whenever parts change
  useEffect(() => {
    const sku = `${productAbbr}-${orgAbbr}-${typeNumber || "000"}`;
    onChange(sku);
  }, [productAbbr, orgAbbr, typeNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lookup existing SKUs when prefix changes
  const lookupSkus = useCallback(async (prefix: string) => {
    if (!warehouseId || prefix.length < 3) {
      setExistingSkus([]);
      return;
    }
    setLookupLoading(true);
    try {
      const res = await wmsFetch(
        `${API}/warehouses/${warehouseId}/sku-lookup?prefix=${encodeURIComponent(prefix)}`
      );
      if (res.ok) {
        const data: ExistingSku[] = await res.json();
        setExistingSkus(data);
        // Auto-suggest next type number
        if (data.length > 0 && isNewType) {
          const nums = data
            .map((p) => {
              const parts = (p.sku || "").split("-");
              return parts.length === 3 ? parseInt(parts[2]) || 0 : 0;
            })
            .sort((a, b) => a - b);
          const next = (nums[nums.length - 1] + 1).toString().padStart(3, "0");
          setTypeNumber(next);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLookupLoading(false);
    }
  }, [warehouseId, isNewType]);

  // Debounced prefix lookup
  useEffect(() => {
    if (productAbbr === "XXX" || orgAbbr === "XXX") return;
    const prefix = `${productAbbr}-${orgAbbr}`;
    const timer = setTimeout(() => lookupSkus(prefix), 400);
    return () => clearTimeout(timer);
  }, [productAbbr, orgAbbr, lookupSkus]);

  const handleTypeChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 3);
    setTypeNumber(cleaned);
    setIsNewType(true);
  };

  const selectExisting = (sku: ExistingSku) => {
    const parts = (sku.sku || "").split("-");
    if (parts.length === 3) {
      setTypeNumber(parts[2]);
      setIsNewType(false);
    }
    setShowDropdown(false);
  };

  const selectNewType = () => {
    if (existingSkus.length > 0) {
      const nums = existingSkus
        .map((p) => {
          const parts = (p.sku || "").split("-");
          return parts.length === 3 ? parseInt(parts[2]) || 0 : 0;
        })
        .sort((a, b) => a - b);
      const next = (nums[nums.length - 1] + 1).toString().padStart(3, "0");
      setTypeNumber(next);
    }
    setIsNewType(true);
    setShowDropdown(false);
  };

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Tag className="h-4 w-4" />
        SKU код
        {lookupLoading && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
      </label>

      {/* Preview */}
      <div className="mb-2 flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-2 font-mono text-lg font-bold tracking-wider">
        <span className="text-blue-600">{productAbbr}</span>
        <span className="text-slate-300">-</span>
        <span className="text-emerald-600">{orgAbbr}</span>
        <span className="text-slate-300">-</span>
        <span className="text-amber-600">{typeNumber || "000"}</span>
      </div>

      {/* Existing SKUs banner */}
      {existingSkus.length > 0 && (
        <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <p className="text-xs font-semibold text-blue-700">
            {existingSkus.length} бүртгэлтэй бараа олдлоо ({productAbbr}-{orgAbbr} угтвартай)
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {existingSkus.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectExisting(s)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                  !isNewType && value === s.sku
                    ? "border-blue-500 bg-blue-100 text-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                <span className="font-mono font-bold">{s.sku}</span>
                <span className="text-slate-400">·</span>
                <span className="max-w-[120px] truncate">{s.name}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={selectNewType}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                isNewType
                  ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                  : "border-dashed border-slate-300 text-slate-500 hover:border-emerald-400 hover:bg-emerald-50"
              }`}
            >
              <Plus className="h-3 w-3" />
              Шинэ төрөл
            </button>
          </div>
        </div>
      )}

      {/* Inputs */}
      <div className="grid grid-cols-3 gap-2">
        {/* Product abbreviation */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Бүтээгдэхүүн
          </label>
          <input
            value={productAbbr}
            onChange={(e) => {
              const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
              setProductAbbr(val);
            }}
            maxLength={3}
            placeholder="XXX"
            className="h-9 w-full rounded-md border border-slate-300 px-2 text-center font-mono text-sm font-semibold uppercase outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
          />
          <p className="mt-0.5 text-[9px] text-slate-400">Нэрнээс автомат</p>
        </div>

        {/* Organization abbreviation (auto, editable) */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Байгууллага
          </label>
          <input
            value={orgAbbr}
            onChange={(e) => {
              const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
              setOrgAbbr(val);
            }}
            maxLength={3}
            placeholder="XXX"
            className="h-9 w-full rounded-md border border-slate-300 px-2 text-center font-mono text-sm font-semibold uppercase outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
          />
          <p className="mt-0.5 text-[9px] text-slate-400">Байг. нэрнээс</p>
        </div>

        {/* Type number (manual) */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Төрөл №
          </label>
          <input
            value={typeNumber}
            onChange={(e) => handleTypeChange(e.target.value)}
            maxLength={3}
            placeholder="001"
            className="h-9 w-full rounded-md border border-amber-300 bg-amber-50 px-2 text-center font-mono text-sm font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
          />
          <p className="mt-0.5 text-[9px] text-amber-600 font-medium">Гараар оруулна</p>
        </div>
      </div>
    </div>
  );
}
