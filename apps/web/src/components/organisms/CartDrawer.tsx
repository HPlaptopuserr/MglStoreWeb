"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Trash2, ShoppingCart, Plus, Minus } from "lucide-react";
import { useCart } from "@/hooks/useCart";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, total, removeFromCart, updateQuantity, clearCart } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 z-[70] h-full w-full max-w-[420px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-amber-500" />
            <h2 className="text-base font-bold text-gray-900">Миний сагс</h2>
            {items.length > 0 && (
              <span className="ml-1 min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white px-1.5">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
              >
                <Trash2 size={13} />
                Бүгд устгах
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center">
                <ShoppingCart size={32} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Сагс хоосон байна</p>
              <button
                onClick={onClose}
                className="text-sm font-semibold text-amber-600 hover:underline"
              >
                Дэлгүүр рүү буцах →
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-3 items-start">
                {/* Image */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <ShoppingCart size={20} className="text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{item.name}</p>
                  <p className="text-sm font-black text-amber-600 mt-0.5">₮{(item.price).toLocaleString()}</p>

                  {/* Qty controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:border-gray-400 transition-colors active:bg-gray-50"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-bold text-gray-900 min-w-[20px] text-center tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:border-gray-400 transition-colors active:bg-gray-50"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* Line total + remove */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900 tabular-nums">
                    ₮{(item.price * item.quantity).toLocaleString()}
                  </p>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="mt-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-5 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Нийт дүн</span>
              <span className="text-xl font-black text-gray-900 tabular-nums">
                ₮{total.toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => { onClose(); router.push("/checkout"); }}
              className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors active:scale-[0.99] text-sm"
            >
              Захиалга өгөх
            </button>
            <button
              onClick={onClose}
              className="w-full h-10 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Дэлгүүр хэсэх үргэлжлүүлэх
            </button>
          </div>
        )}
      </div>
    </>
  );
}
