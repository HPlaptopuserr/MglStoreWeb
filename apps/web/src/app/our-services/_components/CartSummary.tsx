import React, { useState } from "react";
import { ShoppingBag, ArrowRight, Loader2, Check } from "lucide-react";

interface Props {
  selectedCount: number;
  totalPrice: number;
  onCheckout: () => void;
  loading?: boolean;
}

export function CartSummary({ selectedCount, totalPrice, onCheckout, loading }: Props) {
  const [termsAccepted, setTermsAccepted] = useState(false);

  return (
    <div className="bg-white lg:rounded-3xl lg:border border-slate-100 lg:shadow-xl p-5 lg:p-6 transition-all">
      <div className="hidden lg:flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
          <ShoppingBag className="w-6 h-6 text-black" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Таны сагс</h3>
          <p className="text-xs text-slate-500 font-medium">Сонгосон үйлчилгээнүүд</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:gap-4">
        {/* Нөхцөл зөвшөөрөх хэсэг */}
        <label 
          className={`flex items-start gap-3 p-3 lg:p-4 rounded-xl border cursor-pointer transition-all order-1 lg:order-2
            ${termsAccepted ? "bg-blue-50/50 border-blue-200" : "bg-red-50/30 border-red-100 hover:border-red-200"}`}
        >
          <div className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded flex items-center justify-center border transition-colors
            ${termsAccepted ? "bg-blue-600 border-blue-600" : "bg-white border-red-300"}`}
          >
            {termsAccepted && <Check className="w-3.5 h-3.5 text-white" />}
          </div>
          <p className={`text-[11px] lg:text-xs leading-relaxed text-justify select-none
            ${termsAccepted ? "text-slate-700" : "text-slate-600"}`}
          >
            <span className={`font-bold ${termsAccepted ? "text-blue-700" : "text-red-600"}`}>
              Үйлчилгээний нөхцөл:
            </span>{" "}
            Ажлын 3 хоногийн дотор танд манай хамт олноос хариу ирээгүй эсвэл үйлчилгээг эхлээгүй тохиолдолд таны төлбөрийг ажлын 5 хоногт багтаан буцаан олгох болно. Мөн та төлбөр төлснөөс хойш буцаах хүсэлт гаргавал 20%-ийн суутгалтай байхыг хүлээн зөвшөөрч байна.
          </p>
          {/* Hide the actual checkbox input but keep it accessible */}
          <input 
            type="checkbox" 
            className="sr-only" 
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
        </label>

        <div className="flex lg:flex-col justify-between items-center lg:items-stretch gap-4 order-2 lg:order-1">
          <div className="flex flex-col gap-1">
            <div className="text-xs lg:text-sm text-slate-500 font-medium flex items-center justify-between">
              <span className="hidden lg:inline">Сонгосон тоо:</span>
              <span className="lg:hidden text-[10px] uppercase tracking-wider">Сонгосон:</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full ml-2 lg:ml-0">{selectedCount}</span>
            </div>
            
            <div className="lg:mt-4">
              <div className="hidden lg:block text-[10px] lg:text-xs text-slate-400 font-medium uppercase tracking-wider mb-1 lg:mb-2">Нийт дүн</div>
              <div className="text-xl lg:text-4xl font-black text-black tracking-tight flex items-baseline gap-1">
                {totalPrice.toLocaleString()}
                <span className="text-base font-bold text-slate-400">₮</span>
              </div>
            </div>
          </div>

          <div className="flex-1 lg:flex-none flex flex-col gap-2 lg:mt-6">
            <button
              onClick={onCheckout}
              disabled={selectedCount === 0 || loading || !termsAccepted}
              className="bg-black text-white w-full px-6 py-3.5 lg:py-4 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-base flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFAD02] hover:text-black hover:-translate-y-1 disabled:hover:bg-black disabled:hover:text-white disabled:hover:translate-y-0 shadow-lg shadow-black/10"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" /> Түр хүлээнэ үү...</>
              ) : (
                <>Захиалах <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5" /></>
              )}
            </button>
            {!termsAccepted && selectedCount > 0 && (
              <p className="text-[10px] text-red-500 text-center font-medium animate-pulse hidden lg:block">
                Захиалахын тулд нөхцөлийг зөвшөөрнө үү
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
