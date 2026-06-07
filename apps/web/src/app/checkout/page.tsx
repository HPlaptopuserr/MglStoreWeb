"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, ArrowLeft, Loader2, AlertCircle, MapPin, Check } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth, type AuthAddress, type AuthUser } from "@/lib/auth-context";
import { API } from "@/lib/api";
import {
  getActiveCheckoutDispatch,
  setActiveCheckoutDispatch,
} from "@/lib/active-checkout-dispatch";
import {
  DeliveryDispatchRadar,
  type DeliverySession,
} from "@/components/organisms/checkout/DeliveryDispatchRadar";
import { LoginModal } from "@/components/organisms/auth/LoginModal";
import { QPayModal } from "@/components/organisms/checkout/QPayModal";

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

type CheckoutStep = "idle" | "confirm-location" | "radar" | "pickup" | "ready-to-pay";

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
            <p className="font-bold text-amber-950">Хүргэлтийн байршил бүртгэлгүй байна</p>
            <p className="mt-1 leading-5 text-amber-800">
              Profile хэсэгт үндсэн байршлаа нэмсний дараа хамгийн ойр салбараас хүргэлт хайна.
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
  const { user, authFetch, login, register } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [phone, setPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [deliveryUnavailable, setDeliveryUnavailable] = useState(false);
  const [deliverySession, setDeliverySession] = useState<DeliverySession | null>(() => getActiveCheckoutDispatch());
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("idle");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [now, setNow] = useState(Date.now());
  const didPrefillPhone = useRef(false);
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const activeDispatch = getActiveCheckoutDispatch();
    if (!activeDispatch) return;
    setDeliverySession(activeDispatch);
    setDeliveryUnavailable(activeDispatch.status === "NO_BRANCH_AVAILABLE");
    setCheckoutStep(activeDispatch.canPay ? "ready-to-pay" : "radar");
  }, []);

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
    if (!deliverySession || deliverySession.canPay || deliverySession.status === "NO_BRANCH_AVAILABLE") return;

    const syncDispatch = async () => {
      try {
        const res = await authFetch(`${API}/store/checkout/${deliverySession.orderId}/dispatch-status`);
        if (!res.ok) return;
        const data = await res.json();
        setActiveCheckoutDispatch(data);
        setDeliverySession(data);
        if (data.status === "NO_BRANCH_AVAILABLE") {
          setDeliveryUnavailable(true);
          setCheckoutStep("pickup");
        } else if (data.canPay) {
          setCheckoutStep("ready-to-pay");
        }
      } catch {
        // Keep the current radar state visible; the next poll can recover.
      }
    };

    const poll = window.setInterval(syncDispatch, 5000);
    return () => window.clearInterval(poll);
  }, [authFetch, deliverySession]);

  const createPayment = async (session: DeliverySession) => {
    setLoading(true);
    setError("");

    try {
      const res = await authFetch(`${API}/store/checkout/${session.orderId}/payment`, {
        method: "POST",
      });
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
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    if (deliverySession?.canPay) {
      await createPayment(deliverySession);
      return;
    }

    if (items.length === 0) return;

    if (!phone.trim()) {
      setError("Захиалга баталгаажуулах утасны дугаараа оруулна уу.");
      return;
    }
    if (!orderNote.trim()) {
      setError("Захиалгын нэмэлт мэдээллээ оруулна уу.");
      return;
    }

    if (checkoutStep !== "confirm-location") {
      setCheckoutStep("confirm-location");
      setError("");
      return;
    }
  };

  const startDeliveryRadar = async () => {
    if (!user) {
      setAuthOpen(true);
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
          lines: items.map((i) => ({ productId: i.id, qty: i.quantity })),
          phone: phone.trim(),
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
        } else {
          setError(data.message || "Захиалга үүсгэхэд алдаа гарлаа");
          setCheckoutStep("confirm-location");
        }
        setLoading(false);
        return;
      }

      if (data.dispatch && !data.qpayInvoiceId) {
        setActiveCheckoutDispatch(data.dispatch);
        setDeliverySession(data.dispatch);
        clearCart();
        setCheckoutStep(data.dispatch.canPay ? "ready-to-pay" : "radar");
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
      const res = await authFetch(`${API}/store/checkout/${deliverySession.orderId}/cancel`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setDeliverySession(null);
        setActiveCheckoutDispatch(null);
        setDeliveryUnavailable(false);
        setCheckoutStep("idle");
        return;
      }
      if (!res.ok) {
        setError(data?.message || "Захиалга цуцлахад алдаа гарлаа");
        return;
      }
      setDeliverySession(null);
      setActiveCheckoutDispatch(null);
      setDeliveryUnavailable(false);
      setCheckoutStep("idle");
    } catch {
      setError("Захиалга цуцлахад сүлжээний алдаа гарлаа");
    } finally {
      setCancellingOrder(false);
    }
  };

  const handlePaymentSuccess = () => {
    setActiveCheckoutDispatch(null);
    if (!deliverySession) clearCart();
    router.push("/profile?tab=orders");
  };

  if (items.length === 0 && !checkoutResult && !deliverySession) {
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
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={16} />
        Буцах
      </button>

      <h1 className="mb-8 text-2xl font-black text-gray-900">Захиалга баталгаажуулах</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Order summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Сагсны бараа</h2>
            <div className="divide-y divide-gray-100">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingCart size={20} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.quantity} ширхэг × ₮{item.price.toLocaleString()}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 tabular-nums">
                    ₮{(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Order information */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Захиалгын мэдээлэл</h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
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
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition-colors focus:border-amber-400 focus:bg-white"
                  />
                  <p className="mt-2 text-xs font-semibold text-gray-400">
                    Салбар захиалгыг энэ дугаараар баталгаажуулна.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Нэмэлт дугаар
                  </label>
                  <input
                    type="tel"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    placeholder="Байвал оруулна уу"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition-colors focus:border-amber-400 focus:bg-white"
                  />
                  <p className="mt-2 text-xs font-semibold text-gray-400">
                    Үндсэн дугаар холбогдохгүй үед ашиглана.
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Нэмэлт мэдээлэл
                </label>
                <textarea
                  value={orderNote}
                  onChange={(e) => {
                    setOrderNote(e.target.value);
                    if (error) setError("");
                  }}
                  rows={3}
                  required
                  placeholder="Жишээ: Орцны код, хүргэлтийн цаг, авах хүний нэр..."
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition-colors focus:border-amber-400 focus:bg-white"
                />
                <p className="mt-2 text-xs font-semibold text-gray-400">
                  Хүргэлтэд хэрэгтэй нэмэлт тайлбарыг энд үлдээнэ.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment sidebar */}
        <div className="min-w-0">
          <div className="sticky top-36 min-w-0 space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900">Төлбөрийн мэдээлэл</h2>

            {deliverySession && (
              <div className="space-y-3">
                <DeliveryDispatchRadar session={deliverySession} now={now} />
                {!deliverySession.canPay && deliverySession.status !== "NO_BRANCH_AVAILABLE" && (
                  <button
                    type="button"
                    onClick={cancelDeliverySearch}
                    disabled={cancellingOrder}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                  >
                    {cancellingOrder ? <Loader2 size={17} className="animate-spin" /> : <ArrowLeft size={17} />}
                    {cancellingOrder ? "Цуцалж байна..." : "Захиалга цуцлах"}
                  </button>
                )}
              </div>
            )}

            {deliveryUnavailable && !deliverySession && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-amber-950">Хүргэлтийн байршил бэлэн биш байна</p>
                    <p className="mt-1 leading-5 text-amber-800">
                      Одоогоор шалгах салбарын байршил бүртгэлгүй байна. Салбарын байршил нэмэгдмэгц
                      хүргэлтийн хүсэлт илгээх хэсэг автоматаар ажиллах боломжтой.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {checkoutStep === "confirm-location" && !deliveryUnavailable && !deliverySession && (
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
                onEdit={() => router.push("/profile?tab=address")}
              />
            )}

            {deliveryUnavailable && deliverySession && (
              <div className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                Хүргэлт баталгаажаагүй тул энэ захиалга салбар дээрээс авах горимд шилжлээ.
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Бүтээгдэхүүн ({items.reduce((s, i) => s + i.quantity, 0)})</span>
                <span className="tabular-nums">₮{displaySubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Хүргэлт</span>
                <span className="font-medium text-green-600">
                  {checkoutStep === "confirm-location"
                    ? "Байршил шалгана"
                    : deliveryUnavailable
                      ? "Салбараас авна"
                    : deliverySession && !deliverySession.canPay
                      ? "Шалгагдаж байна"
                      : "Үнэгүй"}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="text-base font-bold text-gray-900">Нийт</span>
                <span className="text-xl font-black text-gray-900 tabular-nums">
                  ₮{displayTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={
                loading ||
                cancellingOrder ||
                (items.length === 0 && !deliverySession?.canPay) ||
                (!deliverySession?.canPay && !phone.trim()) ||
                (!deliverySession?.canPay && !orderNote.trim()) ||
                deliveryUnavailable ||
                checkoutStep === "confirm-location" ||
                Boolean(deliverySession && !deliverySession.canPay)
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Түр хүлээнэ үү...
                </>
              ) : deliveryUnavailable ? (
                "Салбар дээрээс авах"
              ) : deliverySession && !deliverySession.canPay ? (
                "5 салбараас хариу хүлээж байна"
              ) : checkoutStep === "confirm-location" ? (
                "Байршлаа баталгаажуулна уу"
              ) : deliverySession?.canPay ? (
                "QPay-ээр төлөх"
              ) : !phone.trim() ? (
                "Утасны дугаар оруулна уу"
              ) : !orderNote.trim() ? (
                "Нэмэлт мэдээлэл оруулна уу"
              ) : user ? (
                "Захиалга өгөх"
              ) : (
                "Нэвтэрч захиалга өгөх"
              )}
            </button>

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
          onClose={() => { setAuthOpen(false); setAuthError(""); }}
          onLogin={async (identifier, password, options) => {
            setAuthError("");
            setAuthLoading(true);
            try {
              const result = await login(identifier, password, options);
              if (result?.requiresEmailOtp) return result;
              setAuthOpen(false);
            } catch (err: unknown) {
              setAuthError(err instanceof Error ? err.message : "Нэвтрэхэд алдаа гарлаа.");
            } finally {
              setAuthLoading(false);
            }
          }}
          onRegister={async (fullName, identifier, password) => {
            setAuthError("");
            setAuthLoading(true);
            try {
              await register(fullName, identifier, password);
              setAuthOpen(false);
            } catch (err: unknown) {
              setAuthError(err instanceof Error ? err.message : "Бүртгүүлэхэд алдаа гарлаа.");
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
    </div>
  );
}
