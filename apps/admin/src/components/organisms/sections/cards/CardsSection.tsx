"use client";

import { useEffect, useRef, useState } from "react";
import { Printer, Loader2, CreditCard } from "lucide-react";
import {
  BusinessCardFront,
  BusinessCardBack,
  type CardColorScheme,
  type BusinessCardData,
} from "@mgl/ui";
import { usePartners } from "@/hooks/sections/usePartners";
import { CardPartnerSelector } from "@/components/molecules/sections/cards/CardPartnerSelector";
import { CardSchemePicker } from "@/components/molecules/sections/cards/CardSchemePicker";
import { CardDetailsPanel } from "@/components/molecules/sections/cards/CardDetailsPanel";
import { runPrint, detectWebBaseUrl, buildBackPrintOrder } from "@/lib/sections/utils";
import { PRINT_COPIES } from "@/lib/sections/constants";

export function CardsSection() {
  const [webBaseUrl, setWebBaseUrl] = useState("https://mglstore.mn");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [cardScheme, setCardScheme] = useState<CardColorScheme>("default");
  const printAreaRef = useRef<HTMLDivElement>(null);

  const { partners } = usePartners(true);

  useEffect(() => {
    setWebBaseUrl(detectWebBaseUrl());
  }, []);

  useEffect(() => {
    if (!selectedPartnerId && partners.length > 0) {
      setSelectedPartnerId(partners[0].id);
    }
  }, [partners, selectedPartnerId]);

  const selectedPartner = partners.find((p) => p.id === selectedPartnerId);
  const profileTarget = selectedPartner
    ? (selectedPartner.slug?.trim() || selectedPartner.id)
    : "";

  const cardData: BusinessCardData | null = selectedPartner
    ? {
        name: selectedPartner.name,
        type: selectedPartner.type ?? undefined,
        slug: profileTarget,
        profileTarget,
        profileId: selectedPartner.id,
        category: selectedPartner.businessCategory ?? undefined,
        phone: selectedPartner.phone ?? undefined,
        address: selectedPartner.address ?? undefined,
        logoUrl: selectedPartner.logoUrl ?? undefined,
        bannerUrl: selectedPartner.bannerUrl ?? undefined,
      }
    : null;

  const qrPreviewUrl = cardData
    ? `${webBaseUrl}/o/${encodeURIComponent(cardData.profileTarget || cardData.slug)}`
    : "";

  const printSlots = Array.from({ length: PRINT_COPIES }, (_, i) => i);
  const backPrintSlots = buildBackPrintOrder(PRINT_COPIES, 2);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Бизнесийн карт хэвлэх</h2>
          <p className="text-sm text-slate-400">
            Гишүүн байгууллагын бизнес карт үүсгэж хэвлэнэ. QR код уншуулахад байгууллагын
            профайл руу хөтлөнө.
          </p>
        </div>
        <button
          onClick={() => runPrint(printAreaRef)}
          disabled={!cardData}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 shadow-sm"
        >
          <Printer size={16} />
          Карт хэвлэх
        </button>
      </div>

      {partners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={40} strokeWidth={1.5} className="animate-spin text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-400">
            Байгууллагуудыг татаж байна...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: controls */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <CardPartnerSelector
              partners={partners}
              selectedId={selectedPartnerId}
              setSelectedId={setSelectedPartnerId}
            />
            <CardSchemePicker cardScheme={cardScheme} setCardScheme={setCardScheme} />
            {cardData && (
              <CardDetailsPanel cardData={cardData} qrPreviewUrl={qrPreviewUrl} />
            )}
          </div>

          {/* Right: card preview */}
          <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/70 p-6 flex flex-col gap-6 items-center justify-start pt-6">
            {cardData ? (
              <>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">
                    Нүүр тал
                  </p>
                  <BusinessCardFront data={cardData} scheme={cardScheme} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">
                    Ар тал
                  </p>
                  <BusinessCardBack
                    data={cardData}
                    scheme={cardScheme}
                    webBaseUrl={webBaseUrl}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <CreditCard size={48} strokeWidth={1.5} />
                <p className="mt-3 text-sm font-medium text-slate-400">Байгууллага сонгоно уу</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden print area */}
      {cardData && (
        <div id="card-print-area" ref={printAreaRef} style={{ display: "none" }}>
          <div className="print-page print-page-front">
            {printSlots.map((slot) => (
              <div key={`front-${slot}`} className="print-card-slot">
                <BusinessCardFront data={cardData} scheme={cardScheme} />
              </div>
            ))}
          </div>
          <div className="print-page print-page-back">
            {backPrintSlots.map((slot) => (
              <div key={`back-${slot}`} className="print-card-slot">
                <BusinessCardBack data={cardData} scheme={cardScheme} webBaseUrl={webBaseUrl} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
