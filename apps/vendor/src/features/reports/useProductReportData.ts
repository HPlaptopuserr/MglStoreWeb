"use client";
import { useEffect, useState } from "react";
import { API, authFetch } from "@/lib/api";
import type { Product } from "@/features/products";

interface VendorSession {
  organizationId?: string;
  organizationName?: string;
}
function readSession(): VendorSession {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("vendor_user") || "{}",
    );
    return value && typeof value === "object" ? (value as VendorSession) : {};
  } catch {
    return {};
  }
}
export function useProductReportData() {
  const [session, setSession] = useState<VendorSession>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const vendor = readSession();
    setSession(vendor);
    setLoading(true);
    setError("");
    setProducts([]);
    async function load() {
      try {
        if (!vendor.organizationId)
          throw new Error(
            "Байгууллагын мэдээлэл олдсонгүй. Дахин нэвтэрнэ үү.",
          );
        const params = new URLSearchParams({
          organizationId: vendor.organizationId,
          includeExpiredInventory: "1",
          includeInactive: "1",
          includePosReceiptLots: "1",
        });
        const response = await authFetch(`${API}/products?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            "Бүтээгдэхүүний тайлан ачаалж чадсангүй. Дахин оролдоно уу.",
          );
        const data: unknown = await response.json();
        const rows = Array.isArray(data)
          ? data
          : data &&
              typeof data === "object" &&
              "products" in data &&
              Array.isArray(data.products)
            ? data.products
            : null;
        if (!rows)
          throw new Error(
            "Тайлангийн мэдээллийг уншиж чадсангүй. Дахин оролдоно уу.",
          );
        if (!controller.signal.aborted) setProducts(rows as Product[]);
      } catch (cause: unknown) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Тайлан ачаалж чадсангүй.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [revision]);
  return {
    products,
    loading,
    error,
    organizationId: session.organizationId || "",
    organizationName: session.organizationName || "",
    refresh: () => setRevision((value) => value + 1),
  };
}
