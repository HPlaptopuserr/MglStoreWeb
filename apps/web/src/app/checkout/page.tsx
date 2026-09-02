"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  ArrowLeft,
  Loader2,
  AlertCircle,
  MapPin,
  Check,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import type { CartItem } from "@/lib/cart";
import { useAuth, type AuthAddress, type AuthUser } from "@/lib/auth-context";
import { API, resolveApiAssetUrl } from "@/lib/api";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import {
  getActiveCheckoutDispatch,
  setActiveCheckoutDispatch,
} from "@/lib/active-checkout-dispatch";
import {
  DeliveryDispatchRadarPopup,
  type DeliverySession,
} from "@/components/organisms/checkout/DeliveryDispatchRadar";
import { LoginModal } from "@/components/organisms/auth/LoginModal";
import { QPayModal } from "@/components/organisms/checkout/QPayModal";
import { MinimumOrderModal } from "@/components/organisms/checkout/MinimumOrderModal";
import {
  CheckoutStoreGroups,
  type CheckoutStoreGroup,
} from "@/components/organisms/checkout/CheckoutStoreGroups";
import { trackMetaCommerceEvent } from "@/lib/meta-events";

const MINIMUM_ORDER_AMOUNT = 50_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toCheckoutLine = (item: CartItem) => ({
  productId: item.id,
  qty: item.quantity,
  ...(item.id.startsWith("local-product-")
    ? {
        devProduct: {
          name: item.name,
          price: item.price,
          supplyType: item.supplyType ?? "IN_STOCK",
        },
      }
    : {}),
});

interface DeepLink {
  name: string;
  description: string;
  logo: string;
  link: string;
}

interface CheckoutResult {
  orderId: string;
  orderNumber: string;
  total: number;
  subtotal: number;
  paymentId: string;
  qrText: string;
  qrImage: string;
  qpayInvoiceId: string;
  deepLinks: DeepLink[];
  expiresIn: number;
}

interface CheckoutCreatedOrderResponse {
  orderId: string;
  orderNumber: string;
  organizationId: string;
  organizationName: string;
  total: number;
  preorderOrder: boolean;
  canPay: boolean;
  dispatchStatus: string;
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    price: number;
    subtotal: number;
  }>;
}

const toCreatedStoreGroups = (
  orders: CheckoutCreatedOrderResponse[] | undefined,
): CheckoutStoreGroup[] =>
  Array.isArray(orders)
    ? orders.map((order) => ({
        organizationId: order.organizationId,
        organizationName: order.organizationName || "Дэлгүүр",
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        total: Number(order.total),
        preorderOrder: Boolean(order.preorderOrder),
        canPay: Boolean(order.canPay),
        dispatchStatus: order.dispatchStatus,
        paid: false,
        items: Array.isArray(order.items)
          ? order.items.map((item) => ({
              productId: item.productId,
              name: item.name,
              quantity: item.qty,
              price: Number(item.price),
              subtotal: Number(item.subtotal),
            }))
          : [],
      }))
    : [];

type CheckoutStep =
  | "idle"
  | "confirm-location"
  | "radar"
  | "pickup"
  | "ready-to-pay";

const DELIVERY_AREA_POINTS: Record<string, { lat: number; lng: number }> = {
  Багануур: { lat: 47.7789, lng: 108.3766 },
  Багахангай: { lat: 47.3605, lng: 107.4904 },
  Баянгол: { lat: 47.9148, lng: 106.8661 },
  Баянзүрх: { lat: 47.9251, lng: 106.9432 },
  Налайх: { lat: 47.7722, lng: 107.2523 },
  Сонгинохайрхан: { lat: 47.9297, lng: 106.7927 },
  Сүхбаатар: { lat: 47.9189, lng: 106.9177 },
  "Хан-Уул": { lat: 47.8849, lng: 106.8149 },
  Чингэлтэй: { lat: 47.9259, lng: 106.9086 },
};

const resolveDeliveryPoint = (address: AuthAddress) => {
  if (typeof address.lat === "number" && typeof address.lng === "number") {
    return { lat: address.lat, lng: address.lng };
  }
  if (address.district && DELIVERY_AREA_POINTS[address.district]) {
    return DELIVERY_AREA_POINTS[address.district];
  }
  return { lat: 47.9189, lng: 106.9177 };
};

function AddressConfirmPanel({
  address,
  addresses,
  onSelectAddress,
  onConfirm,
  onEdit,
}: {
  address: NonNullable<AuthUser["defaultAddress"]> | null;
  addresses: AuthAddress[];
  onSelectAddress: (addressId: string) => void;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  if (!address?.fullAddress) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600">
            <MapPin size={20} />
          </div>
          <div>
            <p className="font-bold text-amber-950">
              Хүргэлтийн байршил бүртгэлгүй байна
            </p>
            <p className="mt-1 leading-5 text-amber-800">
              Profile хэсэгт үндсэн байршлаа нэмсний дараа хамгийн ойр салбараас
              хүргэлт хайна.
            </p>
            <button
              type="button"
              onClick={onEdit}
              className="mt-3 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-600"
            >
              Байршил нэмэх
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
          <MapPin size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-950">Энэ байршил зөв үү?</p>
          {addresses.length > 1 && (
            <select
              value={address.id}
              onChange={(event) => onSelectAddress(event.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-400"
            >
              {addresses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.fullAddress}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 leading-5 text-slate-500">{address.fullAddress}</p>
          <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            Байршлыг шалгаад ойр салбарууд руу хүргэлтийн хүсэлт илгээнэ.
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-600"
            >
              <Check size={15} />
              Тийм, энэ хаягаар хүргүүлнэ
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Өөрчлөх
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const {
    user,
    loading: authHydrating,
    authFetch,
    login,
    register,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(
    null,
  );
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [deliveryUnavailable, setDeliveryUnavailable] = useState(false);
  const [deliverySession, setDeliverySession] =
    useState<DeliverySession | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("idle");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [minimumOrderModalOpen, setMinimumOrderModalOpen] = useState(false);
  const [cartStoreGroups, setCartStoreGroups] = useState<CheckoutStoreGroup[]>(
    [],
  );
  const [createdStoreOrders, setCreatedStoreOrders] = useState<
    CheckoutStoreGroup[]
  >([]);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const cartItemsRef = useRef(items);
  const createdStoreOrdersRef = useRef(createdStoreOrders);
  cartItemsRef.current = items;
  createdStoreOrdersRef.current = createdStoreOrders;
  const didPrefillPhone = useRef(false);
  const didPrefillEmail = useRef(false);
  const didTrackCheckout = useRef(false);
  const addresses = user?.addresses?.length
    ? user.addresses
    : user?.defaultAddress
      ? [user.defaultAddress]
      : [];
  const selectedAddress =
    addresses.find((address) => address.id === selectedAddressId) ||
    addresses.find((address) => address.isDefault) ||
    addresses[0] ||
    null;
  const displaySubtotal = deliverySession?.subtotal ?? total;
  const displayTotal = deliverySession?.total ?? total;
  const cartCheckoutItems = items.map((item) => ({
    id: item.id,
    productId: item.id,
    name: item.name,
    sku: null,
    unit: null,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.price * item.quantity,
    imageUrl: item.image ?? null,
  }));
  const checkoutItems = deliverySession?.items?.length
    ? deliverySession.items
    : cartCheckoutItems;
  const isPreorderCart =
    items.length > 0 &&
    items.every((item) => item.supplyType === "CHINA_PREORDER");
  const cartHydrationKey = items
    .map((item) => `${item.id}:${item.quantity}:${item.price}`)
    .join("|");
  const pendingStoreDispatchKey = createdStoreOrders
    .filter(
      (order) =>
        order.orderId && !order.paid && !order.canPay && !order.preorderOrder,
    )
    .map((order) => `${order.orderId}:${order.dispatchStatus || ""}`)
    .join("|");

  useEffect(() => {
    const currentItems = cartItemsRef.current;
    if (currentItems.length === 0) {
      setCartStoreGroups([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      currentItems.map(async (item) => {
        if (item.id.startsWith("local-product-")) {
          return {
            item,
            organization: {
              id: "local-development-store",
              name: "Туршилтын дэлгүүр",
              paymentConfigured: true,
            },
          };
        }
        try {
          const response = await fetch(
            `${API}/products/${encodeURIComponent(item.id)}`,
            { cache: "no-store" },
          );
          if (!response.ok) return null;
          const product = (await response.json()) as {
            organization?: {
              id?: string;
              name?: string;
              paymentConfigured?: boolean;
            };
          };
          if (!product.organization?.id) return null;
          return { item, organization: product.organization };
        } catch {
          return null;
        }
      }),
    ).then((resolvedItems) => {
      if (cancelled) return;
      const groups = new Map<string, CheckoutStoreGroup>();
      for (const resolved of resolvedItems) {
        if (!resolved) continue;
        const organizationId = resolved.organization.id || "unknown-store";
        const current = groups.get(organizationId) ?? {
          organizationId,
          organizationName: resolved.organization.name || "Дэлгүүр",
          paymentConfigured: resolved.organization.paymentConfigured,
          items: [],
          total: 0,
        };
        const subtotal = resolved.item.price * resolved.item.quantity;
        current.items.push({
          productId: resolved.item.id,
          name: resolved.item.name,
          quantity: resolved.item.quantity,
          price: resolved.item.price,
          subtotal,
        });
        current.total += subtotal;
        groups.set(organizationId, current);
      }
      setCartStoreGroups([...groups.values()]);
    });
    return () => {
      cancelled = true;
    };
  }, [cartHydrationKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (authHydrating) return;
    const activeDispatch = getActiveCheckoutDispatch(user?.id);
    if (!activeDispatch) {
      setDeliverySession(null);
      setDeliveryUnavailable(false);
      setCheckoutStep("idle");
      return;
    }
    const isDifferentCart =
      items.length > 0 &&
      typeof activeDispatch.subtotal === "number" &&
      activeDispatch.subtotal !== total;
    if (isDifferentCart) {
      setActiveCheckoutDispatch(user?.id, null);
      setDeliverySession(null);
      setDeliveryUnavailable(false);
      setCheckoutStep("idle");
      return;
    }
    setDeliverySession(activeDispatch);
    setDeliveryUnavailable(activeDispatch.status === "NO_BRANCH_AVAILABLE");
    setCheckoutStep(activeDispatch.canPay ? "ready-to-pay" : "radar");
  }, [authHydrating, items.length, total, user?.id]);

  useEffect(() => {
    if (!selectedAddressId && selectedAddress?.id) {
      setSelectedAddressId(selectedAddress.id);
    }
  }, [selectedAddress?.id, selectedAddressId]);

  useEffect(() => {
    if (!didPrefillPhone.current && user?.phone) {
      setPhone(user.phone);
      didPrefillPhone.current = true;
    }
  }, [user?.phone]);

  useEffect(() => {
    if (!didPrefillEmail.current && user?.email) {
      setEmail(user.email);
      didPrefillEmail.current = true;
    }
  }, [user?.email]);

  useEffect(() => {
    if (didTrackCheckout.current || items.length === 0) return;
    didTrackCheckout.current = true;
    trackMetaCommerceEvent("InitiateCheckout", {
      content_ids: items.map((item) => item.id),
      content_type: "product",
      currency: "MNT",
      value: total,
      num_items: items.reduce((sum, item) => sum + item.quantity, 0),
    });
  }, [items, total]);

  useEffect(() => {
    if (
      !deliverySession ||
      deliverySession.canPay ||
      deliverySession.status === "NO_BRANCH_AVAILABLE"
    )
      return;

    const syncDispatch = async () => {
      try {
        const res = await authFetch(
          `${API}/store/checkout/${deliverySession.orderId}/dispatch-status`,
        );
        if (res.status === 403 || res.status === 404) {
          setActiveCheckoutDispatch(user?.id, null);
          setDeliverySession(null);
          setDeliveryUnavailable(false);
          setCheckoutStep("idle");
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        const syncedSession: DeliverySession = {
          ...data,
          items: data.items?.length ? data.items : deliverySession.items,
        };
        setActiveCheckoutDispatch(user?.id, syncedSession);
        setDeliverySession(syncedSession);
        if (syncedSession.status === "NO_BRANCH_AVAILABLE") {
          setDeliveryUnavailable(true);
          setCheckoutStep("pickup");
        } else if (syncedSession.canPay) {
          setCheckoutStep("ready-to-pay");
        }
      } catch {
        // Keep the current radar state visible; the next poll can recover.
      }
    };

    const poll = window.setInterval(syncDispatch, 5000);
    return () => window.clearInterval(poll);
  }, [authFetch, deliverySession, user?.id]);

  useEffect(() => {
    if (!deliverySession?.orderId || deliverySession.items?.length) return;

    let cancelled = false;
    const hydrateOrderItems = async () => {
      try {
        const res = await authFetch(`${API}/store/orders`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          orders?: Array<{
            id: string;
            items?: Array<{
              id: string;
              productId: string;
              name: string;
              sku?: string | null;
              unit?: string | null;
              qty: number;
              price: number;
              subtotal: number;
              imageUrl?: string | null;
            }>;
          }>;
        };
        const order = data.orders?.find(
          (candidate) => candidate.id === deliverySession.orderId,
        );
        if (cancelled || !order?.items?.length) return;

        const hydratedSession: DeliverySession = {
          ...deliverySession,
          items: order.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            name: item.name,
            sku: item.sku ?? null,
            unit: item.unit ?? null,
            quantity: item.qty,
            price: item.price,
            subtotal: item.subtotal,
            imageUrl: item.imageUrl ?? null,
          })),
        };
        setDeliverySession(hydratedSession);
        setActiveCheckoutDispatch(user?.id, hydratedSession);
      } catch {
        // The dispatch-status poll can still provide the item snapshot later.
      }
    };

    void hydrateOrderItems();
    return () => {
      cancelled = true;
    };
  }, [authFetch, deliverySession, user?.id]);

  useEffect(() => {
    const pendingDispatchOrders = createdStoreOrdersRef.current.filter(
      (order) =>
        order.orderId && !order.paid && !order.canPay && !order.preorderOrder,
    );
    if (pendingDispatchOrders.length === 0) return;

    const syncStoreDispatches = async () => {
      const updates = await Promise.all(
        pendingDispatchOrders.map(async (order) => {
          try {
            const response = await authFetch(
              `${API}/store/checkout/${order.orderId}/dispatch-status`,
            );
            if (!response.ok) return null;
            const data = (await response.json()) as {
              canPay?: boolean;
              status?: string;
            };
            return {
              orderId: order.orderId,
              canPay: Boolean(data.canPay),
              dispatchStatus: data.status || order.dispatchStatus,
            };
          } catch {
            return null;
          }
        }),
      );
      setCreatedStoreOrders((current) =>
        current.map((order) => {
          const update = updates.find(
            (candidate) => candidate?.orderId === order.orderId,
          );
          return update ? { ...order, ...update } : order;
        }),
      );
    };

    void syncStoreDispatches();
    const timer = window.setInterval(syncStoreDispatches, 5000);
    return () => window.clearInterval(timer);
  }, [authFetch, pendingStoreDispatchKey]);

  const createPayment = async (session: Pick<DeliverySession, "orderId">) => {
    setLoading(true);
    setLoadingOrderId(session.orderId);
    setError("");

    try {
      const res = await authFetch(
        `${API}/store/checkout/${session.orderId}/payment`,
        {
          method: "POST",
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Төлбөр үүсгэхэд алдаа гарлаа");
        return;
      }

      setCheckoutResult(data);
    } catch {
      setError("Сүлжээний алдаа гарлаа");
    } finally {
      setLoading(false);
      setLoadingOrderId(null);
    }
  };

  const handleCheckout = async () => {
    if (deliverySession) {
      await createPayment(deliverySession);
      return;
    }

    if (items.length === 0) return;
    if (!isPreorderCart && total < MINIMUM_ORDER_AMOUNT) {
      setMinimumOrderModalOpen(true);
      return;
    }
    if (!user) {
      setAuthOpen(true);
      return;
    }

    if (!phone.trim()) {
      setError("Захиалга баталгаажуулах утасны дугаараа оруулна уу.");
      return;
    }
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
      setError("Имэйл хаягаа зөв форматаар оруулна уу.");
      return;
    }
    if (!orderNote.trim()) {
      setError("Захиалгын нэмэлт мэдээллээ оруулна уу.");
      return;
    }

    if (isPreorderCart) {
      await submitPreorderCheckout();
      return;
    }

    if (checkoutStep !== "confirm-location") {
      setCheckoutStep("confirm-location");
      setError("");
      return;
    }
  };

  const submitPreorderCheckout = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (items.length === 0) return;
    if (!phone.trim()) {
      setError("Захиалга баталгаажуулах утасны дугаараа оруулна уу.");
      return;
    }
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
      setError("Имэйл хаягаа зөв форматаар оруулна уу.");
      return;
    }
    if (!orderNote.trim()) {
      setError("Захиалгын нэмэлт мэдээллээ оруулна уу.");
      return;
    }

    setLoading(true);
    setError("");
    setDeliveryUnavailable(false);

    try {
      const res = await authFetch(`${API}/store/checkout`, {
        method: "POST",
        body: JSON.stringify({
          lines: items.map(toCheckoutLine),
          phone: phone.trim(),
          email: email.trim() || undefined,
          secondaryPhone: secondaryPhone.trim() || undefined,
          note: orderNote.trim(),
        }),
      });

      if (res.status === 401) {
        setAuthOpen(true);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        if (data.code === "MINIMUM_ORDER_AMOUNT") {
          setMinimumOrderModalOpen(true);
          return;
        }
        setError(data.message || "Захиалга үүсгэхэд алдаа гарлаа");
        return;
      }

      const storeOrders = toCreatedStoreGroups(data.orders);
      if (storeOrders.length > 1) {
        setCreatedStoreOrders(storeOrders);
        clearCart();
        return;
      }
      await createPayment({ orderId: data.orderId });
    } catch {
      setError("Сүлжээний алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  const startDeliveryRadar = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!isPreorderCart && total < MINIMUM_ORDER_AMOUNT) {
      setCheckoutStep("idle");
      setMinimumOrderModalOpen(true);
      return;
    }

    const address = selectedAddress;
    if (!address?.fullAddress) {
      setCheckoutStep("confirm-location");
      return;
    }
    if (!phone.trim()) {
      setError("Захиалга баталгаажуулах утасны дугаараа оруулна уу.");
      setCheckoutStep("idle");
      return;
    }
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
      setError("Имэйл хаягаа зөв форматаар оруулна уу.");
      setCheckoutStep("idle");
      return;
    }
    if (!orderNote.trim()) {
      setError("Захиалгын нэмэлт мэдээллээ оруулна уу.");
      setCheckoutStep("idle");
      return;
    }
    const deliveryPoint = resolveDeliveryPoint(address);

    setLoading(true);
    setError("");
    setDeliveryUnavailable(false);
    setCheckoutStep("radar");

    try {
      const res = await authFetch(`${API}/store/checkout`, {
        method: "POST",
        body: JSON.stringify({
          lines: items.map(toCheckoutLine),
          phone: phone.trim(),
          email: email.trim() || undefined,
          secondaryPhone: secondaryPhone.trim() || undefined,
          note: orderNote.trim() || undefined,
          shippingAddress: address.fullAddress,
          customerLat: deliveryPoint.lat,
          customerLng: deliveryPoint.lng,
        }),
      });

      if (res.status === 401) {
        setAuthOpen(true);
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "DELIVERY_AREA_UNAVAILABLE") {
          setDeliveryUnavailable(true);
          setCheckoutStep("pickup");
          setError("");
        } else if (data.code === "CUSTOMER_LOCATION_REQUIRED") {
          setError(data.message || "Байршлын координат шаардлагатай.");
          setCheckoutStep("confirm-location");
        } else if (data.code === "MINIMUM_ORDER_AMOUNT") {
          setMinimumOrderModalOpen(true);
          setCheckoutStep("idle");
          setError("");
        } else {
          setError(data.message || "Захиалга үүсгэхэд алдаа гарлаа");
          setCheckoutStep("confirm-location");
        }
        setLoading(false);
        return;
      }

      const storeOrders = toCreatedStoreGroups(data.orders);
      if (storeOrders.length > 1) {
        setCreatedStoreOrders(storeOrders);
        clearCart();
        setCheckoutStep("radar");
        return;
      }

      if (data.dispatch && !data.qpayInvoiceId) {
        const responseItems = Array.isArray(data.items)
          ? data.items.map(
              (item: {
                productId: string;
                name: string;
                qty: number;
                price: number;
                subtotal: number;
              }) => ({
                id: item.productId,
                productId: item.productId,
                name: item.name,
                sku: null,
                unit: null,
                quantity: item.qty,
                price: item.price,
                subtotal: item.subtotal,
                imageUrl: null,
              }),
            )
          : [];
        const dispatchSession: DeliverySession = {
          ...data.dispatch,
          items: data.dispatch.items?.length
            ? data.dispatch.items
            : responseItems.length
              ? responseItems
              : cartCheckoutItems,
        };
        setActiveCheckoutDispatch(user?.id, dispatchSession);
        setDeliverySession(dispatchSession);
        clearCart();
        setCheckoutStep(dispatchSession.canPay ? "ready-to-pay" : "radar");
        return;
      }

      setCheckoutResult(data);
    } catch {
      setError("Сүлжээний алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  const cancelDeliverySearch = async () => {
    if (!deliverySession?.orderId) {
      setDeliverySession(null);
      setCheckoutStep("idle");
      return;
    }

    setCancellingOrder(true);
    setError("");
    try {
      const res = await authFetch(
        `${API}/store/checkout/${deliverySession.orderId}/cancel`,
        {
          method: "POST",
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setDeliverySession(null);
        setActiveCheckoutDispatch(user?.id, null);
        setDeliveryUnavailable(false);
        setCheckoutStep("idle");
        return;
      }
      if (!res.ok) {
        setError(data?.message || "Захиалга цуцлахад алдаа гарлаа");
        return;
      }
      setDeliverySession(null);
      setActiveCheckoutDispatch(user?.id, null);
      setDeliveryUnavailable(false);
      setCheckoutStep("idle");
    } catch {
      setError("Захиалга цуцлахад сүлжээний алдаа гарлаа");
    } finally {
      setCancellingOrder(false);
    }
  };

  const handlePaymentSuccess = () => {
    if (checkoutResult) {
      trackMetaCommerceEvent("Purchase", {
        content_ids:
          items.length > 0
            ? items.map((item) => item.id)
            : [checkoutResult.orderId],
        content_type: "product",
        currency: "MNT",
        value: checkoutResult.total,
        num_items:
          items.length > 0
            ? items.reduce((sum, item) => sum + item.quantity, 0)
            : undefined,
      });
    }
    if (checkoutResult && createdStoreOrders.length > 0) {
      const completedOrderId = checkoutResult.orderId;
      const remainingOrders = createdStoreOrders.filter(
        (order) => order.orderId !== completedOrderId && !order.paid,
      );
      setCreatedStoreOrders((current) =>
        current.map((order) =>
          order.orderId === completedOrderId
            ? { ...order, paid: true, canPay: false }
            : order,
        ),
      );
      setCheckoutResult(null);
      if (remainingOrders.length > 0) return;
    }
    setActiveCheckoutDispatch(user?.id, null);
    if (!deliverySession) clearCart();
    router.push(ACCOUNT_ROUTES.orders);
  };

  if (
    items.length === 0 &&
    !checkoutResult &&
    !deliverySession &&
    createdStoreOrders.length === 0
  ) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center gap-6 px-4 py-20">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
          <ShoppingCart size={40} className="text-gray-300" />
        </div>
        <p className="text-lg font-semibold text-gray-600">Сагс хоосон байна</p>
        <button
          onClick={() => router.push("/products")}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-600 transition-colors"
        >
          <ArrowLeft size={18} />
          Дэлгүүр рүү буцах
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-3 sm:py-4">
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Буцах"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-900"
        >
          <ArrowLeft size={17} />
        </button>
        <h1 className="text-xl font-black text-gray-900 sm:text-2xl">
          Захиалга баталгаажуулах
        </h1>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* Order summary */}
        <div className="space-y-3 lg:col-span-2">
          {items.length > 0 && cartStoreGroups.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <CheckoutStoreGroups
                groups={cartStoreGroups}
                paymentPhase={false}
              />
            </div>
          )}
          {items.length > 0 && cartStoreGroups.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <h2 className="mb-2 text-base font-bold text-gray-900">
                Сагсны бараа
              </h2>
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-2">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingCart size={20} className="text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} ширхэг × ₮{item.price.toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 tabular-nums">
                      ₮{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order information */}
          {createdStoreOrders.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-base font-bold text-gray-900">
                Захиалгын мэдээлэл
              </h2>
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">
                      Утасны дугаар <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (error) setError("");
                      }}
                      required
                      placeholder="99112233"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus:border-amber-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">
                      Имэйл хаяг
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      autoComplete="email"
                      inputMode="email"
                      placeholder="name@example.com"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus:border-amber-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">
                      Нэмэлт дугаар
                    </label>
                    <input
                      type="tel"
                      value={secondaryPhone}
                      onChange={(e) => setSecondaryPhone(e.target.value)}
                      placeholder="Байвал оруулна уу"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus:border-amber-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">
                    Нэмэлт мэдээлэл
                  </label>
                  <textarea
                    value={orderNote}
                    onChange={(e) => {
                      setOrderNote(e.target.value);
                      if (error) setError("");
                    }}
                    rows={2}
                    required
                    placeholder="Жишээ: Орцны код, хүргэлтийн цаг, авах хүний нэр..."
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus:border-amber-400 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment sidebar */}
        <div className="min-w-0">
          <div className="sticky top-32 min-w-0 space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="text-base font-bold text-gray-900">
              Төлбөрийн мэдээлэл
            </h2>

            {deliverySession && (
              <DeliveryDispatchRadarPopup
                session={deliverySession}
                now={now}
                items={checkoutItems}
                total={displayTotal}
                cancelling={cancellingOrder}
                paying={loading}
                onCancel={() => void cancelDeliverySearch()}
                onPay={() => void handleCheckout()}
              />
            )}

            {createdStoreOrders.length > 0 && (
              <CheckoutStoreGroups
                groups={createdStoreOrders}
                paymentPhase
                loadingOrderId={loadingOrderId}
                onPay={(order) => {
                  if (order.orderId) {
                    void createPayment({ orderId: order.orderId });
                  }
                }}
              />
            )}

            {deliveryUnavailable && !deliverySession && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-amber-950">
                      Хүргэлтийн байршил бэлэн биш байна
                    </p>
                    <p className="mt-1 leading-5 text-amber-800">
                      Одоогоор шалгах салбарын байршил бүртгэлгүй байна.
                      Салбарын байршил нэмэгдмэгц хүргэлтийн хүсэлт илгээх хэсэг
                      автоматаар ажиллах боломжтой.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {checkoutStep === "confirm-location" &&
              !deliveryUnavailable &&
              !deliverySession && (
                <AddressConfirmPanel
                  address={selectedAddress}
                  addresses={addresses}
                  onSelectAddress={(addressId) => {
                    setSelectedAddressId(addressId);
                    setDeliverySession(null);
                    setDeliveryUnavailable(false);
                    setError("");
                  }}
                  onConfirm={startDeliveryRadar}
                  onEdit={() => router.push(ACCOUNT_ROUTES.profileAddress)}
                />
              )}

            {!deliverySession &&
              createdStoreOrders.length === 0 &&
              checkoutItems.length > 0 && (
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-2">
                  {checkoutItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg bg-white p-2"
                    >
                      {item.imageUrl ? (
                        <img
                          src={resolveApiAssetUrl(item.imageUrl)}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-black text-gray-400">
                          {item.quantity}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-gray-800">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold text-gray-400">
                          {item.quantity} {item.unit || "ш"} × ₮
                          {item.price.toLocaleString()}
                          {item.sku ? ` · ${item.sku}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-black tabular-nums text-gray-900">
                        ₮{item.subtotal.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

            {!deliverySession && createdStoreOrders.length === 0 && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>
                    Бүтээгдэхүүн (
                    {checkoutItems.reduce(
                      (sum, item) => sum + item.quantity,
                      0,
                    )}
                    )
                  </span>
                  <span className="tabular-nums">
                    ₮{displaySubtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Хүргэлт</span>
                  <span className="font-medium text-green-600">
                    {checkoutStep === "confirm-location"
                      ? "Байршил шалгана"
                      : isPreorderCart
                        ? "Байршил шаардахгүй"
                        : deliveryUnavailable
                          ? "Салбараас авна"
                          : "Үнэгүй"}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between">
                  <span className="text-base font-bold text-gray-900">
                    Нийт
                  </span>
                  <span className="text-xl font-black text-gray-900 tabular-nums">
                    ₮{displayTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {!deliverySession && createdStoreOrders.length === 0 && (
              <button
                onClick={handleCheckout}
                disabled={
                  loading ||
                  cancellingOrder ||
                  items.length === 0 ||
                  !phone.trim() ||
                  !orderNote.trim() ||
                  (!isPreorderCart && deliveryUnavailable) ||
                  (!isPreorderCart && checkoutStep === "confirm-location")
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Түр хүлээнэ үү...
                  </>
                ) : !isPreorderCart && deliveryUnavailable ? (
                  "Салбар дээрээс авах"
                ) : !isPreorderCart && checkoutStep === "confirm-location" ? (
                  "Байршлаа баталгаажуулна уу"
                ) : !phone.trim() ? (
                  "Утасны дугаар оруулна уу"
                ) : !orderNote.trim() ? (
                  "Нэмэлт мэдээлэл оруулна уу"
                ) : user && isPreorderCart ? (
                  "Захиалга бүртгэж төлөх"
                ) : user ? (
                  "Захиалга өгөх"
                ) : (
                  "Нэвтэрч захиалга өгөх"
                )}
              </button>
            )}

            {!user && (
              <p className="text-center text-xs text-gray-400">
                Захиалга өгөхийн тулд нэвтрэх шаардлагатай
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Login modal */}
      {authOpen && (
        <LoginModal
          open={authOpen}
          onClose={() => {
            setAuthOpen(false);
            setAuthError("");
          }}
          onLogin={async (identifier, password, options) => {
            setAuthError("");
            setAuthLoading(true);
            try {
              const result = await login(identifier, password, options);
              if (result?.requiresEmailOtp) return result;
              setAuthOpen(false);
            } catch (err: unknown) {
              setAuthError(
                err instanceof Error ? err.message : "Нэвтрэхэд алдаа гарлаа.",
              );
            } finally {
              setAuthLoading(false);
            }
          }}
          onRegister={async (fullName, identifier, password, options) => {
            setAuthError("");
            setAuthLoading(true);
            try {
              await register(fullName, identifier, password, options);
              setAuthOpen(false);
            } catch (err: unknown) {
              setAuthError(
                err instanceof Error
                  ? err.message
                  : "Бүртгүүлэхэд алдаа гарлаа.",
              );
            } finally {
              setAuthLoading(false);
            }
          }}
          isLoading={authLoading}
          error={authError}
        />
      )}

      {/* QPay payment modal */}
      {checkoutResult && (
        <QPayModal
          orderId={checkoutResult.orderId}
          orderNumber={checkoutResult.orderNumber}
          total={checkoutResult.total}
          qrText={checkoutResult.qrText}
          qrImage={checkoutResult.qrImage}
          deepLinks={checkoutResult.deepLinks}
          onSuccess={handlePaymentSuccess}
          onClose={() => setCheckoutResult(null)}
        />
      )}
      <MinimumOrderModal
        open={minimumOrderModalOpen}
        currentAmount={total}
        minimumAmount={MINIMUM_ORDER_AMOUNT}
        onClose={() => setMinimumOrderModalOpen(false)}
        onContinueShopping={() => {
          setMinimumOrderModalOpen(false);
          router.push("/products");
        }}
      />
    </div>
  );
}
