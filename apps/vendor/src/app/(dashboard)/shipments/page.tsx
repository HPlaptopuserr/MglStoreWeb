"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { API } from "@/lib/api";

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
  };
};

type Warehouse = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  phone: string | null;
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Payment history states
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loadingPaymentDetail, setLoadingPaymentDetail] = useState(false);

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
      const [requestsRes, warehousesRes] = await Promise.all([
        fetch(`${API}/stock-requests?organizationId=${user?.organizationId}`),
        fetch(`${API}/warehouses/organization/${user?.organizationId}`),
      ]);
      if (requestsRes.ok) setRequests((await requestsRes.json()) || []);
      if (warehousesRes.ok) setWarehouses((await warehousesRes.json()) || []);
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
      const res = await fetch(
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
      const res = await fetch(`${API}/stock-requests/payments/${paymentId}`);
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

  useEffect(() => {
    if (viewMode === "payments" && user?.organizationId) {
      fetchPayments();
    }
  }, [viewMode, user?.organizationId]);

  const enterWarehouse = async (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setProductsLoading(true);
    setViewMode("browse");
    try {
      const res = await fetch(
        `${API}/stock-requests/warehouse/${warehouse.id}/products`,
      );
      if (res.ok) setWarehouseProducts((await res.json()) || []);
    } catch (error) {
      console.error("Failed to fetch warehouse products:", error);
    } finally {
      setProductsLoading(false);
    }
  };

  const exitWarehouse = () => {
    setSelectedWarehouse(null);
    setWarehouseProducts([]);
    setProductSearch("");
    setSelectedCategory(null);
    setViewMode("warehouses");
  };

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
      const response = await fetch(`${API}/stock-requests`, {
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
      if (!response.ok)
        throw new Error((await response.json()).message || "Failed");
      clearCart();
      exitWarehouse();
      fetchData();
      setViewMode("requests");
      alert("Хүсэлт амжилттай илгээгдлээ. Админ зөвшөөрснөөр идэвхжинэ.");
    } catch (error: any) {
      alert(error.message || "Хүсэлт илгээхэд алдаа гарлаа");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!confirm("Хүсэлтийг цуцлах уу?")) return;
    try {
      const response = await fetch(
        `${API}/stock-requests/${requestId}/cancel`,
        { method: "PATCH" },
      );
      if (!response.ok) throw new Error("Failed");
      fetchData();
    } catch (error) {
      alert("Хүсэлт цуцлахад алдаа гарлаа");
    }
  };

  const categories = Array.from(
    new Set(
      warehouseProducts.map((p) => p.product.category?.name).filter(Boolean),
    ),
  ) as string[];

  const filteredProducts = warehouseProducts.filter((item) => {
    const matchesSearch =
      item.product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      item.product.sku?.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory =
      !selectedCategory || item.product.category?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Бараа татах
            </h1>
            <p className="text-sm text-slate-500">
              Агуулах сонгож бараа татах хүсэлт илгээх
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("payments")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <CreditCard className="h-4 w-4" />
              Төлбөрийн түүх
            </button>
            <button
              onClick={() => setViewMode("requests")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Clock className="h-4 w-4" />
              Миний хүсэлтүүд
              {requests.filter((r) => r.status === "PENDING").length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  {requests.filter((r) => r.status === "PENDING").length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-amber-800">
            Агуулах руу орж барааг сонгоод хүсэлт илгээнэ үү. Админ зөвшөөрснөөр
            бараа татах боломжтой.
          </p>
        </div>

        {warehouses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <WarehouseIcon className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-lg font-semibold text-slate-600">
              Танд агуулах хуваарилагдаагүй байна
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Админтай холбогдоно уу
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {warehouses.map((warehouse) => (
              <div
                key={warehouse.id}
                onClick={() => enterWarehouse(warehouse)}
                className="group cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 transition-all hover:border-[#FFAD02]/30 hover:shadow-lg hover:shadow-[#FFAD02]/10"
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
                placeholder="Бараа хайх..."
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((item) => {
                const cartQty = getCartItemQuantity(item.product.id);
                const isInCart = cartQty > 0;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border bg-white p-3 transition-all ${
                      isInCart
                        ? "border-[#FFAD02] ring-2 ring-[#FFAD02]/20"
                        : "border-slate-100"
                    }`}
                  >
                    <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-slate-100">
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
                      {item.product.category && (
                        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-600 backdrop-blur-sm">
                          {item.product.category.name}
                        </span>
                      )}
                      <span className="absolute right-2 top-2 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {item.quantity} ш
                      </span>
                    </div>

                    <h3 className="line-clamp-2 text-sm font-semibold text-slate-800">
                      {item.product.name}
                    </h3>
                    {item.product.sku && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {item.product.sku}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-bold text-[#FFAD02]">
                      {Number(item.product.price).toLocaleString()}₮
                    </p>

                    {isInCart ? (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-[#FFAD02]/10 p-1">
                        <button
                          onClick={() =>
                            updateCartQuantity(item.product.id, cartQty - 1)
                          }
                          className="rounded-lg bg-white p-1.5 text-[#FFAD02] shadow-sm hover:bg-[#FFAD02] hover:text-white"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-bold text-[#FFAD02]">
                          {cartQty}
                        </span>
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
              })}
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
                  <span>Хүсэлт илгээх</span>
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
                Та {totalCartItems} ширхэг бараа татах хүсэлт илгээхдээ итгэлтэй
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Төлбөрийн түүх
            </h1>
            <p className="text-sm text-slate-500">
              Бараа татах хүсэлтүүдийн нэхэмжлэхүүд
            </p>
          </div>
          <button
            onClick={() => setViewMode("warehouses")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Буцах
          </button>
        </div>

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
                Төлөгдөөгүй нэхэмжлэх байгаа тул шинэ хүсэлт зөвшөөрөгдөхгүй.
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
              Бараа татах хүсэлт илгээсний дараа энд харагдана
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
                        Хүсэлт: {payment.request?.requestNumber || "-"}
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
                          <p className="text-slate-500">Хүсэлтийн дугаар</p>
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Миний хүсэлтүүд
          </h1>
          <p className="text-sm text-slate-500">Илгээсэн хүсэлтүүдийн түүх</p>
        </div>
        <button
          onClick={() => setViewMode("warehouses")}
          className="inline-flex items-center gap-2 rounded-xl bg-[#FFAD02] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#FFAD02]/20 transition-all hover:bg-[#E09D00]"
        >
          <Plus className="h-5 w-5" />
          Шинэ хүсэлт
        </button>
      </div>

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

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <Package className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-lg font-semibold text-slate-600">
            Хүсэлт байхгүй байна
          </p>
          <button
            onClick={() => setViewMode("warehouses")}
            className="mt-4 rounded-xl bg-[#FFAD02] px-6 py-2.5 text-sm font-bold text-white"
          >
            Хүсэлт илгээх
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
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
                        Төлбөр төлөгдөөгүй байгаа тул шинэ хүсэлт батлагдахгүй
                        болно
                      </p>
                    </div>
                  )}
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
