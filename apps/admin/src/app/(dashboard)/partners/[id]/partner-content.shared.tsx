"use client";

import React, { useState, type ChangeEvent } from "react";
import { ImageIcon, Loader2, ToggleLeft, ToggleRight, X } from "lucide-react";
import { adminFetch } from "@/lib/api";

export type TabKey = "profile" | "products" | "services";
export type SupplyType = "IN_STOCK" | "CHINA_PREORDER";

export type PartnerProfile = {
  id: string;
  name: string;
  slug?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  openingHours?: string[] | null;
  deliveryText?: string | null;
  deliveryPrice?: string | null;
  businessCategory?: string | null;
  years?: number | null;
  operatingYears?: number | null;
  stats?: {
    products?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type BusinessCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
  children?: BusinessCategory[];
};

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  price: number | string;
  costPrice: number | string | null;
  stock: number;
  expiryDate?: string | null;
  supplyType?: SupplyType;
  preorderLeadTimeDays?: number | null;
  preorderNote?: string | null;
  marketplacePriority?: number | null;
  isActive: boolean;
  images: { id: string; url: string }[];
  businessCategoryId: string | null;
  businessCategory?: { id: string; name: string; slug?: string | null } | null;
  createdAt?: string;
};

export type ServicePost = {
  id: string;
  title: string;
  description: string | null;
  priceText: string | null;
  tags: string[];
  isActive: boolean;
  viewCount?: number;
  images: { id: string; url: string }[];
  createdAt?: string;
};

export type ProfileForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
  bannerUrl: string;
  shortDescription: string;
  description: string;
  openingHours: string;
  deliveryText: string;
  deliveryPrice: string;
  operatingYears: string;
  businessCategory: string;
};

export type ProductForm = {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: string;
  costPrice: string;
  stock: string;
  expiryDate: string;
  supplyType: SupplyType;
  preorderLeadTimeDays: string;
  preorderNote: string;
  marketplacePriority: string;
  businessCategoryId: string;
  images: string[];
  isActive: boolean;
};

export type ServiceForm = {
  title: string;
  description: string;
  priceText: string;
  tags: string[];
  images: string[];
  isActive: boolean;
};

export type Toast = { type: "success" | "error"; message: string };

export const EMPTY_PRODUCT_FORM: ProductForm = {
  name: "",
  sku: "",
  barcode: "",
  description: "",
  price: "",
  costPrice: "",
  stock: "0",
  expiryDate: "",
  supplyType: "IN_STOCK",
  preorderLeadTimeDays: "14",
  preorderNote: "",
  marketplacePriority: "0",
  businessCategoryId: "",
  images: [],
  isActive: true,
};

export const EMPTY_SERVICE_FORM: ServiceForm = {
  title: "",
  description: "",
  priceText: "",
  tags: [],
  images: [],
  isActive: true,
};

export const MAX_IMAGES = 5;

export function toProfileForm(partner: PartnerProfile): ProfileForm {
  return {
    name: partner.name || "",
    phone: partner.phone || "",
    email: partner.email || "",
    address: partner.address || "",
    logoUrl: partner.logoUrl || "",
    bannerUrl: partner.bannerUrl || "",
    shortDescription: partner.shortDescription || "",
    description: partner.description || "",
    openingHours: Array.isArray(partner.openingHours)
      ? partner.openingHours.join("\n")
      : "",
    deliveryText: partner.deliveryText || "",
    deliveryPrice: partner.deliveryPrice || "",
    operatingYears: String(partner.operatingYears ?? partner.years ?? 1),
    businessCategory: partner.businessCategory || "",
  };
}

export function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
}

export function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "-";
  return `${amount.toLocaleString("mn-MN")}₮`;
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleDateString("mn-MN");
}

export function flattenCategories(
  categories: BusinessCategory[],
  depth = 0,
): Array<BusinessCategory & { depth: number }> {
  return categories.flatMap((category) => [
    { ...category, depth },
    ...flattenCategories(category.children || [], depth + 1),
  ]);
}

export function normalizeStringArray(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file: File, endpoint: string) {
  const formData = new FormData();
  formData.append("image", file);
  const res = await adminFetch(endpoint, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Зураг upload хийхэд алдаа гарлаа");
  }
  const data = await res.json();
  if (!data.url) throw new Error("Upload URL олдсонгүй");
  return String(data.url);
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 ${props.className || ""}`}
    />
  );
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 ${props.className || ""}`}
    />
  );
}

export function SelectInput(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-bold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 ${props.className || ""}`}
    />
  );
}

export function ToggleButton({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
    >
      {checked ? (
        <ToggleRight size={24} className="text-emerald-500" />
      ) : (
        <ToggleLeft size={24} className="text-slate-400" />
      )}
      {label}
    </button>
  );
}

export function ImageGrid({
  images,
  onChange,
  uploadEndpoint,
  fallbackToDataUrl = true,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  uploadEndpoint?: string;
  fallbackToDataUrl?: boolean;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    setUploading(true);
    setError("");
    const next = [...images];

    for (const file of files) {
      if (next.length >= MAX_IMAGES) break;
      try {
        const url = uploadEndpoint
          ? await uploadImage(file, uploadEndpoint)
          : await fileToDataUrl(file);
        next.push(url);
      } catch (uploadError) {
        if (!fallbackToDataUrl) {
          setError(
            uploadError instanceof Error
              ? uploadError.message
              : "Зураг upload хийхэд алдаа гарлаа",
          );
          continue;
        }
        try {
          next.push(await fileToDataUrl(file));
        } catch {
          setError("Зураг уншихад алдаа гарлаа");
        }
      }
    }

    onChange(next.slice(0, MAX_IMAGES));
    setUploading(false);
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, itemIndex) => itemIndex !== index));
  };

  const moveImage = (from: number, to: number) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <FieldLabel>
          Зураг ({images.length}/{MAX_IMAGES})
        </FieldLabel>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {Array.from({ length: MAX_IMAGES }).map((_, index) => {
          const image = images[index];
          const canAdd = index === images.length && !uploading;
          const isUploadingSlot = index === images.length && uploading;

          if (image) {
            return (
              <div
                key={index}
                draggable
                onDragStart={() => setDragging(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragging !== null && dragging !== index)
                    moveImage(dragging, index);
                  setDragging(null);
                }}
                className={`group relative aspect-square overflow-hidden rounded-lg border bg-slate-100 ${index === 0 ? "border-indigo-400" : "border-slate-200"} ${dragging === index ? "opacity-50" : ""}`}
              >
                <img
                  src={image}
                  alt={`Зураг ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Үндсэн
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-slate-950/70 p-1 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                  aria-label="Зураг устгах"
                >
                  <X size={12} />
                </button>
              </div>
            );
          }

          return (
            <label
              key={index}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed text-xs font-bold transition-colors ${
                canAdd
                  ? "cursor-pointer border-slate-300 bg-white text-slate-500 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                  : isUploadingSlot
                    ? "border-indigo-300 bg-indigo-50 text-indigo-500"
                    : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
              }`}
            >
              {isUploadingSlot ? (
                <Loader2 size={18} className="animate-spin" />
              ) : canAdd ? (
                <>
                  <ImageIcon size={18} className="mb-1" />
                  Нэмэх
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={handleInputChange}
                  />
                </>
              ) : (
                index + 1
              )}
            </label>
          );
        })}
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
