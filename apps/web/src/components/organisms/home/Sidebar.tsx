"use client";
import React, { useState, useRef } from "react";
import {
  ChevronRight,
  Search,
  Star,
  Smartphone,
  Plane,
  Heart,
  Briefcase,
  GraduationCap,
  Building2,
} from "lucide-react";
import Link from "next/link";

const PARTNERS = [
  {
    category: "Хүнс",
    name: "Unitel",
    slug: "unitel",
    icon: Smartphone,
    iconColor: "text-red-500",
    bgColor: "bg-red-50",
    actions: ["Урьдчилсан төлбөрт", "Дараа төлбөрт", "Интернэт", "Төхөөрөмж"],
  },
  {
    category: "Цайны газар / Ресторан",
    name: "Hunnu Air",
    slug: "hunnu-air",
    icon: Plane,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
    actions: [
      "Олон улсын нислэг",
      "Орон нутгийн нислэг",
      "Ачаа тээвэр",
      "Захиалга",
    ],
  },
  {
    category: "Зочид буудал",
    name: "Monos Pharma",
    slug: "monos-pharma",
    icon: Heart,
    iconColor: "text-green-500",
    bgColor: "bg-green-50",
    actions: ["Эмийн бүтээгдэхүүн", "Витамин", "Гоо сайхан", "Эрүүл мэнд"],
  },
  {
    category: "Эмийн сан",
    name: "Tavan Bogd",
    slug: "tavan-bogd",
    icon: Briefcase,
    iconColor: "text-slate-500",
    bgColor: "bg-slate-100",
    actions: ["Автомашин", "Тоног төхөөрөмж", "Үйлчилгээ", "Бусад"],
  },
  {
    category: "Аялал жуулчлал",
    name: "NUM",
    slug: "num",
    icon: GraduationCap,
    iconColor: "text-pink-500",
    bgColor: "bg-pink-50",
    actions: ["Бакалавр", "Магистр", "Доктор", "Судалгаа"],
  },
  {
    category: "Барлига, Үл хөдлөх",
    name: "Khan Bank",
    slug: "khan-bank",
    icon: Building2,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-50",
    actions: ["Иргэдийн банк", "Байгууллагын банк", "Карт", "Зээл"],
  },
  {
    category: "Барилгын дэлгүүр",
    name: "Nomin",
    slug: "nomin",
    icon: Building2,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-50",
    actions: ["Электрон бараа", "Хүнс", "Ахуйн хэрэглээ", "Гоо сайхан"],
  },
  {
    category: "Банк санхүү",
    name: "Golomt Bank",
    slug: "golomt-bank",
    icon: Building2,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-50",
    actions: ["Хадгаламж", "Зээл", "Карт", "Төлбөр тооцоо"],
  },
];

const FILTERS = [
  "Хүнс",
  "Цайны газар / Ресторан",
  "Зочид буудал",
  "Эмийн сан",
  "Аялал жуулчлал",
  "Барлига, Үл хөдлөх",
  "Барилгын дэлгүүр",
];

export const Sidebar = () => {
  const [activePartner, setActivePartner] = useState<
    (typeof PARTNERS)[0] | null
  >(null);
  const [menuTop, setMenuTop] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="hidden lg:flex flex-col w-70 shrink-0 h-full max-h relative z-30"
      onMouseLeave={() => setActivePartner(null)}
    >
      <div className="bg-[#111827] rounded-2xl p-5 shadow-md z-10 relative shrink-0">
        <div className="flex items-start gap-3">
          <Star className="text-amber-500 fill-amber-500 mt-1" size={20} />
          <div>
            <h2 className="text-white font-bold text-lg">Хамтран ажиллагч</h2>
            <p className="text-slate-400 text-sm mt-0.5">Байгууллагууд</p>
          </div>
        </div>
      </div>

      <div
        ref={wrapperRef}
        className="bg-white rounded-2xl shadow-sm flex flex-col flex-1 min-h-0 overflow-visible -mt-2 pt-4 relative"
      >
        <div className="px-4 pb-4 border-b border-slate-100 shrink-0">
          <div className="relative mb-4">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search partners..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-sm outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {FILTERS.map((filter, idx) => (
              <button
                key={filter}
                className={`flex shrink-0 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  idx === 0
                    ? "bg-amber-500 text-white"
                    : idx === 2
                      ? "text-blue-600 bg-white border border-blue-200 shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar relative min-h-0">
          {PARTNERS.map((partner, idx) => {
            const isActive = activePartner?.name === partner.name;
            return (
              <div
                key={idx}
                className="mb-6 last:mb-2 relative"
                onMouseEnter={(e) => {
                  setActivePartner(partner);
                  if (wrapperRef.current) {
                    const wrapperRect =
                      wrapperRef.current.getBoundingClientRect();
                    const itemRect = e.currentTarget.getBoundingClientRect();

                    let offset = itemRect.top - wrapperRect.top;

                    const anticipatedMenuHeight = 400;
                    if (
                      itemRect.top + anticipatedMenuHeight >
                      window.innerHeight
                    ) {
                      offset -=
                        itemRect.top +
                        anticipatedMenuHeight -
                        window.innerHeight +
                        20;
                    }

                    setMenuTop(Math.max(0, offset));
                  }
                }}
              >
                <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-3">
                  {partner.category}
                </h3>
                <Link
                  href={`/organizations/${partner.slug}`}
                  className={`flex items-center justify-between group cursor-pointer p-2.5 -mx-2.5 rounded-xl transition-all ${isActive ? "bg-orange-50/50 shadow-sm ring-1 ring-orange-100/50" : "hover:bg-slate-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${partner.bgColor} ${isActive ? "shadow-md scale-105" : ""}`}
                    >
                      <partner.icon size={18} className={partner.iconColor} />
                    </div>
                    <span
                      className={`font-bold text-sm transition-colors ${isActive ? "text-orange-600" : "text-slate-700 group-hover:text-orange-500"}`}
                    >
                      {partner.name}
                    </span>
                  </div>
                  <ChevronRight
                    size={14}
                    className={`transition-all ${isActive ? "text-orange-500 translate-x-1" : "text-slate-300 group-hover:text-amber-500"}`}
                  />
                </Link>
              </div>
            );
          })}
        </div>

        {activePartner && (
          <div
            className="absolute left-[calc(100%+8px)] w-138 min-h-100 h-fit max-h-96 bg-white rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.08),-4px_0_20px_rgba(0,0,0,0.04)] border border-slate-100 z-50 flex flex-col animate-in fade-in slide-in-from-left-2 duration-200 overflow-hidden"
            style={{ top: `${menuTop}px` }}
          >
            <div className="p-6 md:p-8 pb-6 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${activePartner.bgColor}`}
                  >
                    <activePartner.icon
                      size={28}
                      className={activePartner.iconColor}
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                      {activePartner.name}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-0.5">
                      {activePartner.category}
                    </p>
                  </div>
                </div>
                <Link href={`/organizations/${activePartner.slug}`}>
                  <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-md shadow-orange-500/20 transition-all border-none">
                    Нэвтрэх
                  </button>
                </Link>
              </div>
            </div>

            <div className="relative p-6 md:p-8 grid grid-cols-[1.2fr_1fr] gap-8 overflow-y-auto">
              <div className="flex flex-col space-y-5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></span>
                  Үйлчилгээний чиглэл
                </h3>
                <ul className="space-y-4">
                  {activePartner.actions.map((action, idx) => (
                    <li key={idx}>
                      <Link
                        href={`/organizations/${activePartner.slug}`}
                        className="text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors flex items-center gap-3 group"
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-50 group-hover:bg-orange-50 flex items-center justify-center transition-colors">
                          <ChevronRight
                            size={12}
                            className="text-slate-400 group-hover:text-orange-500"
                          />
                        </div>
                        {action}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-linear-to-br from-[#fff9e6] to-[#fff0c2] rounded-3xl p-6 flex flex-col justify-between border border-amber-200/50 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/40 rounded-full blur-2xl -z-10 group-hover:scale-125 transition-transform duration-700"></div>
                <div>
                  <span className="inline-flex items-center justify-center px-3 py-1 bg-white/80 backdrop-blur-sm text-orange-600 text-[10px] font-extrabold uppercase tracking-widest rounded-full shadow-sm mb-4">
                    Хямдрал
                  </span>
                  <h3 className="text-xl font-bold text-slate-800 leading-tight z-10 relative">
                    Тусгай санал
                    <br />
                    багцууд
                  </h3>
                  <p className="text-xs text-amber-700/70 mt-2 font-medium">
                    Зөвхөн MGL Store-д
                  </p>
                </div>
                <Link href={`/organizations/${activePartner.slug}`}>
                  <span className="mt-8 text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 group/btn relative z-10">
                    Дэлгэрэнгүй{" "}
                    <ChevronRight
                      size={16}
                      className="group-hover/btn:translate-x-1.5 transition-transform"
                    />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
