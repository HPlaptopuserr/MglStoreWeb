"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Warehouse,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  Search,
  X,
  ChevronRight,
  Building2,
  User,
  Phone,
  MapPin,
  Filter,
  RefreshCw,
  CreditCard,
  Receipt,
  Ban,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

type StockRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED";

type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";

type StockRequestItem = {
  id: string;
  productId: string;
  quantity: number;
  approvedQuantity: number | null;
  note: string | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    price: string;
    images: { url: string }[];
  };
};

type Payment = {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  paidAmount: string;
  status: PaymentStatus;
  paidAt: string | null;
  dueDate: string | null;
  transactionId: string | null;
  createdAt: string;
  request?: {
    id: string;
    requestNumber: string;
    status: StockRequestStatus;
  };
};

type StockRequest = {
  id: string;
  requestNumber: string;
  status: StockRequestStatus;
  note: string | null;
  deliveryAddress: string | null;
  deliveryPhone: string | null;
  requestedAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  reviewNote: string | null;
  organization: { id: string; name: string };
  warehouse: { id: string; name: string; address: string; city: string };
  requestedBy: {
    id: string;
    email: string;
    profile: { fullName: string } | null;
  };
  items: StockRequestItem[];
  payment?: Payment;
  dispatch?: {
    id: string;
    dispatchNumber: string;
    status: "PENDING" | "CONFIRMED" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
  } | null;
};

const statusConfig: Record<
  StockRequestStatus,
  { label: string; color: string; icon: typeof Clock; bgColor: string }
> = {
  PENDING: {
    label: "Хүлээгдэж буй",
    color: "text-amber-600",
    icon: Clock,
    bgColor: "bg-amber-50",
  },
  APPROVED: {
    label: "Зөвшөөрөгдсөн",
    color: "text-green-600",
    icon: CheckCircle,
    bgColor: "bg-green-50",
  },
  REJECTED: {
    label: "Татгалзсан",
    color: "text-red-600",
    icon: XCircle,
    bgColor: "bg-red-50",
  },
  PROCESSING: {
    label: "Боловсруулж буй",
    color: "text-blue-600",
    icon: Truck,
    bgColor: "bg-blue-50",
  },
  COMPLETED: {
    label: "Дууссан",
    color: "text-slate-600",
    icon: CheckCircle,
    bgColor: "bg-slate-100",
  },
  CANCELLED: {
    label: "Цуцлагдсан",
    color: "text-slate-400",
    icon: XCircle,
    bgColor: "bg-slate-50",
  },
};

export default function AdminStockRequestsPage() {
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StockRequestStatus | "ALL">(
    "ALL",
  );
  const [searchTerm, setSearchTerm] = useState("");

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StockRequest | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const [approvalAction, setApprovalAction] = useState<
    "approve" | "reject" | null
  >(null);
  const [reviewNote, setReviewNote] = useState("");
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>(
    {},
  );

  // Payment states
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [unpaidPayments, setUnpaidPayments] = useState<Payment[]>([]);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRequests();
    const interval = window.setInterval(() => void fetchRequests(true), 20000);
    return () => window.clearInterval(interval);
  }, [statusFilter]);

  const fetchRequests = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setFetchError(null);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await adminFetch(
        `${API}/stock-requests?${params.toString()}`,
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          body?.message || "Хүсэлтийн жагсаалт авахад алдаа гарлаа",
        );
      }
      setRequests((await res.json()) || []);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      setFetchError(
        error instanceof Error
          ? error.message
          : "Хүсэлтийн жагсаалт авахад алдаа гарлаа",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const openRequestDetail = (request: StockRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
    setApprovalAction(null);
    setReviewNote("");
    setApprovalError(null);
    // Initialize item quantities with requested quantities
    const quantities: Record<string, number> = {};
    request.items.forEach((item) => {
      quantities[item.id] = item.quantity;
    });
    setItemQuantities(quantities);
    // Fetch payment history for this organization
    fetchPaymentHistory(request.organization.id, request.payment?.id);
  };

  const fetchPaymentHistory = async (
    organizationId: string,
    currentPaymentId?: string,
  ) => {
    setLoadingPayments(true);
    try {
      const res = await adminFetch(
        `${API}/stock-requests/payments/organization/${organizationId}`,
      );
      if (res.ok) {
        const payments: Payment[] = await res.json();
        setPaymentHistory(payments);
        // Find unpaid payments (excluding current one)
        const unpaid = payments.filter(
          (p) =>
            (p.status === "PENDING" || p.status === "FAILED") &&
            p.id !== currentPaymentId,
        );
        setUnpaidPayments(unpaid);
      }
    } catch (error) {
      console.error("Failed to fetch payment history:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    setApprovalError(null);
    try {
      const items = selectedRequest.items.map((item) => ({
        productId: item.productId,
        approvedQuantity: itemQuantities[item.id] || 0,
      }));

      const response = await adminFetch(
        `${API}/stock-requests/${selectedRequest.id}/approve`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewNote: reviewNote || null,
            items,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        if (error.unpaidPayments) {
          setApprovalError(error.message);
          return;
        }
        throw new Error(error.message || "Failed to approve");
      }

      setShowDetailModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      alert(error.message || "Зөвшөөрөхөд алдаа гарлаа");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!reviewNote.trim()) {
      alert("Татгалзсан шалтгаан оруулна уу");
      return;
    }
    setIsProcessing(true);
    try {
      const response = await adminFetch(
        `${API}/stock-requests/${selectedRequest.id}/reject`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewNote }),
        },
      );

      if (!response.ok) throw new Error("Failed to reject");

      setShowDetailModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      alert("Татгалзахад алдаа гарлаа");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcess = async (requestId: string) => {
    try {
      const response = await adminFetch(
        `${API}/stock-requests/${requestId}/process`,
        {
          method: "PATCH",
        },
      );
      if (!response.ok) throw new Error("Failed");
      fetchRequests();
    } catch (error) {
      alert("Боловсруулж эхлэхэд алдаа гарлаа");
    }
  };

  const handleComplete = async (requestId: string) => {
    if (!confirm("Хүсэлтийг дуусгах уу? Агуулахаас бараа татагдана.")) return;
    try {
      const response = await adminFetch(
        `${API}/stock-requests/${requestId}/complete`,
        {
          method: "PATCH",
        },
      );
      if (!response.ok) throw new Error("Failed");
      fetchRequests();
    } catch (error) {
      alert("Дуусгахад алдаа гарлаа");
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !req.requestNumber.toLowerCase().includes(search) &&
        !req.organization.name.toLowerCase().includes(search) &&
        !req.warehouse.name.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  if (loading && requests.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Бараа татах хүсэлт
          </h1>
          <p className="text-sm text-slate-500">
            Vendor-ийн агуулахаас бараа татах хүсэлтүүд
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchRequests()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Шинэчлэх
        </button>
      </div>

      {fetchError && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={() => void fetchRequests()}
            className="shrink-0 underline underline-offset-2 hover:text-red-900"
          >
            Дахин оролдох
          </button>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl  bg-[#5B4CFF]/10 border border-[#5B4CFF]/10 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {pendingCount} хүлээгдэж буй хүсэлт байна
            </p>
            <p className="text-sm text-amber-600 mt-0.5">
              Зөвшөөрөх эсвэл татгалзах шийдвэр гаргана уу
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          {
            status: "PENDING",
            label: "Хүлээгдэж буй",
            icon: Clock,
            bg: "bg-amber-50",
            color: "text-amber-600",
          },
          {
            status: "APPROVED",
            label: "Зөвшөөрөгдсөн",
            icon: CheckCircle,
            bg: "bg-green-50",
            color: "text-green-600",
          },
          {
            status: "PROCESSING",
            label: "Боловсруулж буй",
            icon: Truck,
            bg: "bg-blue-50",
            color: "text-blue-600",
          },
          {
            status: "COMPLETED",
            label: "Дууссан",
            icon: Package,
            bg: "bg-slate-100",
            color: "text-slate-600",
          },
          {
            status: "REJECTED",
            label: "Татгалзсан",
            icon: XCircle,
            bg: "bg-red-50",
            color: "text-red-600",
          },
        ].map(({ status, label, icon: Icon, bg, color }) => (
          <button
            key={status}
            onClick={() =>
              setStatusFilter(
                statusFilter === status
                  ? "ALL"
                  : (status as StockRequestStatus),
              )
            }
            className={`rounded-xl border p-4 text-left transition-all ${
              statusFilter === status
                ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                : "border-slate-100 bg-white hover:border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg ${bg} p-2`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {requests.filter((r) => r.status === status).length}
                </p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Хайх (дугаар, байгууллага, агуулах)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        {statusFilter !== "ALL" && (
          <button
            onClick={() => setStatusFilter("ALL")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Шүүлт арилгах
          </button>
        )}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <Package className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-lg font-semibold text-slate-600">
            Хүсэлт олдсонгүй
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {statusFilter !== "ALL"
              ? "Шүүлтийг арилгаж оролдоно уу"
              : "Одоогоор хүсэлт байхгүй"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const config = statusConfig[request.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={request.id}
                className={`rounded-xl border bg-white p-5 transition-all hover:shadow-md ${
                  request.status === "PENDING"
                    ? "border-amber-200"
                    : "border-slate-100"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`rounded-lg p-3 ${request.status === "PENDING" ? "bg-amber-100" : "bg-slate-100"}`}
                    >
                      <Warehouse
                        className={`h-6 w-6 ${request.status === "PENDING" ? "text-amber-600" : "text-slate-500"}`}
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">
                          {request.requestNumber}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.bgColor} ${config.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {request.organization.name}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <Warehouse className="h-4 w-4 text-slate-400" />
                          {request.warehouse.name}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <User className="h-4 w-4 text-slate-400" />
                          {request.requestedBy.profile?.fullName ||
                            request.requestedBy.email}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-slate-500">
                        {request.items.length} төрөл •{" "}
                        {request.items.reduce((sum, i) => sum + i.quantity, 0)}{" "}
                        ширхэг
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-500">
                      {new Date(request.requestedAt).toLocaleDateString(
                        "mn-MN",
                      )}
                    </span>

                    {request.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => openRequestDetail(request)}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                        >
                          Шийдвэрлэх
                        </button>
                      </>
                    )}

                    {request.status === "APPROVED" && !request.dispatch && (
                      <button
                        onClick={() => handleProcess(request.id)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Боловсруулж эхлэх
                      </button>
                    )}

                    {request.status === "APPROVED" && request.dispatch && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                        <Warehouse className="h-4 w-4" />
                        Агуулах руу илгээсэн
                      </span>
                    )}

                    {request.status === "PROCESSING" && !request.dispatch && (
                      <button
                        onClick={() => handleComplete(request.id)}
                        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
                      >
                        Дуусгах
                      </button>
                    )}

                    {request.status === "PROCESSING" && request.dispatch && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
                        <Truck className="h-4 w-4" />
                        Агуулах боловсруулж байна
                      </span>
                    )}

                    <button
                      onClick={() => openRequestDetail(request)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail/Approval Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedRequest.requestNumber}
                </h2>
                <p className="text-sm text-slate-500">
                  {new Date(selectedRequest.requestedAt).toLocaleString(
                    "mn-MN",
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRequest(null);
                  setApprovalAction(null);
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              {(() => {
                const config = statusConfig[selectedRequest.status];
                const StatusIcon = config.icon;
                return (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${config.bgColor} ${config.color}`}
                  >
                    <StatusIcon className="h-4 w-4" />
                    {config.label}
                  </span>
                );
              })()}

              {/* Organization & Warehouse */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase">
                    Байгууллага
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedRequest.organization.name}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase">
                    Агуулах
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedRequest.warehouse.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedRequest.warehouse.city}
                  </p>
                </div>
              </div>

              {/* Requester & Delivery */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>
                    {selectedRequest.requestedBy.profile?.fullName ||
                      selectedRequest.requestedBy.email}
                  </span>
                </div>
                {selectedRequest.deliveryAddress && (
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{selectedRequest.deliveryAddress}</span>
                  </div>
                )}
                {selectedRequest.deliveryPhone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{selectedRequest.deliveryPhone}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Барааны жагсаалт ({selectedRequest.items.length})
                </p>
                <div className="space-y-2">
                  {selectedRequest.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-100 p-3"
                    >
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-slate-800">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.product.sku || "-"}
                        </p>
                      </div>
                      {selectedRequest.status === "PENDING" &&
                      approvalAction === "approve" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            Хүссэн: {item.quantity}
                          </span>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={itemQuantities[item.id] || 0}
                            onChange={(e) =>
                              setItemQuantities({
                                ...itemQuantities,
                                [item.id]: Math.min(
                                  parseInt(e.target.value) || 0,
                                  item.quantity,
                                ),
                              })
                            }
                            className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-center text-sm"
                          />
                        </div>
                      ) : (
                        <div className="text-right">
                          <p className="font-semibold text-slate-800">
                            {item.approvedQuantity ?? item.quantity} ш
                          </p>
                          {item.approvedQuantity &&
                            item.approvedQuantity !== item.quantity && (
                              <p className="text-xs text-slate-400 line-through">
                                {item.quantity} ш
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedRequest.note && (
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Хүсэлт гаргагчийн тэмдэглэл
                  </p>
                  <p className="mt-1 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                    {selectedRequest.note}
                  </p>
                </div>
              )}

              {/* Review Note (for decided requests) */}
              {selectedRequest.reviewNote &&
                selectedRequest.status !== "PENDING" && (
                  <div
                    className={`rounded-lg p-4 ${
                      selectedRequest.status === "REJECTED"
                        ? "bg-red-50"
                        : "bg-blue-50"
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        selectedRequest.status === "REJECTED"
                          ? "text-red-800"
                          : "text-blue-800"
                      }`}
                    >
                      Админы тэмдэглэл
                    </p>
                    <p
                      className={`mt-1 text-sm ${
                        selectedRequest.status === "REJECTED"
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      {selectedRequest.reviewNote}
                    </p>
                  </div>
                )}

              {/* Current Payment Info */}
              {selectedRequest.payment && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt className="h-5 w-5 text-slate-600" />
                    <p className="font-semibold text-slate-800">
                      Энэ хүсэлтийн нэхэмжлэх
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">Нэхэмжлэх №</p>
                      <p className="font-medium">
                        {selectedRequest.payment.invoiceNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Дүн</p>
                      <p className="font-bold text-lg">
                        {Number(
                          selectedRequest.payment.totalAmount,
                        ).toLocaleString()}
                        ₮
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Төлөв</p>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          selectedRequest.payment.status === "PAID"
                            ? "bg-green-100 text-green-700"
                            : selectedRequest.payment.status === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {selectedRequest.payment.status === "PAID" && (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        {selectedRequest.payment.status === "PENDING" && (
                          <Clock className="h-3 w-3" />
                        )}
                        {selectedRequest.payment.status === "PAID"
                          ? "Төлөгдсөн"
                          : selectedRequest.payment.status === "PENDING"
                            ? "Хүлээгдэж буй"
                            : "Цуцлагдсан"}
                      </span>
                    </div>
                    {selectedRequest.payment.dueDate && (
                      <div>
                        <p className="text-slate-500">Төлөх хугацаа</p>
                        <p className="font-medium">
                          {new Date(
                            selectedRequest.payment.dueDate,
                          ).toLocaleDateString("mn-MN")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment History */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-slate-600" />
                    <p className="font-semibold text-slate-800">
                      Төлбөрийн түүх
                    </p>
                  </div>
                  {unpaidPayments.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                      <Ban className="h-3 w-3" />
                      {unpaidPayments.length} төлөгдөөгүй
                    </span>
                  )}
                </div>

                {loadingPayments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Төлбөрийн түүх байхгүй
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {paymentHistory.map((payment) => (
                      <div
                        key={payment.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          payment.status === "PENDING" ||
                          payment.status === "FAILED"
                            ? "border-amber-200 bg-amber-50"
                            : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <div>
                          <p className="font-medium text-slate-800 text-sm">
                            {payment.invoiceNumber}
                          </p>
                          <p className="text-xs text-slate-500">
                            {payment.request?.requestNumber} •{" "}
                            {new Date(payment.createdAt).toLocaleDateString(
                              "mn-MN",
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800">
                            {Number(payment.totalAmount).toLocaleString()}₮
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${
                              payment.status === "PAID"
                                ? "text-green-600"
                                : payment.status === "PENDING"
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }`}
                          >
                            {payment.status === "PAID" && (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            {payment.status === "PENDING" && (
                              <Clock className="h-3 w-3" />
                            )}
                            {payment.status === "PAID"
                              ? "Төлөгдсөн"
                              : payment.status === "PENDING"
                                ? "Хүлээгдэж буй"
                                : "Алдаатай"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Approval Actions */}
              {selectedRequest.status === "PENDING" && (
                <div className="border-t border-slate-100 pt-6">
                  {/* Approval Error */}
                  {approvalError && (
                    <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{approvalError}</p>
                    </div>
                  )}

                  {!approvalAction ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setApprovalAction("approve")}
                        className="flex-1 rounded-lg bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700"
                      >
                        Зөвшөөрөх
                      </button>
                      <button
                        onClick={() => setApprovalAction("reject")}
                        className="flex-1 rounded-lg bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700"
                      >
                        Татгалзах
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          {approvalAction === "approve"
                            ? "Тэмдэглэл (заавал биш)"
                            : "Татгалзсан шалтгаан *"}
                        </label>
                        <textarea
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder={
                            approvalAction === "approve"
                              ? "Нэмэлт тэмдэглэл..."
                              : "Татгалзсан шалтгаанаа бичнэ үү..."
                          }
                          rows={3}
                          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                        />
                      </div>

                      {approvalAction === "approve" && (
                        <div className="rounded-lg bg-green-50 p-3">
                          <p className="text-sm text-green-700">
                            Нийт зөвшөөрөх:{" "}
                            {Object.values(itemQuantities).reduce(
                              (sum, q) => sum + q,
                              0,
                            )}{" "}
                            ширхэг
                          </p>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => setApprovalAction(null)}
                          className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Буцах
                        </button>
                        <button
                          onClick={
                            approvalAction === "approve"
                              ? handleApprove
                              : handleReject
                          }
                          disabled={isProcessing}
                          className={`flex-1 rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-50 ${
                            approvalAction === "approve"
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 mx-auto animate-spin" />
                          ) : approvalAction === "approve" ? (
                            "Зөвшөөрөх"
                          ) : (
                            "Татгалзах"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
