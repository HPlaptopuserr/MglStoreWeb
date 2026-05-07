"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Warehouse,
  MapPin,
  Phone,
  Calendar,
  Package,
  Box,
  AlertTriangle,
  Gauge,
  Building2,
  User,
  Loader2,
  Search,
  ExternalLink,
  Globe,
  GlobeLock,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

interface InventoryItem {
  id: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  location: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  lastRestockedAt: string | null;
  note: string | null;
  showOnWeb: boolean;
  product: {
    id: string;
    name: string;
    sku: string | null;
    price: number;
    images: { url: string }[];
    category: { id: string; name: string } | null;
    organization: { id: string; name: string; slug: string };
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface WarehouseDetail {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  phone: string | null;
  capacity: number;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  }[];
  inventories: InventoryItem[];
  createdBy: {
    id: string;
    email: string;
    profile: { fullName: string } | null;
  } | null;
  summary: {
    totalProducts: number;
    totalQuantity: number;
    lowStockItems: number;
    capacityUsed: number;
  };
  pagination?: Pagination;
}

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [warehouse, setWarehouse] = useState<WarehouseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleShowOnWeb = async (warehouseId: string, invId: string, current: boolean) => {
    setTogglingId(invId);
    try {
      const res = await adminFetch(`${API}/warehouses/${warehouseId}/inventory/${invId}/show-on-web`, {
        method: "PATCH",
      });
      if (res.ok) {
        setWarehouse((prev) =>
          prev
            ? {
                ...prev,
                inventories: prev.inventories.map((inv) =>
                  inv.id === invId ? { ...inv, showOnWeb: !current } : inv,
                ),
              }
            : prev,
        );
      }
    } catch (e) {
      console.error("toggle showOnWeb failed", e);
    } finally {
      setTogglingId(null);
    }
  };

  // Initial load — page 1
  useEffect(() => {
    const fetchWarehouse = async () => {
      try {
        const res = await adminFetch(`${API}/warehouses/${params.id}/detail?invPage=1&invLimit=100`);
        if (!res.ok) throw new Error("Failed to fetch warehouse");
        const data = await res.json();
        setWarehouse(data);
        setCurrentPage(1);
      } catch (error) {
        console.error("Failed to fetch warehouse:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params?.id) {
      fetchWarehouse();
    }
  }, [params?.id]);

  // Load next page of inventories and append
  const handleLoadMore = async () => {
    if (!warehouse || loadingMore) return;
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    try {
      const res = await adminFetch(
        `${API}/warehouses/${params.id}/detail?invPage=${nextPage}&invLimit=100`,
      );
      if (!res.ok) return;
      const data: WarehouseDetail = await res.json();
      setWarehouse((prev) =>
        prev
          ? {
              ...prev,
              inventories: [...prev.inventories, ...data.inventories],
              pagination: data.pagination,
            }
          : prev,
      );
      setCurrentPage(nextPage);
    } catch (e) {
      console.error("load more failed", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore =
    !!warehouse?.pagination &&
    warehouse.pagination.page < warehouse.pagination.totalPages;

  const filteredInventory = warehouse?.inventories.filter(
    (inv) =>
      inv.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.location?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#5B4CFF]" />
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 rounded-full bg-slate-100 p-4">
          <Warehouse className="h-10 w-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Агуулах олдсонгүй
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Таны хайсан агуулахын мэдээлэл олдсонгүй
        </p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#5B4CFF] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#5B4CFF]/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Буцах
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {warehouse.name}
          </h1>
          <p className="text-sm text-slate-500">
            {warehouse.city}, {warehouse.district}
          </p>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            warehouse.isActive
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {warehouse.isActive ? "Идэвхтэй" : "Идэвхгүй"}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#5B4CFF]/10 p-2.5">
              <Package className="h-5 w-5 text-[#5B4CFF]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {warehouse.summary.totalProducts}
              </p>
              <p className="text-xs text-slate-500">Төрөл бараа</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5">
              <Box className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {warehouse.summary.totalQuantity.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">Нийт тоо ширхэг</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {warehouse.summary.lowStockItems}
              </p>
              <p className="text-xs text-slate-500">Дуусч буй</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-50 p-2.5">
              <Gauge className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {warehouse.summary.capacityUsed}%
              </p>
              <p className="text-xs text-slate-500">Багтаамж ашигласан</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warehouse Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Details Card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6">
          <h3 className="mb-4 font-bold text-slate-900">Агуулахын мэдээлэл</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-700">Хаяг</p>
                <p className="text-sm text-slate-500">{warehouse.address}</p>
              </div>
            </div>
            {warehouse.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Утас</p>
                  <p className="text-sm text-slate-500">{warehouse.phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Box className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-700">Багтаамж</p>
                <p className="text-sm text-slate-500">
                  {warehouse.capacity.toLocaleString()} ширхэг
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-700">Үүсгэсэн</p>
                <p className="text-sm text-slate-500">
                  {new Date(warehouse.createdAt).toLocaleDateString("mn-MN")}
                </p>
              </div>
            </div>
            {warehouse.createdBy && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Үүсгэсэн хэрэглэгч
                  </p>
                  <p className="text-sm text-slate-500">
                    {warehouse.createdBy.profile?.fullName ||
                      warehouse.createdBy.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Organizations Card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 lg:col-span-2">
          <h3 className="mb-4 font-bold text-slate-900">
            Хуваарилагдсан байгууллагууд ({warehouse.organizations.length})
          </h3>
          {warehouse.organizations.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {warehouse.organizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white">
                    {org.logoUrl ? (
                      <img
                        src={org.logoUrl}
                        alt={org.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">
                      {org.name}
                    </p>
                    <p className="text-xs text-slate-500">@{org.slug}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/partners/${org.id}`)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8">
              <Building2 className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">
                Хуваарилагдсан байгууллага байхгүй
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-2xl border border-slate-100 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Агуулахын бүртгэл</h3>
            <p className="text-sm text-slate-500">
              Барааны жагсаалт болон тоо ширхэг
            </p>
          </div>
          <div className="relative max-w-xs w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Бараа хайх..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
            />
          </div>
        </div>

        {filteredInventory && filteredInventory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Бараа
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Байршил
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Тоо ширхэг
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Нийлүүлэгч
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-slate-500">
                    Web
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((inv) => {
                  const isLowStock = inv.quantity <= inv.minQuantity;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 overflow-hidden">
                            {inv.product.images?.[0]?.url ? (
                              <img
                                src={inv.product.images[0].url}
                                alt={inv.product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-5 w-5 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">
                              {inv.product.name}
                            </p>
                            {inv.product.category && (
                              <p className="text-xs text-slate-500">
                                {inv.product.category.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">
                          {inv.product.sku || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">
                          {inv.location || "-"}
                        </span>
                        {inv.batchNumber && (
                          <p className="text-xs text-slate-400">
                            Batch: {inv.batchNumber}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`text-sm font-semibold ${
                            isLowStock ? "text-red-600" : "text-slate-900"
                          }`}
                        >
                          {inv.quantity.toLocaleString()}
                        </span>
                        <p className="text-xs text-slate-400">
                          min: {inv.minQuantity}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-slate-600">
                          {inv.product.organization.name}
                        </span>
                      </td>
                      {/* Web toggle */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleShowOnWeb(warehouse.id, inv.id, inv.showOnWeb)}
                          disabled={togglingId === inv.id}
                          title={inv.showOnWeb ? "Web дээр харагдаж байна — дарж нуух" : "Web дээр харуулах"}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
                            inv.showOnWeb
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          {togglingId === inv.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : inv.showOnWeb ? (
                            <Globe size={12} />
                          ) : (
                            <GlobeLock size={12} />
                          )}
                          {inv.showOnWeb ? "Нийтлэг" : "Хаалттай"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                            <AlertTriangle className="h-3 w-3" />
                            Дуусч буй
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                            Хэвийн
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Load more footer */}
            {(hasMore || warehouse?.pagination) && !searchTerm && (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{warehouse?.inventories.length}</span> / <span className="font-semibold text-slate-700">{warehouse?.summary.totalProducts}</span> бараа харагдаж байна
                </p>
                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#5B4CFF]/30 bg-[#5B4CFF]/5 px-4 py-1.5 text-xs font-semibold text-[#5B4CFF] hover:bg-[#5B4CFF]/10 disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : null}
                    {loadingMore ? "Уншиж байна..." : "Цааш харах"}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <Package className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-lg font-semibold text-slate-600">
              {searchTerm ? "Бараа олдсонгүй" : "Бүртгэл байхгүй"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {searchTerm
                ? "Хайлтын үр дүн олдсонгүй"
                : "Энэ агуулахад бүртгэл нэмээгүй байна"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
