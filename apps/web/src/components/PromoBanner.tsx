import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@mgl/ui";

export const PromoBanner = () => {
  return (
    <div className="bg-[#fff9e6] w-full h-full rounded-2xl md:rounded-3xl p-8 md:p-14 lg:p-16 grid xl:grid-cols-2 gap-10 items-center">
      <div className="flex flex-col items-start space-y-6 z-10 w-full max-w-xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-orange-500 text-[11px] font-extrabold tracking-widest uppercase border border-orange-200">
          <span className="flex h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]"></span>
          Хамгийн их борлуулалттай
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-[70px] font-extrabold text-[#0f172a] leading-[1.05] tracking-tight">
          Organic <br />
          Freshness <br />
          <span className="text-orange-500 block mt-1">Delivered</span>
          <span className="text-orange-500 block mt-1">Daily</span>
        </h1>

        <p className="text-slate-500 text-base md:text-lg max-w-[420px] leading-relaxed pt-2 font-medium">
          Фермийн шинэхэн ногоо, улирлын чанартай жимс, дээд зэргийн органик
          бүтээгдэхүүний шилдэг сонголтыг мэдрээрэй.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-4">
          <Button
            size="lg"
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 py-6 text-base font-bold shadow-lg shadow-orange-500/20 border-none transition-transform hover:scale-105"
          >
            Захиалах
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="bg-white border-none text-slate-700 hover:text-orange-600 hover:bg-slate-50 rounded-full px-8 py-6 text-base font-bold shadow-sm transition-colors"
          >
            Цааш нь үзэх
          </Button>
        </div>
      </div>

      <div className="relative h-full flex justify-center xl:justify-end items-center mt-12 xl:mt-0">
        <div className="relative w-full aspect-[4/3] max-w-[500px]">
          <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl relative border-4 border-white/50">
            <img
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
              alt="Fresh Vegetables Supermarket"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
