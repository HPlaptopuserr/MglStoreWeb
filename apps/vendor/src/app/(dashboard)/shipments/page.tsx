"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Package,
  Warehouse as WarehouseIcon,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  Phone,
  MapPin,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  ShoppingCart,
  Minus,
  Plus,
  ArrowLeft,
  Boxes,
  Tag,
  Receipt,
  CreditCard,
  Printer,
  Sparkles,
  TrendingUp,
  Upload,
  FileImage,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { API, API_BASE, authFetch } from "@/lib/api";
import { useInfiniteScroll } from "@mgl/ui";
import { StockSuggestionBanner } from "@/components/organisms/StockSuggestionBanner";
import { RequestFilter } from "@/components/organisms/RequestFilter";

type StockRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED";

type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";

type Payment = {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  paidAmount: string;
  status: PaymentStatus;
  paidAt: string | null;
  dueDate: string | null;
  createdAt: string;
  request?: {
    id: string;
    requestNumber: string;
    status: StockRequestStatus;
    warehouse?: {
      id: string;
      name: string;
    };
    items?: {
      id: string;
      quantity: number;
      approvedQuantity: number | null;
      product: {
        id: string;
        name: string;
        sku: string | null;
        price: string;
        images?: { url: string }[];
      };
    }[];
  };
  organization?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
  };
};

type OutstandingPaymentSummary = {
  count: number;
  totalUnpaid: number;
  payments: Array<{
    id: string;
    invoiceNumber: string;
    requestNumber: string;
    outstandingAmount: number;
    status: PaymentStatus;
  }>;
};

type WarehouseInventoryItem = {
  id: string;
  quantity: number;
  minQuantity: number;
  location: string | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    price: string;
    images: { url: string }[];
    category: { id: string; name: string } | null;
    businessCategory?: { id: string; name: string } | null;
  };
};

type WarehouseProductsPage = {
  items: WarehouseInventoryItem[];
  total: number;
  hasMore: boolean;
};

const WAREHOUSE_PRODUCTS_PAGE_SIZE = 30;

function readWarehouseProductsPage(
  payload: unknown,
  page: number,
  limit: number,
): WarehouseProductsPage {
  if (Array.isArray(payload)) {
    return {
      items: payload as WarehouseInventoryItem[],
      total: payload.length,
      hasMore: false,
    };
  }
  if (typeof payload !== "object" || payload === null) {
    return { items: [], total: 0, hasMore: false };
  }

  const record = payload as Record<string, unknown>;
  const items = Array.isArray(record.items)
    ? (record.items as WarehouseInventoryItem[])
    : [];
  const total =
    typeof record.total === "number" ? record.total : items.length;
  const hasMore =
    typeof record.hasMore === "boolean"
      ? record.hasMore
      : page * limit < total;

  return { items, total, hasMore };
}

const PADAAN_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const PADAAN_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function resolveAssetUrl(url?: string | null) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return url.startsWith("/") ? `${API_BASE}${url}` : url;
}

function isLikelyImageUrl(url?: string | null) {
  if (!url) return false;
  return (
    /^data:image\//i.test(url) ||
    /\.(png|jpe?g|webp|gif)(\?.*)?(#.*)?$/i.test(url)
  );
}

type Warehouse = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  phone: string | null;
};

type SuggestedStockItem = {
  quantity: number;
  alertThreshold: number;
  product: {
    id: string;
  };
};

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
    status: string;
    driverName: string | null;
    driverPhone: string | null;
    vehicleNumber: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
    note: string | null;
    padaanUrl: string | null;
  } | null;
};

type CartItem = {
  productId: string;
  quantity: number;
  name: string;
  sku: string | null;
  price: string;
  available: number;
  image: string | null;
};

type ViewMode = "warehouses" | "browse" | "cart" | "requests" | "payments";

const IS_LOCAL_DEVELOPMENT = process.env.NODE_ENV === "development";

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

type WorkflowSection = "new" | "requests" | "payments";

interface StockRequestWorkflowNavProps {
  active: WorkflowSection;
  pendingRequestCount: number;
  outstandingPaymentCount: number;
  isNewOrderLocked: boolean;
  onNavigate: (section: WorkflowSection) => void;
}

function StockRequestWorkflowNav({
  active,
  pendingRequestCount,
  outstandingPaymentCount,
  isNewOrderLocked,
  onNavigate,
}: StockRequestWorkflowNavProps) {
  const items = [
    {
      key: "new" as const,
      label: "Шинэ захиалга",
      description: isNewOrderLocked ? "Төлбөр хүлээгдэж байна" : "Бараа сонгох",
      icon: Package,
      count: 0,
      warning: isNewOrderLocked,
    },
    {
      key: "requests" as const,
      label: "Захиалгын түүх",
      description: "Явц, хүргэлт",
      icon: Clock,
      count: pendingRequestCount,
      warning: false,
    },
    {
      key: "payments" as const,
      label: "Төлбөрийн түүх",
      description: "Нэхэмжлэх, үлдэгдэл",
      icon: CreditCard,
      count: outstandingPaymentCount,
      warning: outstandingPaymentCount > 0,
    },
  ];

  return (
    <nav
      aria-label="Бараа таталтын үндсэн хэсгүүд"
      className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-3"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = active === item.key;

        return (
          <button
            key={item.key}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate(item.key)}
            className={`flex min-h-16 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFAD02] focus-visible:ring-offset-2 ${
              isActive
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                isActive
                  ? "bg-white/10 text-[#FFAD02]"
                  : item.warning
                    ? "bg-red-50 text-red-600"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase tracking-wider opacity-60">
                Алхам {index + 1}
              </span>
              <span className="block truncate text-sm font-bold">
                {item.label}
              </span>
              <span className="block truncate text-xs opacity-60">
                {item.description}
              </span>
            </span>
            {item.count > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-black ${
                  item.warning
                    ? "bg-red-100 text-red-700"
                    : isActive
                      ? "bg-white/10 text-white"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default function StockRequestsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("warehouses");
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(
    null,
  );
  const [warehouseProducts, setWarehouseProducts] = useState<
    WarehouseInventoryItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsLoadingMore, setProductsLoadingMore] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsPage, setProductsPage] = useState(1);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsHasMore, setProductsHasMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [note, setNote] = useState("");

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StockRequest | null>(
    null,
  );
  const [savingPadaan, setSavingPadaan] = useState(false);
  const padaanFileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Payment history states
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [outstandingPayments, setOutstandingPayments] =
    useState<OutstandingPaymentSummary | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loadingPaymentDetail, setLoadingPaymentDetail] = useState(false);
  const [markingPaymentPaid, setMarkingPaymentPaid] = useState(false);

  const [filteredRequests, setFilteredRequests] = useState<StockRequest[]>([]);
  const productsRequestRef = useRef<AbortController | null>(null);
  const skipNextProductsFilterEffectRef = useRef(false);

  const [user, setUser] = useState<{
    id: string;
    organizationId: string;
  } | null>(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("vendor_user") || "{}");
    if (storedUser.id && storedUser.organizationId) {
      setUser(storedUser);
    }
  }, []);

  useEffect(() => {
    if (user?.organizationId) fetchData();
  }, [user?.organizationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [requestsRes, warehousesRes, outstandingRes] = await Promise.all([
        authFetch(
          `${API}/stock-requests?organizationId=${user?.organizationId}`,
        ),
        authFetch(
          `${API}/warehouses/organization/${user?.organizationId}/order-sources`,
        ),
        authFetch(
          `${API}/stock-requests/payments/unpaid/${user?.organizationId}`,
        ),
      ]);
      if (requestsRes.ok) {
        const reqs = (await requestsRes.json()) || [];
        setRequests(reqs);
        setFilteredRequests(reqs);
      }
      if (warehousesRes.ok) setWarehouses((await warehousesRes.json()) || []);
      if (outstandingRes.ok) {
        setOutstandingPayments(await outstandingRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    if (!user?.organizationId) return;
    try {
      setLoadingPayments(true);
      const res = await authFetch(
        `${API}/stock-requests/payments/organization/${user.organizationId}`,
      );
      if (res.ok) setPaymentHistory((await res.json()) || []);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const openPaymentDetail = async (paymentId: string) => {
    setLoadingPaymentDetail(true);
    setShowPaymentModal(true);
    try {
      const res = await authFetch(
        `${API}/stock-requests/payments/${paymentId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedPayment(data);
      }
    } catch (error) {
      console.error("Failed to fetch payment details:", error);
    } finally {
      setLoadingPaymentDetail(false);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const markPaymentPaidLocally = async () => {
    if (!selectedPayment || selectedPayment.status === "PAID") return;

    setMarkingPaymentPaid(true);
    try {
      const response = await authFetch(
        `${API}/stock-requests/payments/${selectedPayment.id}/dev-mark-paid`,
        { method: "POST" },
      );
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(body.message || "Төлбөр баталгаажуулахад алдаа гарлаа");
      }

      await Promise.all([
        openPaymentDetail(selectedPayment.id),
        fetchPayments(),
        fetchData(),
      ]);
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : "Төлбөр баталгаажуулахад алдаа гарлаа",
      );
    } finally {
      setMarkingPaymentPaid(false);
    }
  };

  useEffect(() => {
    if (viewMode === "payments" && user?.organizationId) {
      fetchPayments();
    }
  }, [viewMode, user?.organizationId]);

  useEffect(() => {
    if (
      viewMode === "warehouses" &&
      outstandingPayments !== null &&
      outstandingPayments.count > 0
    ) {
      setViewMode("payments");
    }
  }, [outstandingPayments, viewMode]);

  const loadWarehouseProducts = useCallback(
    async ({
      warehouse,
      page,
      search,
      category,
      append,
      productIds,
    }: {
      warehouse: Warehouse;
      page: number;
      search: string;
      category: string | null;
      append: boolean;
      productIds?: string[];
    }) => {
      if (!user?.organizationId) {
        setProductsError("Байгууллагын мэдээлэл олдсонгүй");
        return;
      }

      productsRequestRef.current?.abort();
      const controller = new AbortController();
      productsRequestRef.current = controller;
      append ? setProductsLoadingMore(true) : setProductsLoading(true);
      setProductsError(null);

      try {
        const params = new URLSearchParams({
          organizationId: user.organizationId,
          sort: "name",
          mode: "catalog",
          limit: String(WAREHOUSE_PRODUCTS_PAGE_SIZE),
          page: String(page),
        });
        const normalizedSearch = search.trim();
        if (normalizedSearch) params.set("search", normalizedSearch);
        if (category) params.set("category", category);
        if (productIds?.length) params.set("productIds", productIds.join(","));

        const res = await authFetch(
          `${API}/stock-requests/warehouse/${warehouse.id}/products?${params.toString()}`,
          { signal: controller.signal },
        );
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "message" in payload &&
            typeof payload.message === "string"
              ? payload.message
              : "Агуулахын бараа татахад алдаа гарлаа";
          throw new Error(message);
        }

        const result = readWarehouseProductsPage(
          payload,
          page,
          WAREHOUSE_PRODUCTS_PAGE_SIZE,
        );
        setWarehouseProducts((current) => {
          if (!append) return result.items;
          const knownIds = new Set(current.map((item) => item.product.id));
          return [
            ...current,
            ...result.items.filter((item) => !knownIds.has(item.product.id)),
          ];
        });
        setProductsPage(page);
        setProductsTotal(result.total);
        setProductsHasMore(result.hasMore);
        return result;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Failed to fetch warehouse products:", error);
        if (!append) setWarehouseProducts([]);
        setProductsError(
          error instanceof Error
            ? error.message
            : "Агуулахын бараа татахад алдаа гарлаа",
        );
        return null;
      } finally {
        if (productsRequestRef.current === controller) {
          setProductsLoading(false);
          setProductsLoadingMore(false);
        }
      }
    },
    [user?.organizationId],
  );

  const enterWarehouse = async (
    warehouse: Warehouse,
    autoItems?: SuggestedStockItem[],
  ) => {
    if ((outstandingPayments?.count ?? 0) > 0) {
      setViewMode("payments");
      return;
    }

    setSelectedWarehouse(warehouse);
    skipNextProductsFilterEffectRef.current = true;
    setProductsLoading(true);
    setProductsError(null);
    setProductSearch("");
    setSelectedCategory(null);
    setViewMode("browse");
    const result = await loadWarehouseProducts({
      warehouse,
      page: 1,
      search: "",
      category: null,
      append: false,
      productIds: autoItems?.map((item) => item.product.id),
    });

    if (autoItems?.length && result) {
      const suggestionByProductId = new Map(
        autoItems.map((item) => [item.product.id, item]),
      );
      const suggestedCart = result.items.flatMap((item): CartItem[] => {
        const suggestion = suggestionByProductId.get(item.product.id);
        if (!suggestion) return [];
        return [
          {
            productId: item.product.id,
            quantity: Math.max(
              5,
              suggestion.alertThreshold * 2 - suggestion.quantity,
            ),
            name: item.product.name,
            sku: item.product.sku,
            price: item.product.price,
            available: item.quantity,
            image: item.product.images[0]?.url || null,
          },
        ];
      });
      if (suggestedCart.length) {
        setCart(suggestedCart);
        setViewMode("cart");
      }
    }
  };

  const enterWarehouseById = (
    warehouseId: string,
    autoItems?: SuggestedStockItem[],
  ) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    if (warehouse) enterWarehouse(warehouse, autoItems);
  };

  const exitWarehouse = () => {
    productsRequestRef.current?.abort();
    setSelectedWarehouse(null);
    setWarehouseProducts([]);
    setProductsError(null);
    setProductSearch("");
    setSelectedCategory(null);
    setProductsPage(1);
    setProductsTotal(0);
    setProductsHasMore(false);
    setViewMode("warehouses");
  };

  useEffect(() => {
    if (viewMode !== "browse" || !selectedWarehouse) return;
    if (skipNextProductsFilterEffectRef.current) {
      skipNextProductsFilterEffectRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void loadWarehouseProducts({
        warehouse: selectedWarehouse,
        page: 1,
        search: productSearch,
        category: selectedCategory,
        append: false,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    loadWarehouseProducts,
    productSearch,
    selectedCategory,
    selectedWarehouse,
    viewMode,
  ]);

  const addToCart = (item: WarehouseInventoryItem) => {
    const existing = cart.find((c) => c.productId === item.product.id);
    if (existing) {
      if (existing.quantity < item.quantity) {
        setCart(
          cart.map((c) =>
            c.productId === item.product.id
              ? { ...c, quantity: c.quantity + 1 }
              : c,
          ),
        );
      }
    } else {
      setCart([
        ...cart,
        {
          productId: item.product.id,
          quantity: 1,
          name: item.product.name,
          sku: item.product.sku,
          price: item.product.price,
          available: item.quantity,
          image: item.product.images[0]?.url || null,
        },
      ]);
    }
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((c) => c.productId !== productId));
    } else {
      setCart(
        cart.map((c) => (c.productId === productId ? { ...c, quantity } : c)),
      );
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((c) => c.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDeliveryAddress("");
    setDeliveryPhone("");
    setNote("");
  };

  const getCartItemQuantity = (productId: string) => {
    return cart.find((c) => c.productId === productId)?.quantity || 0;
  };

  const handleSubmit = async () => {
    if (!selectedWarehouse || cart.length === 0) {
      alert("Бараа сонгоно уу");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await authFetch(`${API}/stock-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: user?.organizationId,
          warehouseId: selectedWarehouse.id,
          requestedById: user?.id,
          deliveryAddress: deliveryAddress || null,
          deliveryPhone: deliveryPhone || null,
          note: note || null,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });
      if (!response.ok) {
        const responseBody = (await response.json()) as {
          code?: string;
          message?: string;
        };
        if (responseBody.code === "OUTSTANDING_STOCK_PAYMENT") {
          await fetchData();
          setShowConfirmModal(false);
          setViewMode("payments");
          return;
        }
        throw new Error(responseBody.message || "Failed");
      }
      clearCart();
      exitWarehouse();
      fetchData();
      setViewMode("requests");
      alert("Захиалга амжилттай илгээгдлээ. Админ зөвшөөрснөөр идэвхжинэ.");
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : "Захиалга илгээхэд алдаа гарлаа",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!confirm("Захиалгыг цуцлах уу?")) return;
    try {
      const response = await authFetch(
        `${API}/stock-requests/${requestId}/cancel`,
        { method: "PATCH" },
      );
      if (!response.ok) throw new Error("Failed");
      fetchData();
    } catch (error) {
      alert("Захиалга цуцлахад алдаа гарлаа");
    }
  };

  const applyPadaanUpdate = (
    dispatch: NonNullable<StockRequest["dispatch"]>,
  ) => {
    if (!selectedRequest) return;

    const updateRequest = (request: StockRequest): StockRequest =>
      request.id === selectedRequest.id
        ? {
            ...request,
            dispatch: request.dispatch
              ? {
                  ...request.dispatch,
                  ...dispatch,
                }
              : dispatch,
          }
        : request;

    setRequests((current) => current.map(updateRequest));
    setFilteredRequests((current) => current.map(updateRequest));
    setSelectedRequest((current) =>
      current
        ? {
            ...current,
            dispatch: current.dispatch
              ? {
                  ...current.dispatch,
                  ...dispatch,
                }
              : dispatch,
          }
        : current,
    );
  };

  const savePadaanUrl = async (padaanUrl: string, successMessage: string) => {
    if (!selectedRequest) return;
    setSavingPadaan(true);
    try {
      const response = await authFetch(
        `${API}/stock-requests/${selectedRequest.id}/padaan`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ padaanUrl }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Падаан хадгалахад алдаа гарлаа");
      }

      applyPadaanUpdate(payload);
      alert(successMessage);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Падаан хадгалахад алдаа гарлаа",
      );
    } finally {
      setSavingPadaan(false);
    }
  };

  const handlePadaanImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedRequest) return;

    if (!PADAAN_IMAGE_TYPES.has(file.type)) {
      alert("Зөвхөн JPG, PNG, WebP, GIF зураг сонгоно уу");
      event.target.value = "";
      return;
    }

    if (file.size > PADAAN_IMAGE_MAX_BYTES) {
      alert("Падааны зураг 10MB-аас ихгүй байх шаардлагатай");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    setSavingPadaan(true);
    try {
      const response = await authFetch(
        `${API}/stock-requests/${selectedRequest.id}/padaan/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.message || "Падааны зураг upload хийхэд алдаа гарлаа",
        );
      }

      applyPadaanUpdate(payload);
      alert("Падааны зураг хадгалагдлаа");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Падааны зураг upload хийхэд алдаа гарлаа",
      );
    } finally {
      setSavingPadaan(false);
      event.target.value = "";
    }
  };

  const handleClearPadaan = async () => {
    if (!selectedRequest?.dispatch?.padaanUrl) return;
    if (!confirm("Падааны зургийг устгах уу?")) return;
    await savePadaanUrl("", "Падааны зураг устгагдлаа");
  };

  const categories = Array.from(
    new Set(
      (Array.isArray(warehouseProducts) ? warehouseProducts : [])
        .map(
          (product) =>
            product.product.category?.name ||
            product.product.businessCategory?.name,
        )
        .filter(Boolean),
    ),
  ) as string[];

  const filteredProducts = Array.isArray(warehouseProducts)
    ? warehouseProducts
    : [];
  const productsLoadMoreRef = useInfiniteScroll({
    enabled:
      viewMode === "browse" &&
      Boolean(selectedWarehouse) &&
      !productsLoading &&
      !productsLoadingMore &&
      !productsError &&
      productsHasMore,
    onLoadMore: () => {
      if (!selectedWarehouse) return;
      void loadWarehouseProducts({
        warehouse: selectedWarehouse,
        page: productsPage + 1,
        search: productSearch,
        category: selectedCategory,
        append: true,
      });
    },
  });

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const pendingRequestCount = requests.filter(
    (request) => request.status === "PENDING",
  ).length;
  const outstandingPaymentCount = outstandingPayments?.count ?? 0;
  const isNewOrderLocked = outstandingPaymentCount > 0;

  const navigateWorkflow = (section: WorkflowSection) => {
    if (section === "new") {
      setViewMode(isNewOrderLocked ? "payments" : "warehouses");
      return;
    }
    setViewMode(section);
  };

  const workflowNav = (active: WorkflowSection) => (
    <StockRequestWorkflowNav
      active={active}
      pendingRequestCount={pendingRequestCount}
      outstandingPaymentCount={outstandingPaymentCount}
      isNewOrderLocked={isNewOrderLocked}
      onNavigate={navigateWorkflow}
    />
  );

  const renderProductCard = (
    item: WarehouseInventoryItem,
    isHorizontal = false,
  ) => {
    const cartQty = getCartItemQuantity(item.product.id);
    const isInCart = cartQty > 0;
    return (
      <div
        key={item.id}
        className={`rounded-2xl border bg-white p-3 transition-all flex flex-col ${
          isHorizontal ? "w-[160px] sm:w-[180px] shrink-0" : ""
        } ${
          isInCart
            ? "border-[#FFAD02] ring-2 ring-[#FFAD02]/20"
            : "border-slate-100"
        }`}
      >
        <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-slate-100 shrink-0">
          {item.product.images[0]?.url ? (
            <img
              src={item.product.images[0].url}
              alt={item.product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-10 w-10 text-slate-300" />
            </div>
          )}
          {(item.product.category ||
            (item.product as any).businessCategory) && (
            <span className="absolute left-2 top-2 max-w-[70%] truncate rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-600 backdrop-blur-sm">
              {item.product.category?.name ||
                (item.product as any).businessCategory?.name}
            </span>
          )}
          <span className="absolute right-2 top-2 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">
            {item.quantity} ш
          </span>
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold text-slate-800 h-10 mb-1">
          {item.product.name}
        </h3>
        {item.product.sku && (
          <p className="mt-0.5 text-xs text-slate-400 truncate">
            {item.product.sku}
          </p>
        )}
        <p className="mt-auto pt-1 text-sm font-bold text-[#FFAD02]">
          {Number(item.product.price).toLocaleString()}₮
        </p>

        {isInCart ? (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#FFAD02]/10 p-1">
            <button
              onClick={() => updateCartQuantity(item.product.id, cartQty - 1)}
              className="rounded-lg bg-white p-1.5 text-[#FFAD02] shadow-sm hover:bg-[#FFAD02] hover:text-white"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-[#FFAD02]">{cartQty}</span>
            <button
              onClick={() => {
                if (cartQty < item.quantity) {
                  updateCartQuantity(item.product.id, cartQty + 1);
                }
              }}
              disabled={cartQty >= item.quantity}
              className="rounded-lg bg-white p-1.5 text-[#FFAD02] shadow-sm hover:bg-[#FFAD02] hover:text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => addToCart(item)}
            className="mt-3 w-full rounded-xl bg-slate-100 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-[#FFAD02] hover:text-white"
          >
            Сонгох
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFAD02]" />
      </div>
    );
  }

  // ===================== WAREHOUSES VIEW =====================
  if (viewMode === "warehouses") {
    return (
      <div className="space-y-6 p-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Бараа таталтын удирдлага
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Бараа сонгохоос төлбөр, хүргэлт хүртэл нэг урсгалаар удирдана.
          </p>
        </div>

        {workflowNav("new")}

        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-amber-800">
            Агуулах руу орж бараагаа сонгоод захиалга илгээнэ. Админ
            зөвшөөрснөөр бараа татах боломжтой.
          </p>
        </div>

        {(outstandingPayments?.count ?? 0) > 0 && (
          <div className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-bold text-red-900">
                  Өмнөх төлбөрийн үлдэгдэл байна
                </p>
                <p className="mt-1 text-sm text-red-700">
                  {outstandingPayments?.count} нэхэмжлэхийн нийт үлдэгдэл{" "}
                  {(outstandingPayments?.totalUnpaid ?? 0).toLocaleString()}₮.
                  Төлбөр бүрэн төлөгдсөний дараа шинэ захиалга шууд нээгдэнэ.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewMode("payments")}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              <CreditCard className="h-4 w-4" />
              Төлбөр төлөх
            </button>
          </div>
        )}

        {user?.organizationId && (outstandingPayments?.count ?? 0) === 0 && (
          <StockSuggestionBanner
            organizationId={user.organizationId}
            onEnterWarehouse={enterWarehouseById}
          />
        )}

        {warehouses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <WarehouseIcon className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-lg font-semibold text-slate-600">
              Захиалга авах төв агуулах хуваарилагдаагүй байна
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Төв агуулахын эрх авахын тулд админтай холбогдоно уу
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {warehouses.map((warehouse) => (
              <div
                key={warehouse.id}
                onClick={() => enterWarehouse(warehouse)}
                aria-disabled={(outstandingPayments?.count ?? 0) > 0}
                className={`group rounded-2xl border border-slate-100 bg-white p-5 transition-all ${
                  (outstandingPayments?.count ?? 0) > 0
                    ? "cursor-not-allowed opacity-55"
                    : "cursor-pointer hover:border-[#FFAD02]/30 hover:shadow-lg hover:shadow-[#FFAD02]/10"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-[#FFAD02]/10 p-3 transition-all group-hover:bg-[#FFAD02] group-hover:shadow-lg group-hover:shadow-[#FFAD02]/30">
                    <WarehouseIcon className="h-6 w-6 text-[#FFAD02] transition-colors group-hover:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 group-hover:text-[#FFAD02]">
                      {warehouse.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {warehouse.city}, {warehouse.district}
                    </p>
                    {warehouse.phone && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <Phone className="h-3 w-3" />
                        {warehouse.phone}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-[#FFAD02]" />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-medium text-[#FFAD02]">
                    Бараа сонгох →
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===================== BROWSE PRODUCTS VIEW =====================
  if (viewMode === "browse" && selectedWarehouse) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={exitWarehouse}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="font-bold text-slate-900">
                  {selectedWarehouse.name}
                </h1>
                <p className="text-xs text-slate-500">
                  {selectedWarehouse.city}
                </p>
              </div>
            </div>
            <button
              onClick={() => setViewMode("cart")}
              className="relative rounded-xl bg-[#FFAD02] p-3 text-white shadow-lg shadow-[#FFAD02]/30"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalCartItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {totalCartItems}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Нэр, SKU, баркодоор хайх..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:border-[#FFAD02] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  !selectedCategory
                    ? "bg-[#FFAD02] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Бүгд
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? "bg-[#FFAD02] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Products Grid */}
        <div className="p-4">
          {productsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#FFAD02]" />
            </div>
          ) : productsError ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-red-200 bg-red-50 py-16 text-center">
              <div className="mb-4 rounded-full bg-red-100 p-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-base font-semibold text-red-700">
                {productsError}
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
              <div className="mb-4 rounded-full bg-slate-100 p-4">
                <Package className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-lg font-semibold text-slate-600">
                Бараа олдсонгүй
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {!productSearch && !selectedCategory && (
                <div className="space-y-6">
                  {/* Шинээр нэмэгдсэн */}
                  {warehouseProducts.length > 0 && (
                    <div>
                      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        Шинээр нэмэгдсэн
                      </h2>
                      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                        {warehouseProducts
                          .slice(-6)
                          .reverse()
                          .map((item) => renderProductCard(item, true))}
                      </div>
                    </div>
                  )}

                  {/* Санал болгох бараа */}
                  {warehouseProducts.filter((i) => i.quantity <= i.minQuantity)
                    .length > 0 && (
                    <div>
                      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        Санал болгох бараа
                      </h2>
                      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                        {warehouseProducts
                          .filter((i) => i.quantity <= i.minQuantity)
                          .slice(0, 6)
                          .map((item) => renderProductCard(item, true))}
                      </div>
                    </div>
                  )}

                  <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 border-t pt-6 border-slate-100">
                    <Package className="h-4 w-4 text-slate-400" />
                    Бүх бараа ({productsTotal})
                  </h2>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((item) => renderProductCard(item, false))}
              </div>
              <div
                ref={productsLoadMoreRef}
                className="flex min-h-24 items-center justify-center py-6"
                aria-live="polite"
              >
                {productsLoadingMore ? (
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin text-[#FFAD02]" />
                    Бараа ачаалж байна…
                  </div>
                ) : productsHasMore ? (
                  <span className="sr-only">
                    Дараагийн бараануудыг ачаалах цэг
                  </span>
                ) : filteredProducts.length > 0 ? (
                  <p className="text-xs font-bold text-slate-400">
                    {productsTotal.toLocaleString()} барааг бүгдийг үзүүллээ
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Cart Bar */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white p-3 shadow-lg md:left-64">
            <button
              onClick={() => setViewMode("cart")}
              className="flex w-full items-center justify-between rounded-xl bg-[#FFAD02] px-4 py-2.5 text-white shadow-md shadow-[#FFAD02]/20"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  {totalCartItems} бараа
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs">Сагс харах</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ===================== CART VIEW =====================
  if (viewMode === "cart") {
    return (
      <div className="min-h-screen bg-slate-50 pb-32">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 px-4 py-4">
            <button
              onClick={() => setViewMode("browse")}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-bold text-slate-900">Сагс</h1>
              <p className="text-xs text-slate-500">
                {selectedWarehouse?.name}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
              <div className="mb-4 rounded-full bg-slate-100 p-4">
                <ShoppingCart className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-lg font-semibold text-slate-600">
                Сагс хоосон байна
              </p>
              <button
                onClick={() => setViewMode("browse")}
                className="mt-4 rounded-xl bg-[#FFAD02] px-6 py-2.5 text-sm font-bold text-white"
              >
                Бараа сонгох
              </button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-6 w-6 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate font-semibold text-slate-800">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {item.sku || "-"}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#FFAD02]">
                        {Number(item.price).toLocaleString()}₮
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateCartQuantity(item.productId, item.quantity - 1)
                        }
                        className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          if (item.quantity < item.available) {
                            updateCartQuantity(
                              item.productId,
                              item.quantity + 1,
                            );
                          }
                        }}
                        disabled={item.quantity >= item.available}
                        className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Info */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-4">
                <h3 className="font-semibold text-slate-800">
                  Хүргэлтийн мэдээлэл
                </h3>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Хаяг
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Хүргүүлэх хаяг..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#FFAD02] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Утас
                  </label>
                  <input
                    type="text"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    placeholder="Холбоо барих утас..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#FFAD02] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Тэмдэглэл
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Нэмэлт тэмдэглэл..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#FFAD02] focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl bg-slate-800 p-4 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Нийт бараа</span>
                  <span className="font-bold">{totalCartItems} ширхэг</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-slate-400">Төрөл</span>
                  <span className="font-bold">{cart.length}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Submit Button */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white p-3 md:left-64">
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFAD02] py-3 text-sm font-bold text-white shadow-md shadow-[#FFAD02]/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Захиалга илгээх</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-amber-100 p-3">
                  <AlertCircle className="h-8 w-8 text-amber-600" />
                </div>
              </div>
              <h3 className="text-center text-lg font-bold text-slate-900">
                Итгэлтэй байна уу?
              </h3>
              <p className="mt-2 text-center text-sm text-slate-500">
                Та {totalCartItems} ширхэг барааны захиалга илгээхдээ итгэлтэй
                байна уу?
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Болих
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    handleSubmit();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-[#FFAD02] py-2.5 text-sm font-bold text-white hover:bg-[#E09D00] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mx-auto animate-spin" />
                  ) : (
                    "Тийм, илгээх"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===================== PAYMENTS VIEW =====================
  if (viewMode === "payments") {
    const unpaidCount = paymentHistory.filter(
      (p) => p.status === "PENDING" || p.status === "FAILED",
    ).length;
    const paidCount = paymentHistory.filter((p) => p.status === "PAID").length;
    const totalUnpaid = paymentHistory
      .filter((p) => p.status === "PENDING" || p.status === "FAILED")
      .reduce(
        (sum, p) => sum + (Number(p.totalAmount) - Number(p.paidAmount)),
        0,
      );

    return (
      <div className="space-y-6 p-2">
        <div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Төлбөрийн түүх
            </h1>
            <p className="text-sm text-slate-500">
              Бараа таталтын захиалгуудын нэхэмжлэх
            </p>
          </div>
        </div>

        {workflowNav("payments")}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-2.5">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {unpaidCount}
                </p>
                <p className="text-xs text-slate-500">Төлөгдөөгүй</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-50 p-2.5">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{paidCount}</p>
                <p className="text-xs text-slate-500">Төлөгдсөн</p>
              </div>
            </div>
          </div>
          <div className="col-span-2 md:col-span-1 rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-100 p-2.5">
                <Receipt className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-red-700">
                  {totalUnpaid.toLocaleString()}₮
                </p>
                <p className="text-xs text-red-600">Нийт төлөгдөөгүй дүн</p>
              </div>
            </div>
          </div>
        </div>

        {unpaidCount > 0 && (
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 p-4">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Анхааруулга
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                Төлөгдөөгүй нэхэмжлэх байгаа тул шинэ захиалга нээгдэхгүй.
                Эхлээд өмнөх төлбөрөө төлнө үү.
              </p>
            </div>
          </div>
        )}

        {loadingPayments ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#FFAD02]" />
          </div>
        ) : paymentHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <Receipt className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-lg font-semibold text-slate-600">
              Төлбөрийн түүх байхгүй
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Бараа таталтын захиалга илгээсний дараа энд харагдана
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentHistory.map((payment) => (
              <div
                key={payment.id}
                onClick={() => openPaymentDetail(payment.id)}
                className={`rounded-2xl border bg-white p-5 cursor-pointer hover:shadow-md transition-shadow ${
                  payment.status === "PENDING" || payment.status === "FAILED"
                    ? "border-amber-200"
                    : "border-slate-100"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`rounded-xl p-3 ${
                        payment.status === "PAID"
                          ? "bg-green-50"
                          : payment.status === "PENDING"
                            ? "bg-amber-50"
                            : "bg-red-50"
                      }`}
                    >
                      <Receipt
                        className={`h-6 w-6 ${
                          payment.status === "PAID"
                            ? "text-green-600"
                            : payment.status === "PENDING"
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">
                          {payment.invoiceNumber}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                            payment.status === "PAID"
                              ? "bg-green-100 text-green-700"
                              : payment.status === "PENDING"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
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
                              ? "Төлөгдөөгүй"
                              : "Алдаатай"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Захиалга: {payment.request?.requestNumber || "-"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(payment.createdAt).toLocaleDateString(
                          "mn-MN",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">
                      {Number(payment.totalAmount).toLocaleString()}₮
                    </p>
                    {payment.dueDate && payment.status === "PENDING" && (
                      <p
                        className={`text-sm ${
                          new Date(payment.dueDate) < new Date()
                            ? "text-red-600 font-medium"
                            : "text-slate-500"
                        }`}
                      >
                        Хугацаа:{" "}
                        {new Date(payment.dueDate).toLocaleDateString("mn-MN")}
                      </p>
                    )}
                    {payment.paidAt && (
                      <p className="text-sm text-green-600">
                        Төлсөн:{" "}
                        {new Date(payment.paidAt).toLocaleDateString("mn-MN")}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payment Detail Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:bg-white print:p-0">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
              {loadingPaymentDetail ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-[#FFAD02]" />
                </div>
              ) : selectedPayment ? (
                <>
                  {/* Header - hide on print */}
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 print:hidden">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Нэхэмжлэх
                      </h2>
                      <p className="text-sm text-slate-500">
                        {selectedPayment.invoiceNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrintInvoice}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <Printer className="h-4 w-4" />
                        Хэвлэх
                      </button>
                      <button
                        onClick={() => {
                          setShowPaymentModal(false);
                          setSelectedPayment(null);
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Print Content */}
                  <div className="p-6 print:p-0">
                    {/* Invoice Header */}
                    <div className="border-b border-slate-200 pb-6 print:pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h1 className="text-2xl font-bold text-slate-900 print:text-xl">
                            НЭХЭМЖЛЭХ
                          </h1>
                          <p className="text-lg font-semibold text-[#FFAD02] mt-1">
                            {selectedPayment.invoiceNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium print:border ${
                              selectedPayment.status === "PAID"
                                ? "bg-green-100 text-green-700 print:border-green-500"
                                : selectedPayment.status === "PENDING"
                                  ? "bg-amber-100 text-amber-700 print:border-amber-500"
                                  : "bg-red-100 text-red-700 print:border-red-500"
                            }`}
                          >
                            {selectedPayment.status === "PAID" && (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            {selectedPayment.status === "PENDING" && (
                              <Clock className="h-4 w-4" />
                            )}
                            {selectedPayment.status === "PAID"
                              ? "ТӨЛӨГДСӨН"
                              : selectedPayment.status === "PENDING"
                                ? "ТӨЛӨГДӨӨГҮЙ"
                                : "ЦУЦЛАГДСАН"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-slate-500">Огноо</p>
                          <p className="font-medium">
                            {new Date(
                              selectedPayment.createdAt,
                            ).toLocaleDateString("mn-MN")}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Захиалгын дугаар</p>
                          <p className="font-medium">
                            {selectedPayment.request?.requestNumber || "-"}
                          </p>
                        </div>
                        {selectedPayment.request?.warehouse && (
                          <div>
                            <p className="text-slate-500">Агуулах</p>
                            <p className="font-medium">
                              {selectedPayment.request.warehouse.name}
                            </p>
                          </div>
                        )}
                        {selectedPayment.dueDate && (
                          <div>
                            <p className="text-slate-500">Төлөх хугацаа</p>
                            <p
                              className={`font-medium ${
                                new Date(selectedPayment.dueDate) <
                                  new Date() &&
                                selectedPayment.status === "PENDING"
                                  ? "text-red-600"
                                  : ""
                              }`}
                            >
                              {new Date(
                                selectedPayment.dueDate,
                              ).toLocaleDateString("mn-MN")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="py-6 print:py-4">
                      <h3 className="font-semibold text-slate-800 mb-4">
                        Бараа
                      </h3>
                      <div className="border rounded-xl overflow-hidden print:border-slate-300">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 print:bg-slate-100">
                            <tr>
                              <th className="text-left px-4 py-3 font-semibold text-slate-600">
                                №
                              </th>
                              <th className="text-left px-4 py-3 font-semibold text-slate-600">
                                Бараа
                              </th>
                              <th className="text-center px-4 py-3 font-semibold text-slate-600">
                                Тоо
                              </th>
                              <th className="text-right px-4 py-3 font-semibold text-slate-600">
                                Үнэ
                              </th>
                              <th className="text-right px-4 py-3 font-semibold text-slate-600">
                                Нийт
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedPayment.request?.items?.map(
                              (item, idx) => {
                                const qty =
                                  item.approvedQuantity || item.quantity;
                                const price = Number(item.product.price);
                                const total = qty * price;
                                return (
                                  <tr key={item.id}>
                                    <td className="px-4 py-3 text-slate-600">
                                      {idx + 1}
                                    </td>
                                    <td className="px-4 py-3">
                                      <p className="font-medium text-slate-800">
                                        {item.product.name}
                                      </p>
                                      {item.product.sku && (
                                        <p className="text-xs text-slate-500">
                                          {item.product.sku}
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-600">
                                      {qty}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">
                                      {price.toLocaleString()}₮
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                                      {total.toLocaleString()}₮
                                    </td>
                                  </tr>
                                );
                              },
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Нийт дүн:</span>
                            <span className="font-bold text-lg text-slate-900">
                              {Number(
                                selectedPayment.totalAmount,
                              ).toLocaleString()}
                              ₮
                            </span>
                          </div>
                          {selectedPayment.status === "PAID" &&
                            selectedPayment.paidAt && (
                              <div className="flex justify-between text-sm text-green-600">
                                <span>Төлсөн огноо:</span>
                                <span className="font-medium">
                                  {new Date(
                                    selectedPayment.paidAt,
                                  ).toLocaleDateString("mn-MN")}
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>

                    {IS_LOCAL_DEVELOPMENT &&
                      selectedPayment.status !== "PAID" &&
                      selectedPayment.status !== "CANCELLED" && (
                        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 print:hidden">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-bold text-emerald-900">
                                Local development төлбөр
                              </p>
                              <p className="mt-1 text-xs text-emerald-700">
                                Бодит төлбөрийн систем дуудахгүйгээр энэ
                                нэхэмжлэхийг бүтэн төлөгдсөн болгоно.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={markPaymentPaidLocally}
                              disabled={markingPaymentPaid}
                              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                            >
                              {markingPaymentPaid ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                              Төлсөн гэж тэмдэглэх
                            </button>
                          </div>
                        </div>
                      )}

                    {/* Footer for print */}
                    <div className="hidden print:block mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
                      <p>MGL Store - Нэхэмжлэх</p>
                      <p>Хэвлэсэн: {new Date().toLocaleString("mn-MN")}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-slate-500">
                  Нэхэмжлэх олдсонгүй
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===================== REQUESTS VIEW =====================
  return (
    <div className="space-y-6 p-2">
      <div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Захиалгын түүх
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Илгээсэн захиалгын төлөв, төлбөр болон хүргэлтийн явц
          </p>
        </div>
      </div>

      {workflowNav("requests")}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
        ].map(({ status, label, icon: Icon, bg, color }) => (
          <div
            key={status}
            className="rounded-2xl border border-slate-100 bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-xl ${bg} p-2.5`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {requests.filter((r) => r.status === status).length}
                </p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <RequestFilter
        requests={requests}
        warehouses={warehouses}
        onChange={(filtered) => setFilteredRequests(filtered as StockRequest[])}
      />

      {filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <Package className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-lg font-semibold text-slate-600">
            {requests.length === 0
              ? "Захиалгын түүх хоосон байна"
              : "Шүүлтүүрт тохирох захиалга олдсонгүй"}
          </p>
          {requests.length === 0 ? (
            <button
              onClick={() => setViewMode("warehouses")}
              className="mt-4 rounded-xl bg-[#FFAD02] px-6 py-2.5 text-sm font-bold text-white"
            >
              Шинэ захиалга
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const config = statusConfig[request.status];
            const StatusIcon = config.icon;
            return (
              <div
                key={request.id}
                className="rounded-2xl border border-slate-100 bg-white p-5 hover:shadow-md cursor-pointer"
                onClick={() => {
                  setSelectedRequest(request);
                  setShowDetailModal(true);
                }}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-[#FFAD02]/10 p-3">
                      <WarehouseIcon className="h-6 w-6 text-[#FFAD02]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
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
                      <p className="mt-1 text-sm text-slate-600">
                        {request.warehouse.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {request.items.length} төрөл •{" "}
                        {request.items.reduce(
                          (sum, i) => sum + (i.approvedQuantity || i.quantity),
                          0,
                        )}{" "}
                        ш
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Илгээсэн</p>
                      <p className="text-sm font-medium text-slate-600">
                        {new Date(request.requestedAt).toLocaleDateString(
                          "mn-MN",
                        )}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>
                </div>
                {request.status === "PENDING" && (
                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancel(request.id);
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Цуцлах
                    </button>
                  </div>
                )}
                {request.status === "REJECTED" && request.reviewNote && (
                  <div className="mt-4 rounded-xl bg-red-50 p-3">
                    <p className="text-xs font-medium text-red-800">
                      Татгалзсан шалтгаан:
                    </p>
                    <p className="mt-1 text-sm text-red-600">
                      {request.reviewNote}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl">
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
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
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

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <WarehouseIcon className="h-5 w-5 text-slate-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">
                      {selectedRequest.warehouse.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {selectedRequest.warehouse.address},{" "}
                      {selectedRequest.warehouse.city}
                    </p>
                  </div>
                </div>
              </div>

              {(selectedRequest.deliveryAddress ||
                selectedRequest.deliveryPhone) && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">
                    Хүргэлт
                  </p>
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
              )}

              <div>
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Бараа ({selectedRequest.items.length})
                </p>
                <div className="space-y-2">
                  {selectedRequest.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
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
                      <div className="text-right">
                        <p className="font-semibold text-slate-800">
                          {item.approvedQuantity || item.quantity} ш
                        </p>
                        {item.approvedQuantity &&
                          item.approvedQuantity !== item.quantity && (
                            <p className="text-xs text-slate-500 line-through">
                              {item.quantity} ш
                            </p>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRequest.note && (
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Тэмдэглэл
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedRequest.note}
                  </p>
                </div>
              )}

              {/* Payment Info */}
              {selectedRequest.payment && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt className="h-5 w-5 text-slate-600" />
                    <p className="font-semibold text-slate-800">Нэхэмжлэх</p>
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
                      <p className="font-bold text-lg text-slate-900">
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
                            ? "Төлөгдөөгүй"
                            : "Цуцлагдсан"}
                      </span>
                    </div>
                    {selectedRequest.payment.dueDate && (
                      <div>
                        <p className="text-slate-500">Төлөх хугацаа</p>
                        <p
                          className={`font-medium ${
                            new Date(selectedRequest.payment.dueDate) <
                              new Date() &&
                            selectedRequest.payment.status === "PENDING"
                              ? "text-red-600"
                              : ""
                          }`}
                        >
                          {new Date(
                            selectedRequest.payment.dueDate,
                          ).toLocaleDateString("mn-MN")}
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedRequest.payment.status === "PENDING" && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                      <p className="text-xs text-amber-700">
                        Төлбөр төлөгдөөгүй байгаа тул шинэ захиалга батлагдахгүй
                        болно
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(selectedRequest.status === "COMPLETED" ||
                selectedRequest.dispatch?.status === "DELIVERED") && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-slate-600" />
                      <p className="font-semibold text-slate-800">
                        Ирсэн падаан
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {(() => {
                      const rawPadaanUrl =
                        selectedRequest.dispatch?.padaanUrl || "";
                      const padaanUrl = resolveAssetUrl(rawPadaanUrl);
                      const canPreviewImage =
                        isLikelyImageUrl(rawPadaanUrl) ||
                        isLikelyImageUrl(padaanUrl);

                      return (
                        <>
                          <input
                            ref={padaanFileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={handlePadaanImageUpload}
                          />

                          {padaanUrl ? (
                            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                              {canPreviewImage ? (
                                <img
                                  src={padaanUrl}
                                  alt="Ирсэн падаан"
                                  className="max-h-72 w-full bg-white object-contain"
                                />
                              ) : (
                                <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-500">
                                  <FileImage className="h-8 w-8" />
                                  <span className="text-sm font-semibold">
                                    Падаан хадгалагдсан
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-500">
                              <FileImage className="h-8 w-8" />
                              <span className="text-sm font-semibold">
                                Падааны зураг оруулаагүй байна
                              </span>
                            </div>
                          )}

                          <div className="flex flex-wrap justify-end gap-2">
                            {padaanUrl && (
                              <a
                                href={padaanUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Нээх
                              </a>
                            )}
                            {padaanUrl && (
                              <button
                                type="button"
                                onClick={handleClearPadaan}
                                disabled={savingPadaan}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-100 px-4 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 className="h-4 w-4" />
                                Устгах
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => padaanFileInputRef.current?.click()}
                              disabled={savingPadaan || !selectedRequest.dispatch}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingPadaan ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                              {savingPadaan
                                ? "Upload хийж байна..."
                                : "Зураг upload"}
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {selectedRequest.reviewNote && (
                <div
                  className={`rounded-xl p-4 ${selectedRequest.status === "REJECTED" ? "bg-red-50" : "bg-blue-50"}`}
                >
                  <p
                    className={`text-sm font-semibold ${selectedRequest.status === "REJECTED" ? "text-red-800" : "text-blue-800"}`}
                  >
                    Админы тэмдэглэл
                  </p>
                  <p
                    className={`mt-1 text-sm ${selectedRequest.status === "REJECTED" ? "text-red-600" : "text-blue-600"}`}
                  >
                    {selectedRequest.reviewNote}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
