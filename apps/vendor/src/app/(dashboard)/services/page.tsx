"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  ClipboardList,
  Loader2,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  X,
  FileText,
  Camera,
  Scale,
  GraduationCap,
  Users,
  Megaphone,
  HelpCircle,
} from "lucide-react";
import { API } from "@/lib/api";

type ServiceRequestType =
  | "POSTER_DESIGN"
  | "PRODUCT_PHOTOSHOOT"
  | "LEGAL_CONSULTATION"
  | "TRAINING"
  | "HR_SERVICE"
  | "MARKETING"
  | "OTHER";

type ServiceRequestStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

interface ServiceRequest {
  id: string;
  type: ServiceRequestType;
  title: string;
  description: string;
  status: ServiceRequestStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  organization: {
    id: string;
    name: string;
  };
  requestedBy: {
    id: string;
    name: string;
  };
}

interface ServiceType {
  value: ServiceRequestType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const serviceTypes: ServiceType[] = [
  {
    value: "POSTER_DESIGN",
    label: "Постер дизайн",
    description: "Сурталчилгааны постер, баннер дизайн захиалах",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    value: "PRODUCT_PHOTOSHOOT",
    label: "Бүтээгдэхүүний зураг авалт",
    description: "Бүтээгдэхүүний мэргэжлийн зураг авахуулах",
    icon: <Camera className="h-5 w-5" />,
  },
  {
    value: "LEGAL_CONSULTATION",
    label: "Хуулийн зөвлөгөө",
    description: "Холбооны хуульчаас зөвлөгөө авах",
    icon: <Scale className="h-5 w-5" />,
  },
  {
    value: "TRAINING",
    label: "Сургалт",
    description: "Мэргэжлийн сургалтанд хамрагдах",
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    value: "HR_SERVICE",
    label: "Хүний нөөц",
    description: "Хүний нөөцийн үйлчилгээ захиалах",
    icon: <Users className="h-5 w-5" />,
  },
  {
    value: "MARKETING",
    label: "Маркетинг",
    description: "Маркетингийн үйлчилгээ захиалах",
    icon: <Megaphone className="h-5 w-5" />,
  },
  {
    value: "OTHER",
    label: "Бусад",
    description: "Бусад үйлчилгээний хүсэлт",
    icon: <HelpCircle className="h-5 w-5" />,
  },
];

const statusConfig: Record<
  ServiceRequestStatus,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "Хүлээгдэж буй",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    icon: <Clock className="h-4 w-4" />,
  },
  IN_PROGRESS: {
    label: "Хийгдэж байгаа",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  COMPLETED: {
    label: "Дууссан",
    color: "text-green-600",
    bgColor: "bg-green-50",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  CANCELLED: {
    label: "Цуцлагдсан",
    color: "text-red-600",
    bgColor: "bg-red-50",
    icon: <XCircle className="h-4 w-4" />,
  },
};

export default function VendorServicesPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    ServiceRequestStatus | "ALL"
  >("ALL");

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedType, setSelectedType] = useState<ServiceRequestType | null>(
    null
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail modal state
  const [selectedRequest, setSelectedRequest] =
    useState<ServiceRequest | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const storedUser = JSON.parse(
        localStorage.getItem("vendor_user") || "{}"
      );
      if (!storedUser.organizationId) {
        console.error("No organization found");
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${API}/service-requests/organization/${storedUser.organizationId}`
      );
      if (response.ok) {
        const data = await response.json();
        setRequests(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch service requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!selectedType || !title.trim()) return;

    setIsSubmitting(true);
    try {
      const storedUser = JSON.parse(
        localStorage.getItem("vendor_user") || "{}"
      );

      const response = await fetch(`${API}/service-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          title: title.trim(),
          description: description.trim(),
          organizationId: storedUser.organizationId,
          requestedById: storedUser.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create request");
      }

      setShowCreateModal(false);
      setSelectedType(null);
      setTitle("");
      setDescription("");
      fetchRequests();
    } catch (error) {
      console.error("Failed to create service request:", error);
      alert("Хүсэлт үүсгэхэд алдаа гарлаа");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getTypeInfo = (type: ServiceRequestType) => {
    return (
      serviceTypes.find((t) => t.value === type) || {
        label: type,
        icon: <HelpCircle className="h-5 w-5" />,
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFAD02]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Үйлчилгээний хүсэлт
          </h1>
          <p className="text-sm text-slate-500">
            Холбооноос үйлчилгээ захиалах
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#FFAD02] px-5 py-3 text-sm font-bold text-black transition-all hover:bg-[#FFAD02]/90 hover:shadow-lg"
        >
          <Plus className="h-5 w-5" />
          Шинэ хүсэлт
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Хайх..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#FFAD02] focus:outline-none focus:ring-2 focus:ring-[#FFAD02]/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ServiceRequestStatus | "ALL")
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-[#FFAD02] focus:outline-none focus:ring-2 focus:ring-[#FFAD02]/20"
        >
          <option value="ALL">Бүх төлөв</option>
          <option value="PENDING">Хүлээгдэж буй</option>
          <option value="IN_PROGRESS">Хийгдэж байгаа</option>
          <option value="COMPLETED">Дууссан</option>
          <option value="CANCELLED">Цуцлагдсан</option>
        </select>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <ClipboardList className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-lg font-semibold text-slate-600">
            Хүсэлт олдсонгүй
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {searchTerm || statusFilter !== "ALL"
              ? "Хайлтын үр дүн олдсонгүй"
              : "Шинэ хүсэлт үүсгэнэ үү"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const typeInfo = getTypeInfo(request.type);
            const status = statusConfig[request.status];

            return (
              <div
                key={request.id}
                onClick={() => setSelectedRequest(request)}
                className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition-all hover:border-[#FFAD02]/30 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-[#FFAD02]/10 group-hover:text-[#FFAD02]">
                  {typeInfo.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {request.title}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.color} ${status.bgColor}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 truncate">
                    {typeInfo.label} •{" "}
                    {new Date(request.createdAt).toLocaleDateString("mn-MN")}
                  </p>
                </div>

                <ChevronRight className="h-5 w-5 text-slate-300 transition-colors group-hover:text-[#FFAD02]" />
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                Шинэ хүсэлт үүсгэх
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedType(null);
                  setTitle("");
                  setDescription("");
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              {/* Service Type Selection */}
              <div className="mb-6">
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  Үйлчилгээний төрөл
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {serviceTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSelectedType(type.value)}
                      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                        selectedType === type.value
                          ? "border-[#FFAD02] bg-[#FFAD02]/10 ring-2 ring-[#FFAD02]/20"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`mt-0.5 ${
                          selectedType === type.value
                            ? "text-[#FFAD02]"
                            : "text-slate-400"
                        }`}
                      >
                        {type.icon}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            selectedType === type.value
                              ? "text-[#FFAD02]"
                              : "text-slate-700"
                          }`}
                        >
                          {type.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {type.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Гарчиг <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Хүсэлтийн гарчиг"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#FFAD02] focus:outline-none focus:ring-2 focus:ring-[#FFAD02]/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Тайлбар
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Хүсэлтийн дэлгэрэнгүй тайлбар..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#FFAD02] focus:outline-none focus:ring-2 focus:ring-[#FFAD02]/20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedType(null);
                  setTitle("");
                  setDescription("");
                }}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Болих
              </button>
              <button
                onClick={handleCreateRequest}
                disabled={!selectedType || !title.trim() || isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FFAD02] px-5 py-2.5 text-sm font-bold text-black transition-all hover:bg-[#FFAD02]/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Илгээх
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                Хүсэлтийн дэлгэрэнгүй
              </h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                    statusConfig[selectedRequest.status].color
                  } ${statusConfig[selectedRequest.status].bgColor}`}
                >
                  {statusConfig[selectedRequest.status].icon}
                  {statusConfig[selectedRequest.status].label}
                </span>
              </div>

              {/* Type */}
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Үйлчилгээний төрөл
                </p>
                <div className="flex items-center gap-2 text-slate-700">
                  {getTypeInfo(selectedRequest.type).icon}
                  <span className="font-medium">
                    {getTypeInfo(selectedRequest.type).label}
                  </span>
                </div>
              </div>

              {/* Title */}
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Гарчиг
                </p>
                <p className="text-slate-900 font-semibold">
                  {selectedRequest.title}
                </p>
              </div>

              {/* Description */}
              {selectedRequest.description && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                    Тайлбар
                  </p>
                  <p className="text-slate-700">{selectedRequest.description}</p>
                </div>
              )}

              {/* Admin Notes */}
              {selectedRequest.adminNotes && (
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">
                    Админы тэмдэглэл
                  </p>
                  <p className="text-blue-800">{selectedRequest.adminNotes}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                    Үүсгэсэн огноо
                  </p>
                  <p className="text-slate-700 text-sm">
                    {new Date(selectedRequest.createdAt).toLocaleDateString(
                      "mn-MN",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                    Шинэчилсэн
                  </p>
                  <p className="text-slate-700 text-sm">
                    {new Date(selectedRequest.updatedAt).toLocaleDateString(
                      "mn-MN",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Хаах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
