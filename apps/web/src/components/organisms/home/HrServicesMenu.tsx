"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronDown,
  FileText,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { MGL_SERVICES_DATA } from "@/app/our-services/data";
import type { ServiceCategory, ServiceItem } from "@/app/our-services/types";
import { HrServiceDetailModal } from "@/components/molecules/hr/HrServiceDetailModal";
import { HrServiceGroupButton } from "@/components/molecules/hr/HrServiceGroupButton";
import {
  HrServiceMenuCard,
  type HrMenuService,
} from "@/components/molecules/hr/HrServiceMenuCard";
import { getKnownHrFormLink } from "@/components/molecules/hr/hr-service-form-links";
import { API } from "@/lib/api";

type HrServiceGroup = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  services: HrMenuService[];
};

const hrIconByText: { test: RegExp; icon: LucideIcon }[] = [
  { test: /гэрээ|журам|бичиг|маягт|тушаал/i, icon: FileText },
  { test: /сонгон|бүрдүүл|ажилтан|ярилцлага/i, icon: Users },
  { test: /аудит|эрсдэл|зөвл/i, icon: ShieldCheck },
  { test: /сургалт|хөгжил|onboarding/i, icon: GraduationCap },
];

const fallbackHrCategory =
  MGL_SERVICES_DATA.find((category) => category.id === "hr") ??
  MGL_SERVICES_DATA[MGL_SERVICES_DATA.length - 1];

const getPriceLabel = (item: ServiceItem) => {
  if (item.priceLabel?.trim()) return item.priceLabel.trim();
  if (Number.isFinite(item.price) && item.price > 0) {
    return `₮${item.price.toLocaleString()}`;
  }
  return "Үнийн санал";
};

const normalizeServices = (payload: unknown): ServiceCategory[] => {
  if (!Array.isArray(payload)) return [];

  return payload.filter((category): category is ServiceCategory => {
    if (typeof category !== "object" || category === null) return false;
    const item = category as Partial<ServiceCategory>;
    return (
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.description === "string" &&
      Array.isArray(item.subCategories)
    );
  });
};

const toHrGroups = (categories: ServiceCategory[]): HrServiceGroup[] => {
  return categories
    .map((category, index) => {
      const textForIcon = `${category.id} ${category.title} ${category.description}`;
      const Icon =
        hrIconByText.find(({ test }) => test.test(textForIcon))?.icon ??
        (index % 2 === 0 ? Users : BriefcaseBusiness);
      const services = category.subCategories
        .flatMap((subCategory) => subCategory.items)
        .map((item) => {
          const knownForm = getKnownHrFormLink(item);
          const formSlug = item.formSlug || knownForm?.slug || "";
          const formTitle = item.formTitle || knownForm?.title || "";

          return {
            id: item.id,
            title: item.name,
            description:
              item.description ||
              item.features?.slice(0, 2).join(", ") ||
              category.description,
            priceLabel: getPriceLabel(item),
            href: item.fileUrl || `/our-services#${category.id}`,
            fileUrl: item.fileUrl,
            fileName: item.fileName,
            hasForm: Boolean((item.hasForm && item.formSlug) || knownForm),
            formSlug,
            formTitle,
            details: Array.isArray(item.features) ? item.features : [],
          };
        });

      return {
        id: category.id,
        label: category.title,
        description: category.description,
        icon: Icon,
        services,
      };
    })
    .filter((group) => group.services.length > 0);
};

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
        if (typeof rawServices !== "string") return;
        const parsed = JSON.parse(rawServices);
        const normalized = normalizeServices(parsed);
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
                      <HrServiceMenuCard
                        key={service.id}
                        service={service}
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
