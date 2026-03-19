"use client";
import React from "react";
import { Text, Button } from "@mgl/ui";
import {
  ArrowRight,
  TrendingUp,
  Users,
  BarChart3,
  Shield,
  Megaphone,
  HeadphonesIcon,
  LayoutDashboard,
} from "lucide-react";

const stats = [
  {
    value: "500+",
    label: "Түнш байгууллага",
    icon: Users,
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
  },
  {
    value: "98%",
    label: "Сэтгэл ханамж",
    icon: BarChart3,
    color: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
  },
  {
    value: "3x",
    label: "Борлуулалтын өсөлт",
    icon: TrendingUp,
    color: "from-[#FFB700]/20 to-orange-500/10",
    iconColor: "text-[#FFB700]",
  },
];

const features = [
  {
    text: "Тусгай хөнгөлөлт & үнийн нөхцөл",
    icon: Shield,
    desc: "Түншүүдэд зориулсан онцгой үнийн санал",
  },
  {
    text: "Маркетингийн хамтарсан дэмжлэг",
    icon: Megaphone,
    desc: "Хамтарсан сурталчилгаа, кампанит ажил",
  },
  {
    text: "Бэлтгэгдсэн менежер & техникийн туслалцаа",
    icon: HeadphonesIcon,
    desc: "24/7 дэмжлэг, хурдан хариу өгөх баталгаа",
  },
  {
    text: "Бодит цагийн аналитик дашбоард",
    icon: LayoutDashboard,
    desc: "Борлуулалт, захиалга бүрийг нэг дороос",
  },
];

export const PartnershipHeroSection: React.FC = () => {
  return (
    <section className="relative w-full bg-gray-900 py-24 px-4 md:px-6 lg:px-8 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-[#FFB700]/10 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-[#FFB700]/5 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Text content */}
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm font-medium backdrop-blur-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFB700] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFB700]"></span>
              </span>
              Түншлэлийн боломжууд
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Хамтдаа{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FFB700] to-orange-400">
                  өсөлтийг
                </span>{" "}
                бий болгоё
              </h1>
              <Text size="lg" color="white" className="max-w-xl opacity-80">
                Манай борлуулалтын болон бизнесийн зөвлөхүүд таны байгууллагын
                хэрэгцээг ойлгож, хамгийн тохиромжтой шийдлийг хамтран
                боловсруулна.
              </Text>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 text-white/50 text-sm">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-linear-to-br from-gray-600 to-gray-700 border-2 border-gray-900 flex items-center justify-center text-[10px] text-white/70 font-medium"
                  >
                    {["А", "Б", "В", "Г"][i]}
                  </div>
                ))}
              </div>
              <span>500+ байгууллага итгэж ажиллаж байна</span>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Button
                size="lg"
                className="group bg-[#FFB700] hover:bg-[#E5A500] text-gray-900 font-semibold shadow-lg shadow-[#FFB700]/25"
                onClick={() => {
                  const el = document.getElementById("partnership-form");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Хамтран ажиллах
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                className="bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur-sm"
                onClick={() => {
                  const el = document.getElementById("partnership-benefits");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Дэлгэрэнгүй
              </Button>
            </div>
          </div>

          <div className="relative flex items-center justify-center animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
            <div className="relative w-full max-w-lg">
              <div className="absolute -inset-6 bg-linear-to-br from-[#FFB700]/15 to-blue-500/10 rounded-[3rem] blur-3xl pointer-events-none"></div>
              <div className="absolute -inset-2 bg-linear-to-tr from-blue-500/10 to-[#FFB700]/5 rounded-[2.5rem] blur-xl pointer-events-none"></div>

              <div className="relative bg-white/6 backdrop-blur-xl rounded-4xl border border-white/8 shadow-2xl overflow-hidden">
                <div className="px-8 pt-8 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white text-xl font-bold">
                        Түншлэлийн давуу талууд
                      </h3>
                      <p className="text-white/40 text-sm mt-1">
                        Бидний платформд нэгдэх үндсэн шалтгаанууд
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#FFB700]/10 border border-[#FFB700]/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-[#FFB700]" />
                    </div>
                  </div>
                </div>

                <div className="px-8 pb-2">
                  <div className="grid grid-cols-3 gap-3">
                    {stats.map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div
                          key={stat.label}
                          className={`relative text-center p-4 rounded-xl bg-linear-to-b ${stat.color} border border-white/6 group hover:border-white/10 transition-all duration-300`}
                        >
                          <Icon
                            className={`w-4 h-4 ${stat.iconColor} mx-auto mb-2 opacity-60 group-hover:opacity-100 transition-opacity`}
                          />
                          <div className="text-2xl font-bold text-white">
                            {stat.value}
                          </div>
                          <div className="text-[11px] text-white/50 mt-1 leading-tight">
                            {stat.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mx-8 my-4 h-px bg-linear-to-r from-transparent via-white/10 to-transparent"></div>

                <div className="px-8 pb-2 space-y-2">
                  {features.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={feature.text}
                        className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/4 hover:bg-white/7 hover:border-white/8 transition-all duration-300 group cursor-default"
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#FFB700]/10 border border-[#FFB700]/20 flex items-center justify-center shrink-0 group-hover:bg-[#FFB700]/20 transition-colors">
                          <Icon className="w-4 h-4 text-[#FFB700]" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-white/90 block">
                            {feature.text}
                          </span>
                          <span className="text-xs text-white/40 block mt-0.5 group-hover:text-white/55 transition-colors">
                            {feature.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="m-8 mt-4">
                  <div className="relative flex items-center gap-4 p-5 rounded-xl bg-linear-to-r from-[#FFB700]/15 via-[#FFB700]/10 to-orange-500/5 border border-[#FFB700]/20 overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/3 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"></div>
                    <div className="w-12 h-12 rounded-xl bg-[#FFB700] flex items-center justify-center shrink-0 shadow-lg shadow-[#FFB700]/20">
                      <TrendingUp className="w-6 h-6 text-gray-900" />
                    </div>
                    <div>
                      <div className="text-sm text-white/70">
                        Дундаж орлогын өсөлт
                      </div>
                      <div className="text-2xl font-bold text-[#FFB700]">
                        +125%{" "}
                        <span className="text-sm font-normal text-white/40">
                          / жил
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -top-3 -right-3 bg-white px-4 py-2.5 rounded-2xl shadow-2xl shadow-black/20 flex items-center gap-2.5 border border-gray-100">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className="text-sm font-bold text-gray-900">
                  Нээлттэй
                </span>
              </div>

              <div className="absolute -bottom-3 -left-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 flex items-center gap-2.5">
                <div className="flex -space-x-1.5">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-linear-to-br from-gray-500 to-gray-600 border-2 border-gray-900"
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-white/80">
                  +12 энэ долоо хоногт
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </section>
  );
};
