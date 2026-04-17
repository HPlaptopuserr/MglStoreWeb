"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/lib/auth-context";
import { API } from "@/lib/api";
import { LoginModal } from "@/components/organisms/auth/LoginModal";
import { QPayModal } from "@/components/organisms/checkout/QPayModal";

interface CheckoutResult {
  orderId: string;
  orderNumber: string;
  total: number;
  subtotal: number;
  paymentId: string;
  qrText: string;
  expiresIn: number;
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

  const handleCheckout = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    if (items.length === 0) return;

    setLoading(true);
    setError("");

    try {
      const res = await authFetch(`${API}/store/checkout`, {
        method: "POST",
        body: JSON.stringify({
          lines: items.map((i) => ({ productId: i.id, qty: i.quantity })),
          phone: phone || undefined,
        }),
      });

      if (res.status === 401) {
        setAuthOpen(true);
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Захиалга үүсгэхэд алдаа гарлаа");
        setLoading(false);
        return;
      }

      setCheckoutResult(data);
    } catch {
      setError("Сүлжээний алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    router.push("/orders");
  };

  if (items.length === 0 && !checkoutResult) {
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

          {/* Phone */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Холбоо барих</h2>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-600">
                Утасны дугаар (заавал биш)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="99112233"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-colors focus:border-amber-400 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Payment sidebar */}
        <div>
          <div className="sticky top-36 rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Төлбөрийн мэдээлэл</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Бүтээгдэхүүн ({items.reduce((s, i) => s + i.quantity, 0)})</span>
                <span className="tabular-nums">₮{total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Хүргэлт</span>
                <span className="text-green-600 font-medium">Үнэгүй</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="text-base font-bold text-gray-900">Нийт</span>
                <span className="text-xl font-black text-gray-900 tabular-nums">
                  ₮{total.toLocaleString()}
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
              disabled={loading || items.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Түр хүлээнэ үү...
                </>
              ) : user ? (
                "QPay-ээр төлөх"
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
          onLogin={async (identifier, password) => {
            setAuthError("");
            setAuthLoading(true);
            try {
              await login(identifier, password);
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
          onSuccess={handlePaymentSuccess}
          onClose={() => setCheckoutResult(null)}
        />
      )}
    </div>
  );
}
