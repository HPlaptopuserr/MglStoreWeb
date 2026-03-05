"use client";
import React from "react";
import { Text } from "../../../../../../../packages/ui/src/atoms/Text";
import { Button } from "../../../../../../../packages/ui/src/atoms/Button";
import { ArrowRight } from "lucide-react";

export const PartnershipHeroSection: React.FC = () => {
  return (
    <section className="relative w-full bg-gray-900 py-24 px-4 md:px-6 lg:px-8 overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#FFB700]/10 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm font-medium backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-[#FFB700]"></span>
              Түншлэлийн боломжууд
            </div>

            <Text size="lg" color="white" className="max-w-xl">
              Манай борлуулалтын болон ангиллын зөвлөхүүд таны бизнесийн
              хэрэгцээнд нийцсэн шийдлүүдийг боловсруулахын тулд тантай нягт
              хамтран ажиллах болно. Бид бүтээгдэхүүнийхээ онцлогийг
              шинэчилснээр бизнесийн бодит үнэ цэнийг хүргэхэд анхаарч байна.
            </Text>

            <div className="flex flex-wrap gap-4 pt-4">
              <Button
                size="lg"
                className="group"
                onClick={() => {
                  const el = document.getElementById("partnership-form");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Хамтран ажиллах
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          <div className="relative lg:h-[600px] flex items-center justify-center animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
            <div className="relative w-full max-w-md aspect-square">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFB700] to-orange-600 rounded-[2rem] rotate-3 opacity-20 blur-xl"></div>
              <div className="absolute inset-0 bg-gray-800 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                <div className="h-14 border-b border-white/10 flex items-center px-6 gap-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
                <div className="p-8 grid grid-cols-2 gap-6">
                  <div className="col-span-2 h-32 bg-white/5 rounded-xl animate-pulse"></div>
                  <div className="h-32 bg-white/5 rounded-xl animate-pulse delay-100"></div>
                  <div className="h-32 bg-white/5 rounded-xl animate-pulse delay-200"></div>
                  <div className="col-span-2 h-16 bg-[#FFB700]/20 rounded-xl border border-[#FFB700]/30 flex items-center justify-center">
                    <span className="text-[#FFB700] font-bold">
                      Growth +125%
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute -top-6 -right-6 bg-white p-4 rounded-xl shadow-xl animate-bounce-slow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-green-600 -rotate-45" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Revenue</div>
                    <div className="font-bold text-gray-900">$12,450</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
