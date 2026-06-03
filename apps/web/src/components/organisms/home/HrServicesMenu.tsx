"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronDown,
  ClipboardCheck,
  FileText,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

type HrService = {
  id: string;
  title: string;
  description: string;
  priceLabel: string;
  href: string;
};

type HrServiceGroup = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  services: HrService[];
};

const hrServiceGroups: HrServiceGroup[] = [
  {
    id: "hr-documents",
    label: "HR бичиг баримт",
    description: "Гэрээ, тушаал, журам, маягтыг стандартын дагуу цэгцлэх.",
    icon: FileText,
    services: [
      {
        id: "employment-contract",
        title: "Хөдөлмөрийн гэрээний багц",
        description: "Ажилтны гэрээ, нэмэлт нөхцөл, хавсралтын mock үйлчилгээ.",
        priceLabel: "₮250,000-с",
        href: "/info/hr",
      },
      {
        id: "internal-policy",
        title: "Дотоод журам боловсруулах",
        description: "Ажлын цаг, сахилга, урамшууллын журам цэгцлэх.",
        priceLabel: "₮450,000-с",
        href: "/info/hr",
      },
      {
        id: "order-template",
        title: "Тушаал, маягтын template",
        description: "Томилгоо, чөлөө, цалин, ажлаас гарах маягтын багц.",
        priceLabel: "₮180,000-с",
        href: "/info/hr",
      },
    ],
  },
  {
    id: "recruitment",
    label: "Сонгон шалгаруулалт",
    description: "Ажлын байр, ярилцлага, үнэлгээний процесс байгуулах.",
    icon: Users,
    services: [
      {
        id: "job-description",
        title: "Ажлын байрны тодорхойлолт",
        description: "Албан тушаал бүрийн зорилго, KPI, үүрэг тодорхойлох.",
        priceLabel: "₮120,000-с",
        href: "/info/hr",
      },
      {
        id: "interview-kit",
        title: "Ярилцлагын үнэлгээний kit",
        description: "Асуулт, онооны хуудас, shortlist template бэлдэх.",
        priceLabel: "₮200,000-с",
        href: "/info/hr",
      },
      {
        id: "onboarding",
        title: "Onboarding checklist",
        description: "Шинэ ажилтны эхний 30 хоногийн flow загварчлах.",
        priceLabel: "₮150,000-с",
        href: "/info/hr",
      },
    ],
  },
  {
    id: "hr-audit",
    label: "HR аудит, зөвлөх",
    description: "Одоо байгаа HR эрсдэл, процесс, compliance-ийг шалгах.",
    icon: ShieldCheck,
    services: [
      {
        id: "hr-risk-audit",
        title: "HR эрсдэлийн аудит",
        description: "Гэрээ, тушаал, журам, бүртгэлийн gap analysis.",
        priceLabel: "₮600,000-с",
        href: "/info/hr",
      },
      {
        id: "salary-structure",
        title: "Цалин, урамшууллын бүтэц",
        description: "Албан тушаалын шатлал, incentive logic боловсруулах.",
        priceLabel: "₮500,000-с",
        href: "/info/hr",
      },
      {
        id: "hr-consulting",
        title: "HR зөвлөх уулзалт",
        description: "Богино хугацааны оношилгоо, шийдлийн roadmap.",
        priceLabel: "₮90,000/цаг",
        href: "/info/hr",
      },
    ],
  },
  {
    id: "training",
    label: "Сургалт, хөгжил",
    description: "Менежер, ажилтан, үйлчилгээний багийн сургалтын багц.",
    icon: GraduationCap,
    services: [
      {
        id: "manager-training",
        title: "Менежерийн HR сургалт",
        description: "Feedback, сахилга, гүйцэтгэл удирдах basic training.",
        priceLabel: "₮350,000-с",
        href: "/info/hr",
      },
      {
        id: "service-training",
        title: "Үйлчилгээний ажилтны сургалт",
        description: "Харилцаа, стандарт, complaint handling сургалт.",
        priceLabel: "₮280,000-с",
        href: "/info/hr",
      },
      {
        id: "culture-workshop",
        title: "Байгууллагын соёл workshop",
        description: "Үнэ цэн, багийн зан төлөв, culture ritual тодорхойлох.",
        priceLabel: "₮420,000-с",
        href: "/info/hr",
      },
    ],
  },
];

export const HrServicesMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const activeGroup = hrServiceGroups[activeIndex] ?? hrServiceGroups[0];
  const ActiveIcon = activeGroup.icon;
  const serviceCount = hrServiceGroups.reduce(
    (sum, group) => sum + group.services.length,
    0,
  );

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="flex h-full items-center">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`flex h-full items-center gap-1.5 text-sm font-semibold transition-colors ${
          isOpen ? "text-emerald-600" : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Хүний нөөц
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 top-full z-50 max-h-[calc(100vh-8.5rem)] w-full overflow-y-auto overscroll-contain border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-2xl shadow-slate-900/10 [scrollbar-gutter:stable]"
            data-lenis-prevent="true"
          >
            <div className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
              <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-950">
                      Хүний нөөцийн үйлчилгээ
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Mock өгөгдлөөр HR үйлчилгээний багцуудыг ангиллаар харуулж байна.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  {serviceCount} үйлчилгээ
                </div>
              </div>

              <div className="grid min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_1fr]">
                <aside className="border-b border-slate-200 bg-slate-50/80 p-3 lg:border-b-0 lg:border-r">
                  <div className="mb-2 px-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Ангилал
                  </div>
                  <div className="space-y-1">
                    {hrServiceGroups.map((group, index) => {
                      const Icon = group.icon;
                      const active = index === activeIndex;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onMouseEnter={() => setActiveIndex(index)}
                          onFocus={() => setActiveIndex(index)}
                          onClick={() => setActiveIndex(index)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                            active
                              ? "bg-white text-slate-950 shadow-sm ring-1 ring-emerald-100"
                              : "text-slate-600 hover:bg-white hover:text-slate-950"
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              active
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-white text-slate-400"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">
                              {group.label}
                            </span>
                            <span className="block text-xs text-slate-400">
                              {group.services.length} үйлчилгээ
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </aside>

                <section className="p-5 sm:p-6">
                  <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                        <ActiveIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-950">
                          {activeGroup.label}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {activeGroup.description}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/info/hr"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      HR хэсэг рүү
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    {activeGroup.services.map((service) => (
                      <Link
                        key={service.id}
                        href={service.href}
                        onClick={() => setIsOpen(false)}
                        className="group flex min-h-[178px] flex-col rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-lg hover:shadow-emerald-100/60"
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-emerald-600">
                            <ClipboardCheck className="h-4 w-4" />
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                            {service.priceLabel}
                          </span>
                        </div>
                        <h4 className="text-base font-black leading-tight text-slate-950">
                          {service.title}
                        </h4>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                          {service.description}
                        </p>
                        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-black text-emerald-700">
                          Дэлгэрэнгүй
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
