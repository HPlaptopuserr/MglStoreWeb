"use client";

import React, { useState } from "react";
import { Check, ChevronDown, Store } from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import type { VendorLoginRole } from "@/components/organisms/partners/VendorLoginAccountSelector";

export type Partner = {
  id: string;
  name: string;
  slug: string;
  taxId: string;
  type: string;
  status: string;
  isVerified: boolean;
  businessCategory: string | null;
  email: string | null;
  phone: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  profileImage?: string | null;
  profileImageUrl?: string | null;
  owner?: {
    image?: string | null;
    imageUrl?: string | null;
    avatarUrl?: string | null;
    profileImage?: string | null;
  } | null;
  address: string | null;
  createdAt: string;
  isInvestor?: boolean;
  investmentAmount?: number | null;
  stats: {
    users: number;
    products: number;
    branches: number;
    orders: number;
  };
};

export function getPartnerProfileImage(partner: Partner) {
  return (
    partner.logoUrl ||
    partner.profileImageUrl ||
    partner.profileImage ||
    partner.imageUrl ||
    partner.avatarUrl ||
    partner.owner?.profileImage ||
    partner.owner?.imageUrl ||
    partner.owner?.avatarUrl ||
    partner.owner?.image ||
    null
  );
}

export type ApiCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  level: number;
};

export type CreateOrganizationForm = {
  name: string;
  ownerEmail: string;
  ownerName: string;
  ownerPhone: string;
  ownerUserId: string;
  ownerRole: VendorLoginRole;
  phone: string;
  address: string;
  type: string;
  businessCategory: string;
  taxId: string;
};

export const EMPTY_CREATE_FORM: CreateOrganizationForm = {
  name: "",
  ownerEmail: "",
  ownerName: "",
  ownerPhone: "",
  ownerUserId: "",
  ownerRole: "OWNER",
  phone: "",
  address: "",
  type: "SUPPLIER",
  businessCategory: "",
  taxId: "",
};

export const INVESTOR_RING_COLORS = [
  "#FF6B6B",
  "#FF9F43",
  "#FECA57",
  "#2ED573",
  "#0ABDE3",
  "#48DBFB",
  "#A55EEA",
  "#F368E0",
  "#1DD1A1",
  "#FF6348",
];

export function getInvestorRingStyle(amount: number | null | undefined) {
  if (!amount || amount <= 0) return undefined;
  const count = Math.min(Math.floor(amount / 10_000_000), 10);
  if (count <= 0) return undefined;
  const stops: string[] = [];
  for (let i = 0; i < count; i++) {
    const start = (i / count) * 360;
    const end = ((i + 1) / count) * 360;
    stops.push(`${INVESTOR_RING_COLORS[i]} ${start}deg ${end}deg`);
  }
  return {
    background: `conic-gradient(${stops.join(", ")})`,
    padding: "3px",
    borderRadius: "14px",
  } as React.CSSProperties;
}

export function CategoryDropdown({
  partner,
  categories,
  onUpdated,
}: {
  partner: Partner;
  categories: ApiCategory[];
  onUpdated: (id: string, cat: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = categories.find((c) => c.slug === partner.businessCategory);

  const handleSelect = async (value: string | null) => {
    setOpen(false);
    setSaving(true);
    try {
      await adminFetch(`${API}/partners/${partner.id}/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessCategory: value }),
      });
      onUpdated(partner.id, value);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        disabled={saving}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none bg-indigo-50 text-indigo-600 border-indigo-200 hover:opacity-80"
      >
        <Store size={11} />
        {saving ? "..." : (current?.name ?? "Ангилал сонгох")}
        <ChevronDown
          size={11}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
            }}
          />
          <div className="absolute left-0 top-full mt-1 z-20 min-w-40 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
            <button
              onClick={(e) => {
                e.preventDefault();
                handleSelect(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:bg-slate-50 transition-colors"
            >
              <span className="w-3" />
              Ангилалгүй
            </button>
            <div className="border-t border-slate-100" />
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelect(cat.slug);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
              >
                {partner.businessCategory === cat.slug ? (
                  <Check size={12} className="text-indigo-500 shrink-0" />
                ) : (
                  <span className="w-3" />
                )}
                <span className="font-medium text-slate-600">
                  {cat.icon &&
                  !cat.icon.startsWith("data:") &&
                  !cat.icon.startsWith("http")
                    ? `${cat.icon} `
                    : ""}
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
