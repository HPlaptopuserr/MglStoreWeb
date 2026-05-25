"use client";

import React, { useState, useMemo } from "react";
import { ServiceCategory } from "../types";
import { ServiceCategoryCard } from "./ServiceCategoryCard";
import { CartSummary } from "./CartSummary";
import { Loader2 } from "lucide-react";
import { API } from "@/lib/api";
import { ServiceQPayModal } from "./ServiceQPayModal";

interface Props {
  categories: ServiceCategory[];
  loading: boolean;
}

export function ServiceSelector({ categories, loading }: Props) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedPrices, setSelectedPrices] = useState<Record<string, number>>({});
  
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [qpayData, setQpayData] = useState<any>(null);

  const toggleItem = (id: string, price: number, parentId?: string) => {
    const newSet = new Set(selectedItems);
    const newPrices = { ...selectedPrices };
    
    if (parentId) {
      // It's a mutually exclusive option (radio)
      // Unselect any other option from the same parent
      Array.from(newSet).forEach(selectedId => {
        if (selectedId.startsWith(`${parentId}_`) && selectedId !== id) {
          newSet.delete(selectedId);
          delete newPrices[selectedId];
        }
      });
      // Also ensure parent itself is not selected
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
        delete newPrices[parentId];
      }
      
      // Toggle logic for the option
      if (newSet.has(id)) {
        newSet.delete(id);
        delete newPrices[id];
      } else {
        newSet.add(id);
        newPrices[id] = Number(price) || 0;
      }
    } else {
      // Normal multiple selection checkbox
      if (newSet.has(id)) {
        newSet.delete(id);
        delete newPrices[id];
      } else {
        newSet.add(id);
        newPrices[id] = Number(price) || 0;
      }
    }
    
    setSelectedItems(newSet);
    setSelectedPrices(newPrices);
  };

  const totalPrice = useMemo(() => {
    return Object.values(selectedPrices).reduce((sum, price) => sum + (Number(price) || 0), 0);
  }, [selectedPrices]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Үйлчилгээнүүд ачаалж байна...</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>Одоогоор санал болгох үйлчилгээ байхгүй байна.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start relative">
      <div className="flex-1 w-full max-w-4xl pb-32 lg:pb-0">
        {categories.map((cat) => (
          <ServiceCategoryCard 
            key={cat.id} 
            category={cat} 
            selectedItems={selectedItems} 
            onToggleItem={toggleItem} 
          />
        ))}
      </div>
      
      <div className="w-full lg:w-96 lg:sticky lg:top-24 fixed bottom-0 left-0 right-0 z-40 bg-white lg:bg-transparent shadow-2xl lg:shadow-none border-t lg:border-none border-slate-200">
        <CartSummary 
          selectedCount={selectedItems.size} 
          totalPrice={totalPrice} 
          loading={isCheckingOut}
          onCheckout={async () => {
            if (selectedItems.size === 0) {
              alert("Та үйлчилгээ сонгоогүй байна.");
              return;
            }
            try {
              setIsCheckingOut(true);
              const res = await fetch(`${API}/site-settings/mgl-services/qpay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  total: totalPrice,
                  items: Array.from(selectedItems),
                }),
              });
              const data = await res.json();
              if (data.success) {
                setQpayData(data);
              } else {
                alert(data.message || "Алдаа гарлаа");
              }
            } catch (e) {
              console.error(e);
              alert("Холболтын алдаа гарлаа");
            } finally {
              setIsCheckingOut(false);
            }
          }}
        />
      </div>

      {qpayData && (
        <ServiceQPayModal
          orderId={qpayData.orderId}
          orderNumber={qpayData.orderNumber}
          total={totalPrice}
          invoiceId={qpayData.invoiceId}
          qrImage={qpayData.qrImage}
          deepLinks={qpayData.urls}
          onSuccess={() => {
            setQpayData(null);
            setSelectedItems(new Set());
            setSelectedPrices({});
          }}
          onClose={() => setQpayData(null)}
        />
      )}
    </div>
  );
}
