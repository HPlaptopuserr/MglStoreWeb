"use client";
import React, { useState } from "react";
import {
  Menu,
  ChevronRight,
  ChevronDown,
  User,
  Users,
  Baby,
  Home,
  Monitor,
  Smartphone,
  Sparkles,
  HeartPulse,
  Gem,
  Dumbbell,
  ShoppingBasket,
  Gamepad2,
  Ticket,
  BookOpen,
} from "lucide-react";

// Assuming Button is not available since @mgl/ui wasn't found,
// using a standard button with the given classes.
const Button = ({ children, className, onClick, variant, size }: any) => {
  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  );
};

// Data structure updated to support multiple subgroups per category
const MEGA_CATEGORIES = [
  {
    id: "women",
    name: "Эмэгтэй",
    icon: User,
    subgroups: [
      {
        title: "Эмэгтэй хувцас",
        items: [
          "Гадуур хувцас",
          "Футболка & Майк",
          "Цамц",
          "Хослол & Дан хүрэм",
          "Даашинз",
          "Юбка",
          "Өмд & Шорт",
          "Үргэлж хувцас & Сэт хувцас",
          "Үндэсний хувцас",
          "Дүрэмт хувцас",
        ],
      },
      {
        title: "Эмэгтэй гутал",
        items: [
          "Ботинка & Хагас түрийтэй гутал",
          "Түрийтэй гутал & Бүтэн",
          "Уулын & Цасны гутал",
          "Пүүз & Кет",
          "Өндөр өсгийт & Сандаль",
          "Углааш & Шаахай",
        ],
      },
      {
        title: "Хувцасны аксесуар & Дотуур хувцас",
        items: [
          "Малгай & Ороолт бээлий",
          "Дотуур хувцас & Даруулга",
          "Унтлагын хувцас",
          "Рейтуз & Трико",
          "Оймс",
          "Бүс & Мөрөвч",
          "Нарны шил & Шил",
          "Зангиа & Запонги",
        ],
      },
      {
        title: "Цүнх & Чемодан",
        items: [
          "Чемодан & Аяллын цүнх",
          "Үүргэвч",
          "Гар цүнх",
          "Бичгийн & Компьютерын цүнх",
          "Хэтэвч & Картын гэр",
          "Түлхүүрийн оосор & Аксессуар",
        ],
      },
    ],
  },
  {
    id: "men",
    name: "Эрэгтэй",
    icon: Users,
    subgroups: [
      {
        title: "Эрэгтэй хувцас",
        items: ["Гадуур хувцас", "Футболка & Майк", "Цамц", "Хослол & Пиджак"],
      },
      {
        title: "Эрэгтэй гутал",
        items: ["Кет & Пүүз", "Хагас түрийтэй", "Гоёлын гутал"],
      },
    ],
  },
  { id: "kids", name: "Хүүхдийн", icon: Baby, subgroups: [] },
  { id: "home", name: "Гэрийн & Тавилга", icon: Home, subgroups: [] },
  { id: "tech", name: "Технологи", icon: Monitor, subgroups: [] },
  {
    id: "appliances",
    name: "Цахилгаан хэрэгсэл",
    icon: Smartphone,
    subgroups: [],
  },
  { id: "beauty", name: "Гоо сайхан", icon: Sparkles, subgroups: [] },
  {
    id: "health",
    name: "Эрүүл мэнд & Эрүүл ахуй",
    icon: HeartPulse,
    subgroups: [],
  },
  { id: "jewelry", name: "Гоёл чимэглэл", icon: Gem, subgroups: [] },
  { id: "sports", name: "Спорт & Аялал", icon: Dumbbell, subgroups: [] },
  { id: "food", name: "Хүнс", icon: ShoppingBasket, subgroups: [] },
  { id: "toys", name: "Тоглоом & Хобби", icon: Gamepad2, subgroups: [] },
  { id: "art", name: "Урлаг энтертайнмент", icon: Ticket, subgroups: [] },
  { id: "books", name: "Ном & цомог, пянз", icon: BookOpen, subgroups: [] },
];

export const MegaMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(MEGA_CATEGORIES[0]);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);



  return (
    <div
      className="relative h-full flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button
        variant="ghost"
        className="flex items-center gap-2 text-sm font-bold text-gray-900 transition-colors h-full px-4 rounded-xl hover:bg-slate-50"
      >
        <Menu size={18} className="text-gray-900" />
        <span className="hidden xl:inline-block">Бүх ангилал</span>
        <ChevronDown size={14} className="text-gray-400 ml-1" />
      </Button>

      {isOpen && (
        <div className="absolute top-12 left-0 w-[1400px] h-[750px] bg-white rounded-r-2xl rounded-bl-2xl shadow-xl border border-slate-200 z-50 flex overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="w-[360px] bg-white border-r border-slate-100 flex flex-col pt-2 pb-6">
            <div
              className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide px-3 relative"
              data-lenis-prevent="true"
            >
              {MEGA_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory.id === category.id;
                return (
                  <div
                    key={category.id}
                    className={`flex items-center justify-between px-4 py-2 mt-1 rounded-lg cursor-pointer text-sm transition-colors ${isActive
                      ? "bg-[#ffad02] text-white font-medium shadow-sm transition-none"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    onMouseEnter={() => setActiveCategory(category)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2 : 1.5}
                        className={isActive ? "text-white" : "text-slate-400"}
                      />
                      <span>{category.name}</span>
                    </div>
                    {isActive && (
                      <ChevronRight
                        size={16}
                        className="text-white opacity-80"
                      />
                    )}
                  </div>
                );
              })}

              {/* Promotional brands / small menu links */}
              <div className="mt-8 mb-4 border-t border-slate-100 pt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <div className="flex items-center">
                    <span className="text-indigo-600 font-bold tracking-tight">
                      MGLSTORE
                    </span>
                    <span className="text-slate-900 font-bold ml-1">
                      brands
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <div className="flex items-center">
                    <span className="text-amber-500 font-bold tracking-tight">
                      MGLSTORE
                    </span>
                    <span className="text-slate-900 font-bold ml-1">new</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <div className="flex items-center">
                    <span className="text-indigo-600 font-bold tracking-tight">
                      MGLSTORE
                    </span>
                    <span className="text-slate-900 font-bold ml-1">
                      ticket
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          <div
            className="flex-1 bg-white p-6 overflow-y-auto overscroll-contain"
            data-lenis-prevent="true"
          >
            <div className="flex justify-between items-center bg-slate-50 px-5 py-3 rounded-lg mb-6">
              <h2 className="text-lg font-bold text-slate-800">
                {activeCategory.name}
              </h2>
              <a
                href="#"
                className="text-sm font-medium text-[#ffad02] hover:underline transition-colors shrink-0"
              >
                Бүгдийг үзэх
              </a>
            </div>

            {activeCategory.subgroups.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-12 gap-y-10 pl-2">
                {activeCategory.subgroups.map((group, idx) => (
                  <div key={idx} className="flex flex-col">
                    <h3 className="text-[13px] uppercase tracking-wide font-bold text-slate-900 mb-4">
                      {group.title}
                    </h3>
                    <ul className="space-y-3 mb-4">
                      {group.items.map((item, i) => (
                        <li key={i}>
                          <a
                            href="#"
                            className="text-[13px] text-slate-500 hover:text-[#ffad02] transition-colors"
                          >
                            {item}
                          </a>
                        </li>
                      ))}
                    </ul>
                    <a
                      href="#"
                      className="text-[13px] font-semibold text-[#ffad02] group flex items-center gap-1 mt-auto shrink-0 w-fit"
                    >
                      Бүгдийг үзэх{" "}
                      <span className="transform group-hover:translate-x-1 transition-transform">
                        →
                      </span>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                Сонгосон ангилалд дэд ангилал олдсонгүй
              </div>
            )}
          </div>

          {/* Column 3: Promo & Gallery */}
          <div className="w-[400px] border-l border-slate-100 bg-white p-6 flex flex-col shrink-0">
            {/* Promo Banner */}
            <div className="relative h-[320px] bg-slate-100 rounded-xl overflow-hidden mb-8 group cursor-pointer group shrink-0">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{
                  backgroundImage:
                    'url("https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800")',
                }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-serif text-4xl font-extrabold tracking-[0.2em] text-white/[0.95] drop-shadow-lg scale-y-110">
                  LIU•JO
                </span>
              </div>
            </div>

            {/* Most Viewed Header */}
            <div className="flex justify-between items-center mb-5 shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Хамгийн их үзсэн
              </h3>
              <div className="flex gap-3 text-[11px] font-bold">
                <button className="text-[#ffad02]">1D</button>
                <button className="text-slate-400 hover:text-slate-800 transition-colors">
                  1W
                </button>
                <button className="text-slate-400 hover:text-slate-800 transition-colors">
                  1M
                </button>
              </div>
            </div>

            {/* Dynamic Product Grid representing top rated/viewed */}
            <div className="grid grid-cols-3 gap-2 flex-1 overflow-hidden min-h-0">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-100 rounded-lg overflow-hidden group cursor-pointer relative pb-[120%]"
                >
                  <img
                    src={`https://images.unsplash.com/photo-${1550000000000 + i * 140000}?auto=format&fit=crop&q=80&w=200`}
                    alt="placeholder"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=200";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
