"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { SharedStoreLogin } from "./SharedStoreLogin";
import { SHARED_STORE_CHECKOUT_URL } from "./config";
import { useSharedCatalog } from "./useSharedCatalog";
import { useBasketHandoff } from "./useBasketHandoff";
import { useSharedBasket } from "./useSharedBasket";
import { SharedStoreTopbar } from "./SharedStoreTopbar";
import { SharedStoreHero } from "./SharedStoreHero";
import { SharedCatalogPanel } from "./SharedCatalogPanel";
import { SharedProductDetail } from "./SharedProductDetail";
import { SharedBasket } from "./SharedBasket";
import { SharedCheckout } from "./SharedCheckout";
import { SharedPayment } from "./SharedPayment";
import { SharedOrders } from "./SharedOrders";
import { StoreDialog } from "./StoreDialog";
import { money, type SharedProduct, type RetailOrder } from "./types";
export function SharedStore() {
  const profileRef = useRef<HTMLDivElement>(null);
  const catalog = useSharedCatalog();
  const basket = useSharedBasket();
  const { user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [basketOpen, setBasketOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const restoreBasket = useCallback(() => setBasketOpen(true), []);
  useBasketHandoff(restoreBasket);
  const [detail, setDetail] = useState<SharedProduct | null>(null);
  const [order, setOrder] = useState<RetailOrder | null>(null);
  const [revision, setRevision] = useState(0);
  const { removePurchased } = basket;
  const { refresh: refreshCatalog } = catalog;
  const paid = useCallback(
    (paidOrder: RetailOrder) => {
      removePurchased(paidOrder.items);
      setRevision((value) => value + 1);
      refreshCatalog();
    },
    [removePurchased, refreshCatalog],
  );
  const checkout = () => {
    if (SHARED_STORE_CHECKOUT_URL) {
      const transfer = encodeURIComponent(
        JSON.stringify(
          basket.lines.map((line) => ({
            id: line.product.id,
            quantity: line.quantity,
          })),
        ),
      );
      window.location.assign(`${SHARED_STORE_CHECKOUT_URL}#basket=${transfer}`);
      return;
    }
    setBasketOpen(false);
    if (!user) setLoginOpen(true);
    else setCheckoutOpen(true);
  };
  useEffect(() => {
    const open = () => setBasketOpen(true);
    window.addEventListener("mgl_shared_store_basket_open", open);
    return () =>
      window.removeEventListener("mgl_shared_store_basket_open", open);
  }, []);
  const warehouse =
    catalog.data?.warehouses?.[0] ||
    catalog.data?.products[0]?.warehouse ||
    undefined;
  return (
    <div className="min-h-screen bg-[#f7f8fa] pb-24">
      <SharedStoreTopbar
        profileRef={profileRef}
        warehouse={warehouse}
        search={catalog.search}
        onSearch={catalog.setSearch}
        onBasket={() => setBasketOpen(true)}
        count={basket.count}
      />
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6 lg:px-8 lg:py-6">
        <nav
          aria-label="Хуудасны зам"
          className="mb-4 flex items-center gap-2 text-xs text-slate-400"
        >
          <Link href="/" className="hover:text-slate-900">
            Нүүр
          </Link>
          <ChevronRight size={12} />
          <span aria-current="page" className="text-slate-700">
            Дундын дэлгүүр
          </span>
        </nav>
        <div ref={profileRef}>
          <SharedStoreHero
            total={catalog.data?.total || 0}
            warehouse={warehouse}
            count={basket.count}
            onBasket={() => setBasketOpen(true)}
          />
        </div>
        <SharedCatalogPanel
          catalog={catalog}
          lines={basket.lines}
          onAdd={basket.add}
          onDetail={setDetail}
        />
        <SharedOrders revision={revision} onSelect={setOrder} />
        <p
          role="status"
          aria-live="polite"
          className="mt-4 min-h-5 text-center text-xs text-emerald-800"
        >
          {basket.notice}
        </p>
        {basket.count > 0 && (
          <button
            onClick={() => setBasketOpen(true)}
            className="fixed bottom-5 left-4 right-4 z-40 mx-auto flex min-h-14 max-w-sm items-center justify-between rounded-2xl bg-emerald-950 px-5 text-sm font-bold text-white shadow-xl focus-visible:ring-2 focus-visible:ring-orange-500 sm:left-auto sm:right-6 sm:w-80"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={18} />
              Сагс харах · {basket.count}
            </span>
            <span>{money(basket.total)} →</span>
          </button>
        )}
        {basketOpen && (
          <StoreDialog
            title="Таны сонгосон бараа"
            onClose={() => setBasketOpen(false)}
          >
            <SharedBasket basket={basket} onCheckout={checkout} />
          </StoreDialog>
        )}
        {detail && (
          <SharedProductDetail
            product={detail}
            onClose={() => setDetail(null)}
            onAdd={() => {
              basket.add(detail);
              setDetail(null);
            }}
          />
        )}
        {checkoutOpen && (
          <SharedCheckout
            lines={basket.lines}
            onClose={() => setCheckoutOpen(false)}
            onOrder={(created) => {
              setCheckoutOpen(false);
              setOrder(created);
              setRevision((value) => value + 1);
            }}
          />
        )}
        {order && (
          <SharedPayment
            initialOrder={order}
            onPaid={paid}
            onClose={() => {
              setOrder(null);
              setRevision((value) => value + 1);
            }}
          />
        )}
        {loginOpen && (
          <SharedStoreLogin
            onClose={() => setLoginOpen(false)}
            onSuccess={() => {
              setLoginOpen(false);
              setCheckoutOpen(true);
            }}
          />
        )}
      </div>
    </div>
  );
}
