"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Warehouse,
  Loader2,
  MapPin,
  Building2,
  Phone,
  User,
  MoreVertical,
  Edit,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Check,
  Eye,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface WarehouseData {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  organizations: Organization[];
  createdBy: {
    id: string;
    name: string;
  };
}

export default function AdminWarehousesPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<WarehouseData | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    district: "",
    phone: "",
  });
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [warehouseRes, orgRes] = await Promise.all([
        adminFetch(`${API}/warehouses`),
        adminFetch(`${API}/partners?status=APPROVED&limit=1000`),
      ]);

      if (warehouseRes.ok) {
        const data = await warehouseRes.json();
        setWarehouses(data || []);
      }

      if (orgRes.ok) {
        const data = await orgRes.json();
        // API returns array directly, not { partners: [...] }
        const partners = Array.isArray(data) ? data : data?.partners || [];
        setOrganizations(
          partners.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
          })),
        );
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWarehouse = async () => {
    if (!formData.name.trim() || !formData.address.trim()) return;

    setIsSubmitting(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem("admin_user") || "{}");
      const response = await adminFetch(`${API}/warehouses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          createdById: storedUser.id,
        }),
      });

      if (!response.ok) throw new Error("Failed to create warehouse");

      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Failed to create warehouse:", error);
      alert("Агуулах үүсгэхэд алдаа гарлаа");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditWarehouse = async () => {
    if (!selectedWarehouse || !formData.name.trim() || !formData.address.trim())
      return;

    setIsSubmitting(true);
    try {
      const response = await adminFetch(
        `${API}/warehouses/${selectedWarehouse.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      if (!response.ok) throw new Error("Failed to update warehouse");

      setShowEditModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Failed to update warehouse:", error);
      alert("Агуулах засахад алдаа гарлаа");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignWarehouse = async () => {
    if (!selectedWarehouse) return;

    setIsSubmitting(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem("admin_user") || "{}");
      const response = await adminFetch(
        `${API}/warehouses/${selectedWarehouse.id}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationIds: selectedOrgIds,
            assignedById: storedUser.id,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to assign warehouse");

      setShowAssignModal(false);
      setSelectedOrgIds([]);
      fetchData();
    } catch (error) {
      console.error("Failed to assign warehouse:", error);
      alert("Агуулах хуваарилахад алдаа гарлаа");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!selectedWarehouse) return;

    setIsSubmitting(true);
    try {
      const response = await adminFetch(
        `${API}/warehouses/${selectedWarehouse.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) throw new Error("Failed to delete warehouse");

      setShowDeleteConfirm(false);
      setSelectedWarehouse(null);
      fetchData();
    } catch (error) {
      console.error("Failed to delete warehouse:", error);
      alert("Агуулах устгахад алдаа гарлаа");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      district: "",
      phone: "",
    });
    setSelectedWarehouse(null);
  };

  const openEditModal = (warehouse: WarehouseData) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      address: warehouse.address,
      city: warehouse.city,
      district: warehouse.district,
      phone: warehouse.phone || "",
    });
    setShowEditModal(true);
    setOpenDropdownId(null);
  };

  const openAssignModal = (warehouse: WarehouseData) => {
    setSelectedWarehouse(warehouse);
    setSelectedOrgIds(warehouse.organizations?.map((o) => o.id) || []);
    setShowAssignModal(true);
    setOpenDropdownId(null);
  };

  const openDeleteConfirm = (warehouse: WarehouseData) => {
    setSelectedWarehouse(warehouse);
    setShowDeleteConfirm(true);
    setOpenDropdownId(null);
  };

  const filteredWarehouses = warehouses.filter(
    (w) =>
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.city.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#5B4CFF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Агуулахууд</h1>
          <p className="text-sm text-slate-500">
            Агуулахуудыг удирдах, vendor-уудад хуваарилах
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/warehouses/operators")}
            className="inline-flex items-center gap-2 rounded-xl border border-[#5B4CFF]/30 px-5 py-3 text-sm font-bold text-[#5B4CFF] transition-all hover:bg-[#5B4CFF]/5"
          >
            <User className="h-5 w-5" />
            Оператор бүртгэл
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5B4CFF] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#5B4CFF]/90 hover:shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Шинэ агуулах
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Агуулах хайх..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-[#5B4CFF]/10 p-3">
              <Warehouse className="h-6 w-6 text-[#5B4CFF]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {warehouses.length}
              </p>
              <p className="text-sm text-slate-500">Нийт агуулах</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-green-50 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {warehouses.filter((w) => w.organizations?.length > 0).length}
              </p>
              <p className="text-sm text-slate-500">Хуваарилагдсан</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-amber-50 p-3">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {warehouses.filter((w) => !w.organizations?.length).length}
              </p>
              <p className="text-sm text-slate-500">Хуваарилаагүй</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warehouses Grid */}
      {filteredWarehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <Warehouse className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-lg font-semibold text-slate-600">
            Агуулах олдсонгүй
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {searchTerm ? "Хайлтын үр дүн олдсонгүй" : "Шинэ агуулах нэмнэ үү"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredWarehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              className="relative rounded-2xl border border-slate-100 bg-white p-6 transition-all hover:border-slate-200 hover:shadow-md"
            >
              {/* Dropdown Menu */}
              <div className="absolute right-4 top-4">
                <button
                  onClick={() =>
                    setOpenDropdownId(
                      openDropdownId === warehouse.id ? null : warehouse.id,
                    )
                  }
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {openDropdownId === warehouse.id && (
                  <div className="absolute right-0 top-8 z-10 w-48 rounded-xl border border-slate-100 bg-white py-2 shadow-lg">
                    <button
                      onClick={() => {
                        setOpenDropdownId(null);
                        router.push(`/warehouses/${warehouse.id}`);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <Eye className="h-4 w-4" />
                      Дэлгэрэнгүй
                    </button>
                    <button
                      onClick={() => openEditModal(warehouse)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <Edit className="h-4 w-4" />
                      Засах
                    </button>
                    <button
                      onClick={() => openAssignModal(warehouse)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <Building2 className="h-4 w-4" />
                      Хуваарилах
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => openDeleteConfirm(warehouse)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Устгах
                    </button>
                  </div>
                )}
              </div>

              {/* Warehouse Info */}
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-[#5B4CFF]/10 p-3">
                  <Warehouse className="h-6 w-6 text-[#5B4CFF]" />
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <h3
                    onClick={() => router.push(`/warehouses/${warehouse.id}`)}
                    className="font-bold text-slate-900 truncate cursor-pointer hover:text-[#5B4CFF] transition-colors"
                  >
                    {warehouse.name}
                  </h3>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-start gap-2 text-sm text-slate-500">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{warehouse.address}</span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {warehouse.city}, {warehouse.district}
                    </p>
                    {warehouse.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Phone className="h-4 w-4" />
                        <span>{warehouse.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assigned Organization */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                {warehouse.organizations?.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-slate-400 uppercase">
                      Хуваарилагдсан ({warehouse.organizations.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {warehouse.organizations.map((org) => (
                        <span
                          key={org.id}
                          className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                        >
                          <Building2 className="h-3 w-3" />
                          {org.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-amber-600">
                      Хуваарилаагүй
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                Шинэ агуулах үүсгэх
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Нэр <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Агуулахын нэр"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Хаяг <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Дэлгэрэнгүй хаяг"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Хот/Аймаг
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Улаанбаатар"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Дүүрэг/Сум
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) =>
                      setFormData({ ...formData, district: e.target.value })
                    }
                    placeholder="Баянзүрх"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Утасны дугаар
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="9900 0000"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Болих
              </button>
              <button
                onClick={handleCreateWarehouse}
                disabled={
                  !formData.name.trim() ||
                  !formData.address.trim() ||
                  isSubmitting
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#5B4CFF] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#5B4CFF]/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Үүсгэх
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                Агуулах засах
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Нэр <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Агуулахын нэр"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Хаяг <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Дэлгэрэнгүй хаяг"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Хот/Аймаг
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Улаанбаатар"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Дүүрэг/Сум
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) =>
                      setFormData({ ...formData, district: e.target.value })
                    }
                    placeholder="Баянзүрх"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Утасны дугаар
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="9900 0000"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Болих
              </button>
              <button
                onClick={handleEditWarehouse}
                disabled={
                  !formData.name.trim() ||
                  !formData.address.trim() ||
                  isSubmitting
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#5B4CFF] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#5B4CFF]/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                Агуулах хуваарилах
              </h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedOrgIds([]);
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">
                    {selectedWarehouse.name}
                  </span>{" "}
                  агуулахыг vendor-уудад хуваарилах (олон сонголт)
                </p>
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  Vendor сонгох ({selectedOrgIds.length} сонгогдсон)
                </label>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {organizations.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500 text-center">
                      Vendor олдсонгүй
                    </p>
                  ) : (
                    organizations.map((org) => {
                      const isSelected = selectedOrgIds.includes(org.id);
                      return (
                        <label
                          key={org.id}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            isSelected ? "bg-[#5B4CFF]/5" : "hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                              isSelected
                                ? "border-[#5B4CFF] bg-[#5B4CFF]"
                                : "border-slate-300"
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedOrgIds(
                                  selectedOrgIds.filter((id) => id !== org.id),
                                );
                              } else {
                                setSelectedOrgIds([...selectedOrgIds, org.id]);
                              }
                            }}
                            className="sr-only"
                          />
                          <span
                            className={`text-sm ${isSelected ? "font-medium text-[#5B4CFF]" : "text-slate-700"}`}
                          >
                            {org.name}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedOrgIds([]);
                }}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Болих
              </button>
              <button
                onClick={handleAssignWarehouse}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#5B4CFF] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#5B4CFF]/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Агуулах устгах
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-semibold">{selectedWarehouse.name}</span>{" "}
                агуулахыг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах
                боломжгүй.
              </p>
            </div>

            <div className="flex justify-center gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedWarehouse(null);
                }}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Болих
              </button>
              <button
                onClick={handleDeleteWarehouse}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Устгах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
