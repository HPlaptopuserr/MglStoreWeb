"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { HrServiceDetailModal } from "@/components/molecules/hr/HrServiceDetailModal";
import { HrServiceGroupButton } from "@/components/molecules/hr/HrServiceGroupButton";
import {
  HrServiceMenuCard,
  type HrMenuService,
} from "@/components/molecules/hr/HrServiceMenuCard";
import {
  fallbackHrCategory,
  parseHrServicesSetting,
  toHrGroups,
} from "@/components/molecules/hr/hr-services-data";
import type { ServiceCategory } from "@/app/our-services/types";
import { API } from "@/lib/api";

export const HrServicesMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hrCategories, setHrCategories] = useState<ServiceCategory[]>([
    fallbackHrCategory,
  ]);
  const [selectedService, setSelectedService] = useState<HrMenuService | null>(
    null,
  );
  const menuRef = useRef<HTMLDivElement | null>(null);
  const groups = toHrGroups(hrCategories);
  const activeGroup = groups[activeIndex] ?? groups[0];
  const ActiveIcon = activeGroup?.icon ?? BriefcaseBusiness;
  const serviceCount = groups.reduce(
    (sum, group) => sum + group.services.length,
    0,
  );

  useEffect(() => {
    let cancelled = false;

    fetch(`${API}/site-settings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled || !data || typeof data !== "object") return;
        const rawServices = (data as Record<string, unknown>)["hr-services"];
        const normalized = parseHrServicesSetting(rawServices);
        if (toHrGroups(normalized).length > 0) {
          setHrCategories(normalized);
          setActiveIndex(0);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) setIsOpen(false);
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

  if (!activeGroup) return null;

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
                      Admin-аас оруулсан гол гарчиг, файл материалууд.
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
                    HR үйлчилгээний төрөл
                  </div>
                  <div className="space-y-1">
                    {groups.map((group, index) => (
                      <HrServiceGroupButton
                        key={group.id}
                        active={index === activeIndex}
                        icon={group.icon}
                        label={group.label}
                        count={group.services.length}
                        onSelect={() => setActiveIndex(index)}
                      />
                    ))}
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
                        <p className="mt-1 max-w-2xl text-sm text-slate-500">
                          {activeGroup.description}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/hr/${activeGroup.id}`}
                      onClick={() => setIsOpen(false)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      HR хэсэг рүү
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    {activeGroup.services.map((service) => (
                      <HrServiceMenuCard
                        key={service.id}
                        service={service}
                        groupHref={`/hr/${activeGroup.id}`}
                        onOpen={setSelectedService}
                      />
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedService && (
          <HrServiceDetailModal
            service={selectedService}
            onClose={() => setSelectedService(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
