"use client";

import { Monitor } from "lucide-react";

export function MobileBlock() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center md:hidden">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <Monitor className="h-8 w-8 text-slate-400" />
      </div>
      <h2 className="text-lg font-bold text-slate-800">
        POS касс утсан дээр ажиллахгүй
      </h2>
      <p className="max-w-xs text-sm text-slate-500">
        POS систем нь зөвхөн компьютер болон таблет дээр ажилладаг. Томоохон
        дэлгэц ашиглана уу.
      </p>
    </div>
  );
}
