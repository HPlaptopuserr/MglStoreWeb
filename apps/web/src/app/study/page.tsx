"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  GraduationCap,
  ImagePlus,
  Layers3,
  Loader2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  PaidAccessPaymentModal,
  type PaidAccessPaymentSession,
} from "@/components/molecules/payments/PaidAccessPaymentModal";
import type { ProjectItem } from "@/components/molecules/projects/project-types";
import { getProjectImages } from "@/components/molecules/projects/project-utils";
import {
  CompactStudyMaterialCard,
  StudyMaterialCard,
} from "./_components/StudyMaterialCards";
import { useLockedBodyScroll } from "./_components/useLockedBodyScroll";

type StudySettings = {
  eyebrow: string;
  title: string;
  accentTitle: string;
  description: string;
  countLabel: string;
  secondaryPillLabel: string;
  listEyebrow: string;
  listTitle: string;
  emptyText: string;
  bannerUrl: string;
};

const DEFAULT_STUDY_SETTINGS: StudySettings = {
  eyebrow: "Training access",
  title: "Сургалт",
  accentTitle: "бүртгэл",
  description:
    "MGL Store-ийн сургалт, зөвлөмж болон хэрэгжүүлэх алхмуудтай танилцаад шууд бүртгүүлж төлбөрөө баталгаажуулна уу.",
  countLabel: "сургалт",
  secondaryPillLabel: "Бүртгэл + төлбөр",
  listEyebrow: "Available trainings",
  listTitle: "Бүртгүүлэх сургалтууд",
  emptyText: "Одоогоор бүртгэлтэй сургалт нэмэгдээгүй байна.",
  bannerUrl: "",
};

const DEFAULT_STUDY_MATERIALS: ProjectItem[] = [
  {
    id: "study-store-basics",
    title: "MGL Store ашиглалтын үндсэн bootcamp",
    category: "Платформ",
    summary:
      "Дэлгүүрийн dashboard, бүтээгдэхүүн нэмэх, захиалга шалгах үндсэн алхмууд.",
    details:
      "Dashboard тохируулах\nБүтээгдэхүүн нэмэх workflow\nЗахиалга шалгах ба төлөв солих\nХэрэглэгчийн мэдээлэл удирдах",
    price: 11900,
    imageUrl: "https://picsum.photos/seed/mgl-study-platform/900/520",
    imageUrls: [],
    pdfUrl: "",
    teacherInfo: "MGL Store сургалтын баг · Store operation зөвлөхүүд",
    duration: "4.5 цаг",
    capacity: "1-10 хүн",
    priceNote: "1 хүний эрх",
    tags: ["dashboard", "store", "beginner"],
    isActive: true,
  },
  {
    id: "study-order-workflow",
    title: "Захиалга боловсруулах workflow",
    category: "Захиалга",
    summary:
      "Захиалга хүлээн авах, төлөв солих, хүргэлтийн мэдээлэл бэлтгэх дараалал.",
    details:
      "Захиалга хүлээн авах\nТөлөв солих стандарт\nХүргэлтийн багтай уялдуулах\nТайлан шалгах дадлага",
    price: 15900,
    imageUrl: "https://picsum.photos/seed/mgl-study-orders/900/520",
    imageUrls: [],
    pdfUrl: "",
    teacherInfo: "Operations баг · Захиалга, хүргэлтийн workflow ментор",
    duration: "3.5 цаг",
    capacity: "1-8 хүн",
    priceNote: "Багийн сургалт",
    tags: ["order", "delivery", "workflow"],
    isActive: true,
  },
  {
    id: "study-marketing-content",
    title: "Контент ба борлуулалтын материал",
    category: "Маркетинг",
    summary:
      "Бүтээгдэхүүний зураг, тайлбар, promo материал бэлтгэх богино заавар.",
    details:
      "Бүтээгдэхүүний зураг сонгох\nБорлуулах гарчиг бичих\nPromo banner бэлтгэх\nКонтентын checklist ашиглах",
    price: 9900,
    imageUrl: "https://picsum.photos/seed/mgl-study-content/900/520",
    imageUrls: [],
    pdfUrl: "",
    teacherInfo: "Маркетинг баг · Контент, худалдааны copy зөвлөх",
    duration: "2.5 цаг",
    capacity: "1-12 хүн",
    priceNote: "1 хүний үнэ",
    tags: ["content", "promo", "sales"],
    isActive: true,
  },
  {
    id: "study-ai-agent-basics",
    title: "AI агент ашиглан борлуулалтын автоматжуулалт",
    category: "AI",
    summary:
      "Lead, customer support, email follow-up ажлыг AI agent workflow-р хурдасгана.",
    details:
      "AI agent гэж юу вэ\nБорлуулалтын automation зураглах\nPrompt болон workflow байгуулах\nMGL Store дээр ашиглах жишээ",
    price: 24900,
    imageUrl: "https://picsum.photos/seed/mgl-study-ai-agent/900/520",
    imageUrls: [],
    teacherInfo: "AI automation зөвлөх · 6+ жилийн digital workflow туршлага",
    duration: "6 цаг",
    capacity: "1-15 хүн",
    priceNote: "Beginner level",
    tags: ["ai", "agent", "automation"],
    isActive: true,
  },
  {
    id: "study-pos-register",
    title: "POS Register ба кассын өдөр тутмын ажиллагаа",
    category: "POS",
    summary:
      "Касс нээх, борлуулалт бүртгэх, ээлж хаах, тайлан тохируулах сургалт.",
    details:
      "Касс нээх\nБараа уншуулах\nБуцаалт болон discount\nЭэлж хаах тайлан",
    price: 17900,
    imageUrl: "https://picsum.photos/seed/mgl-study-pos/900/520",
    imageUrls: [],
    teacherInfo: "POS deployment баг · Retail operation trainer",
    duration: "5 цаг",
    capacity: "2-10 хүн",
    priceNote: "Байгууллагын багц",
    tags: ["pos", "cashier", "retail"],
    isActive: true,
  },
  {
    id: "study-branch-management",
    title: "Салбар, байршил, ажилтны эрх удирдах нь",
    category: "Менежмент",
    summary:
      "Олон салбартай дэлгүүрийн эрх, хэрэглэгч, тайлангийн бүтцийг зөв зохион байгуулна.",
    details:
      "Салбарын бүтэц үүсгэх\nАжилтны role, permission\nСалбар бүрийн тайлан\nАюулгүй ажиллагааны зөвлөмж",
    price: 19900,
    imageUrl: "https://picsum.photos/seed/mgl-study-branch/900/520",
    imageUrls: [],
    teacherInfo: "MGL Store admin enablement баг",
    duration: "4 цаг",
    capacity: "1-20 хүн",
    priceNote: "Manager track",
    tags: ["branch", "admin", "permission"],
    isActive: true,
  },
  {
    id: "study-dynamic-qr-payment",
    title: "Dynamic QR төлбөр, данс холболт, reconciliation",
    category: "Төлбөр",
    summary:
      "Minu Dynamic QR данс холбож, төлбөрийн урсгал болон шалгалтыг зөв ажиллуулна.",
    details:
      "Merchant данс ойлгох\nQR invoice үүсэх урсгал\nТөлбөр шалгах\nАлдааг оношлох checklist",
    price: 21900,
    imageUrl: "https://picsum.photos/seed/mgl-study-payment/900/520",
    imageUrls: [],
    teacherInfo: "Payment integration engineer · QPay/SystemQR туршлагатай",
    duration: "3 цаг",
    capacity: "1-6 хүн",
    priceNote: "Technical session",
    tags: ["qpay", "payment", "qr"],
    isActive: true,
  },
  {
    id: "study-service-posts",
    title: "Үйлчилгээний пост, HR үйлчилгээ, маягт холбох",
    category: "Үйлчилгээ",
    summary:
      "Service card, form, thumbnail, file болон хэрэглэгчийн хүсэлтийг нэг урсгалд оруулна.",
    details:
      "Үйлчилгээний бүтэц\nМаягт холбох\nThumbnail ба file\nХүсэлт хүлээн авах workflow",
    price: 14900,
    imageUrl: "https://picsum.photos/seed/mgl-study-service/900/520",
    imageUrls: [],
    teacherInfo: "Service operations баг · HR/service content зөвлөх",
    duration: "3.5 цаг",
    capacity: "1-10 хүн",
    priceNote: "Hands-on",
    tags: ["service", "forms", "hr"],
    isActive: true,
  },
  {
    id: "study-vendor-growth",
    title: "Vendor growth: дэлгүүрээ оновчтой байрлуулах",
    category: "Growth",
    summary:
      "Дэлгүүрийн нүүр, бүтээгдэхүүн, үнэ, banner, trust signal-ийг сайжруулна.",
    details:
      "Store profile audit\nProduct card optimization\nҮнэ ба promo стратеги\nCustomer trust checklist",
    price: 12900,
    imageUrl: "https://picsum.photos/seed/mgl-study-growth/900/520",
    imageUrls: [],
    teacherInfo: "Growth баг · E-commerce performance зөвлөх",
    duration: "4 цаг",
    capacity: "1-12 хүн",
    priceNote: "Growth basics",
    tags: ["growth", "sales", "store"],
    isActive: true,
  },
  {
    id: "study-data-reporting",
    title: "Тайлан унших, KPI гаргах, шийдвэр гаргалт",
    category: "Дата",
    summary:
      "Борлуулалт, захиалга, хэрэглэгчийн датагаас ойлгомжтой KPI dashboard гаргана.",
    details:
      "Үндсэн KPI ойлгох\nТайлан унших\nExcel/Sheet export\nШийдвэрийн checklist",
    price: 18900,
    imageUrl: "https://picsum.photos/seed/mgl-study-data/900/520",
    imageUrls: [],
    teacherInfo: "Data analyst · Retail reporting consultant",
    duration: "5.5 цаг",
    capacity: "1-10 хүн",
    priceNote: "Data beginner",
    tags: ["data", "report", "kpi"],
    isActive: true,
  },
];

function normalizeStudySettings(raw: unknown): StudySettings {
  const record =
    raw && typeof raw === "object" ? (raw as Partial<StudySettings>) : {};
  const clean = (value: unknown, fallback: string) => {
    const text = String(value || "").trim();
    if (
      !text ||
      /PDF материал|материалууд|материал$|All training materials|Бүх сургалтын материал|Admin-аас удирдана/i.test(
        text,
      )
    ) {
      return fallback;
    }
    return text;
  };
  return {
    eyebrow: clean(record.eyebrow, DEFAULT_STUDY_SETTINGS.eyebrow),
    title: clean(record.title, DEFAULT_STUDY_SETTINGS.title),
    accentTitle: clean(record.accentTitle, DEFAULT_STUDY_SETTINGS.accentTitle),
    description: clean(record.description, DEFAULT_STUDY_SETTINGS.description),
    countLabel: clean(record.countLabel, DEFAULT_STUDY_SETTINGS.countLabel),
    secondaryPillLabel: clean(
      record.secondaryPillLabel,
      DEFAULT_STUDY_SETTINGS.secondaryPillLabel,
    ),
    listEyebrow: clean(record.listEyebrow, DEFAULT_STUDY_SETTINGS.listEyebrow),
    listTitle: clean(record.listTitle, DEFAULT_STUDY_SETTINGS.listTitle),
    emptyText: clean(record.emptyText, DEFAULT_STUDY_SETTINGS.emptyText),
    bannerUrl: String(record.bannerUrl || ""),
  };
}

function buildStudyDisplayMaterials(materials: ProjectItem[]) {
  const seen = new Set(materials.map((material) => material.id));
  const fallback = DEFAULT_STUDY_MATERIALS.filter(
    (material) => !seen.has(material.id),
  );
  return materials.length > 0
    ? [...materials, ...fallback.slice(0, 10)]
    : DEFAULT_STUDY_MATERIALS;
}

const ALL_STUDY_CATEGORIES = "Бүгд";

function StudyDetailModal({
  material,
  registered,
  registering,
  onRegister,
  onClose,
}: {
  material: ProjectItem;
  registered: boolean;
  registering: boolean;
  onRegister: (material: ProjectItem) => void;
  onClose: () => void;
}) {
  const images = getProjectImages(material);
  const isFree = !material.price || material.price <= 0;
  const priceText = isFree
    ? "Үнэгүй"
    : `₮${Number(material.price || 0).toLocaleString("mn-MN")}`;
  const detailLines = (material.details || material.summary || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const teacherLines = String(material.teacherInfo || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  useEffect(() => {
    const scrollY = window.scrollY;
    const { overflow, position, top, width } = document.body.style;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.position = position;
      document.body.style.top = top;
      document.body.style.width = width;
      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
        onClick={onClose}
        aria-label="Хаах"
      />
      <article className="relative z-10 max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
              Training detail
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
              {material.title}
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-500">
              {material.category || "Сургалт"} · {priceText}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
            aria-label="Хаах"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overscroll-contain overflow-y-auto px-6 py-6">
          {images.length > 0 && (
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {images.map((image, index) => (
                <img
                  key={`${image}-${index}`}
                  src={image}
                  alt={`${material.title} зураг ${index + 1}`}
                  className="h-64 w-full rounded-xl border border-slate-200 object-cover"
                />
              ))}
            </div>
          )}

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-wide text-orange-700">
                Үнэ
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {priceText}
              </p>
              <p className="mt-1 text-sm font-bold text-orange-700">
                {material.priceNote ||
                  (isFree ? "Нээлттэй бүртгэл" : "Төлбөртэй бүртгэл")}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-cyan-700">
                <Users className="h-4 w-4" />
                Хүний тоо
              </div>
              <p className="mt-2 text-lg font-black text-slate-950">
                {material.capacity || "Admin-аас оруулна"}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-700">
                <Clock3 className="h-4 w-4" />
                Хугацаа
              </div>
              <p className="mt-2 text-lg font-black text-slate-950">
                {material.duration || "Тохиролцоно"}
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="text-base font-black text-slate-950">
                  Дэлгэрэнгүй мэдээлэл
                </h3>
                <div className="mt-3 space-y-2">
                  {(detailLines.length > 0
                    ? detailLines
                    : [
                        "Сургалтын агуулга, хэрэгжүүлэх алхам болон бүртгэлийн нөхцөлийг admin дээрээс оруулна.",
                      ]
                  ).map((line, index) => (
                    <p
                      key={`${material.id}-detail-${index}`}
                      className="text-sm leading-7 text-slate-600"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-base font-black text-slate-950">
                    Багш нарын мэдээлэл
                  </h3>
                </div>
                <div className="mt-3 space-y-2">
                  {(teacherLines.length > 0
                    ? teacherLines
                    : [
                        "Багшийн нэр, туршлага, чиглэл болон холбоотой мэдээллийг admin дээрээс нэмнэ.",
                      ]
                  ).map((line, index) => (
                    <p
                      key={`${material.id}-teacher-${index}`}
                      className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </section>
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                Бүртгэл
              </p>
              <h3 className="mt-3 text-2xl font-black">{priceText}</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">
                {registered
                  ? "Таны сургалтын бүртгэл баталгаажсан байна."
                  : "Мэдээллээ шалгаад сургалтад бүртгүүлэх товч дарна уу."}
              </p>
              <button
                type="button"
                onClick={() => onRegister(material)}
                disabled={registered || registering}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {registered ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Бүртгэл баталгаажсан
                  </>
                ) : registering ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isFree ? "Үнэгүй бүртгүүлэх" : "Бүртгүүлж төлөх"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </aside>
          </div>
        </div>
      </article>
    </div>
  );
}

function StudyCourseModal({
  material,
  registered,
  registering,
  onRegister,
  onClose,
}: {
  material: ProjectItem;
  registered: boolean;
  registering: boolean;
  onRegister: (material: ProjectItem) => void;
  onClose: () => void;
}) {
  const images = getProjectImages(material);
  const primaryImage = images[0];
  const isFree = !material.price || material.price <= 0;
  const priceText = isFree
    ? "Үнэгүй"
    : `₮${Number(material.price || 0).toLocaleString("mn-MN")}`;
  const detailLines = (material.details || material.summary || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const teacherLines = String(material.teacherInfo || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const programItems =
    detailLines.length > 0
      ? detailLines
      : [
          "Сургалтын үндсэн ойлголт, зорилго болон хэрэгжүүлэх алхмууд",
          "MGL Store дээр ажиллах бодит workflow",
          "Дадлага, асуулт хариулт болон дараагийн алхам",
        ];

  useLockedBodyScroll();

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-slate-950/75 px-3 py-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-label="Хаах"
      />

      <article
        className="mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-7xl overflow-y-auto overscroll-contain rounded-[28px] bg-white shadow-2xl"
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        <div className="bg-[#101b16] text-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-10">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                <span>{material.category || "Сургалт"}</span>
                <span className="h-1 w-1 rounded-full bg-orange-400" />
                <span>{material.duration || "Хугацаа тохиролцоно"}</span>
              </div>
              <h2 className="mt-4 max-w-4xl break-words text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                {material.title}
              </h2>
              <p className="mt-4 max-w-3xl break-words text-base leading-8 text-white/72">
                {material.summary ||
                  "Сургалтын зорилго, агуулга, багш нарын мэдээлэл болон бүртгэлийн нөхцөлийг нэг дороос харна."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-white/78">
                <span className="rounded-lg bg-white/10 px-3 py-2">
                  {material.capacity || "Хүний тоо admin-аас"}
                </span>
                <span className="rounded-lg bg-white/10 px-3 py-2">
                  {material.priceNote ||
                    (isFree ? "Нээлттэй бүртгэл" : "Төлбөртэй бүртгэл")}
                </span>
              </div>
            </div>

            <aside className="relative rounded-2xl border border-white/15 bg-white text-slate-950 shadow-2xl lg:-mb-24">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-950"
                aria-label="Хаах"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="aspect-video overflow-hidden rounded-t-2xl bg-slate-100">
                {primaryImage ? (
                  <img
                    src={primaryImage}
                    alt={material.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-emerald-600">
                    <GraduationCap className="h-16 w-16" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                  Бүртгэл
                </p>
                <p className="mt-2 text-4xl font-black">{priceText}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  {registered
                    ? "Таны сургалтын бүртгэл баталгаажсан."
                    : "Мэдээллээ шалгаад сургалтад бүртгүүлнэ үү."}
                </p>
                <button
                  type="button"
                  onClick={() => onRegister(material)}
                  disabled={registered || registering}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {registered ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Бүртгэл баталгаажсан
                    </>
                  ) : registering ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {isFree ? "Үнэгүй бүртгүүлэх" : "Бүртгүүлж төлөх"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm font-bold text-slate-600">
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-4 w-4 text-slate-400" />
                    {material.duration || "Хугацаа тохиролцоно"}
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-slate-400" />
                    {material.capacity || "Хүний тоо admin-аас оруулна"}
                  </div>
                  <div className="flex items-center gap-3">
                    <BookOpenCheck className="h-4 w-4 text-slate-400" />
                    Сургалтын хөтөлбөр багтсан
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-10">
          <div className="space-y-8">
            <section className="border border-slate-200 bg-white p-5 sm:p-6">
              <h3 className="text-2xl font-black text-slate-950">
                Энэ сургалтаар юу сурах вэ
              </h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {programItems.slice(0, 8).map((line, index) => (
                  <div
                    key={`${material.id}-learn-${index}`}
                    className="flex gap-3 text-sm font-semibold leading-7 text-slate-600"
                  >
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="break-words">{line}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-950">
                    Сургалтын хөтөлбөр
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {programItems.length} хэсэг ·{" "}
                    {material.duration || "хугацаа тохиролцоно"}
                  </p>
                </div>
              </div>
              <div className="mt-4 divide-y divide-slate-200 border border-slate-200 bg-white">
                {programItems.map((line, index) => (
                  <details
                    key={`${material.id}-program-${index}`}
                    className="group"
                    open={index === 0}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-slate-50 px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-slate-100">
                      <span className="break-words">
                        {index + 1}. {line}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        Дэлгэрэнгүй
                      </span>
                    </summary>
                    <p className="px-5 py-4 text-sm leading-7 text-slate-600">
                      Энэ хэсгийн дэлгэрэнгүй тайлбар, дасгал ажил болон
                      хэрэгжүүлэх алхмыг admin дээрээс мөр мөрөөр оруулж болно.
                    </p>
                  </details>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-emerald-600" />
                <h3 className="text-xl font-black text-slate-950">
                  Багш нарын мэдээлэл
                </h3>
              </div>
              <div className="mt-4 space-y-3">
                {(teacherLines.length > 0
                  ? teacherLines
                  : [
                      "Багшийн нэр, туршлага, чиглэл болон холбоотой мэдээллийг admin дээрээс нэмнэ.",
                    ]
                ).map((line, index) => (
                  <p
                    key={`${material.id}-teacher-card-${index}`}
                    className="break-words rounded-xl bg-white px-4 py-3 text-sm font-semibold leading-7 text-slate-600"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </section>
          </div>

          <div className="hidden lg:block" />
        </div>
      </article>
    </div>
  );
}

export default function StudyPage() {
  const router = useRouter();
  const { user, authFetch } = useAuth();
  const [materials, setMaterials] = useState<ProjectItem[]>([]);
  const [settings, setSettings] = useState<StudySettings>(
    DEFAULT_STUDY_SETTINGS,
  );
  const [loading, setLoading] = useState(true);
  const [activeMaterial, setActiveMaterial] = useState<ProjectItem | null>(
    null,
  );
  const [loadedMaterials, setLoadedMaterials] = useState<
    Record<string, ProjectItem>
  >({});
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [registeredMaterialIds, setRegisteredMaterialIds] = useState<
    Record<string, boolean>
  >({});
  const [paymentMaterial, setPaymentMaterial] = useState<ProjectItem | null>(
    null,
  );
  const [paymentSession, setPaymentSession] =
    useState<PaidAccessPaymentSession | null>(null);
  const [activeCategory, setActiveCategory] = useState(ALL_STUDY_CATEGORIES);
  const [showAllCourses, setShowAllCourses] = useState(false);
  const displayMaterials = !loading
    ? buildStudyDisplayMaterials(materials)
    : materials;
  const featuredMaterials = displayMaterials.slice(0, 4);
  const categoryNames = Array.from(
    new Set(
      displayMaterials
        .map((material) => material.category || "Сургалт")
        .filter(Boolean),
    ),
  ).slice(0, 8);
  const categoryTabs = [ALL_STUDY_CATEGORIES, ...categoryNames];
  const activeCategoryMaterials =
    activeCategory === ALL_STUDY_CATEGORIES
      ? displayMaterials
      : displayMaterials.filter(
          (material) => (material.category || "Сургалт") === activeCategory,
        );
  const visibleCategoryMaterials = activeCategoryMaterials.slice(0, 4);

  useEffect(() => {
    if (
      activeCategory !== ALL_STUDY_CATEGORIES &&
      !categoryNames.includes(activeCategory)
    ) {
      setActiveCategory(ALL_STUDY_CATEGORIES);
    }
  }, [activeCategory, categoryNames]);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await fetch(`${API}/site-settings/study`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const parsed = Array.isArray(data.projects) ? data.projects : [];
        setSettings(normalizeStudySettings(data.settings));
        const visibleMaterials = parsed.filter(
          (item: ProjectItem) => item.isActive !== false,
        );
        setMaterials(
          visibleMaterials.length > 0
            ? visibleMaterials
            : DEFAULT_STUDY_MATERIALS,
        );
      } catch (error) {
        console.error("Failed to fetch study materials", error);
        setMaterials(DEFAULT_STUDY_MATERIALS);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, []);

  const fetchStudyDetail = async (materialId: string, invoiceId?: string) => {
    const params = invoiceId
      ? `?${new URLSearchParams({ invoiceId }).toString()}`
      : "";
    const request = user ? authFetch : fetch;
    const res = await request(
      `${API}/site-settings/study/${materialId}/detail${params}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Сургалтын мэдээлэл авахад алдаа гарлаа");
    }
    return data.project as ProjectItem;
  };

  const openRegisteredStudy = async (
    material: ProjectItem,
    invoiceId?: string,
  ) => {
    const detail = await fetchStudyDetail(material.id, invoiceId);
    setLoadedMaterials((prev) => ({ ...prev, [material.id]: detail }));
    setRegisteredMaterialIds((prev) => ({ ...prev, [material.id]: true }));
    setPaymentMaterial(null);
    setPaymentSession(null);
    setActiveMaterial(detail);
  };

  const registerStudy = async (material: ProjectItem) => {
    const cachedMaterial = loadedMaterials[material.id];
    if (cachedMaterial && registeredMaterialIds[material.id]) {
      setActiveMaterial(cachedMaterial);
      return;
    }

    try {
      setOpeningId(material.id);
      if (!user) {
        router.push("/login");
        return;
      }

      const res = await authFetch(`${API}/site-settings/study/systemqr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: material.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Төлбөрийн QR үүсгэхэд алдаа гарлаа");
      }
      if (data.free) {
        await openRegisteredStudy(material);
        return;
      }

      setPaymentMaterial(material);
      setPaymentSession({
        invoiceId: data.invoiceId,
        providerInvoiceId: data.providerInvoiceId,
        amount: Number(data.amount || material.price || 0),
        qrText: String(data.qrText || ""),
        qrImage: String(data.qrImage || ""),
        urls: Array.isArray(data.urls) ? data.urls : [],
        expiresAt: data.expiresAt,
      });
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Сургалтад бүртгүүлэхэд алдаа гарлаа",
      );
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <main>
        <section className="relative overflow-hidden bg-[#101b16] text-white">
          {settings.bannerUrl && (
            <img
              src={settings.bannerUrl}
              alt={`${settings.title} banner`}
              className="absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover opacity-50 lg:block"
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#101b16_0%,#101b16_48%,rgba(16,27,22,0.76)_100%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">
                {settings.eyebrow}
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Суралцах дараагийн чадвараа{" "}
                <span className="text-orange-400">өнөөдөр эхлүүл</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
                {settings.description}
              </p>
              <div className="mt-7 max-w-2xl rounded-xl bg-white p-2 shadow-2xl shadow-black/30">
                <div className="flex min-h-14 items-center gap-3 rounded-lg border border-slate-200 px-4 text-slate-500">
                  <BookOpenCheck className="h-5 w-5 text-emerald-700" />
                  <span className="text-sm font-semibold">
                    Сургалт, ур чадвар, хөтөлбөр хайх...
                  </span>
                  <span className="ml-auto rounded-lg bg-orange-500 px-4 py-2 text-sm font-black text-white">
                    Хайх
                  </span>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15">
                  <BookOpenCheck className="h-4 w-4" />
                  {loading
                    ? "Ачаалж байна"
                    : `${displayMaterials.length} ${settings.countLabel}`}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15">
                  <Layers3 className="h-4 w-4" />
                  {settings.secondaryPillLabel}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          {!loading && displayMaterials.length > 0 && (
            <section className="mb-12">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">
                    Онцлох сургалтууд
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Сүүлд нэмэгдсэн, хамгийн түрүүнд үзэх сургалтууд
                  </p>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <button
                  type="button"
                  onClick={() => setActiveMaterial(featuredMaterials[0])}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_28px_80px_rgba(249,115,22,0.14)]"
                >
                  <div className="grid gap-0 md:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="aspect-[16/10] bg-slate-100 md:aspect-auto">
                      {getProjectImages(featuredMaterials[0])[0] ? (
                        <img
                          src={getProjectImages(featuredMaterials[0])[0]}
                          alt={featuredMaterials[0].title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-56 items-center justify-center bg-emerald-50 text-emerald-600">
                          <GraduationCap className="h-16 w-16" />
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                        Featured course
                      </p>
                      <h3 className="mt-3 line-clamp-2 text-2xl font-black leading-tight text-slate-950">
                        {featuredMaterials[0].title}
                      </h3>
                      <p className="mt-3 line-clamp-3 text-sm font-semibold leading-7 text-slate-500">
                        {featuredMaterials[0].summary ||
                          "Сургалтын зорилго, багш, хөтөлбөр болон бүртгэлийн мэдээллийг нэг дороос харна."}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                          {featuredMaterials[0].category || "Сургалт"}
                        </span>
                        <span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-700">
                          {!featuredMaterials[0].price
                            ? "Үнэгүй"
                            : `₮${Number(featuredMaterials[0].price).toLocaleString("mn-MN")}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  {featuredMaterials.slice(1, 3).map((material) => (
                    <button
                      key={material.id}
                      type="button"
                      onClick={() => setActiveMaterial(material)}
                      className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-orange-200 hover:shadow-lg"
                    >
                      <div className="h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {getProjectImages(material)[0] ? (
                          <img
                            src={getProjectImages(material)[0]}
                            alt={material.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-emerald-600">
                            <GraduationCap className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-black leading-5 text-slate-950">
                          {material.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                          {material.summary || "Сургалтын дэлгэрэнгүй"}
                        </p>
                        <p className="mt-2 text-xs font-black text-orange-600">
                          Дэлгэрэнгүй үзэх
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[430px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
                />
              ))}
            </div>
          ) : displayMaterials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center shadow-sm">
              <GraduationCap className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="mt-5 text-lg font-bold text-slate-500">
                {settings.emptyText}
              </p>
            </div>
          ) : (
            <section className="pt-2">
              <div className="mb-7">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">
                  {settings.listEyebrow}
                </p>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight text-[#2d2f43] sm:text-4xl">
                      Ур чадвараа дараагийн түвшинд гарга
                    </h2>
                    <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-500">
                      MGL Store-ийн сургалтуудыг чиглэлээр нь сонгоод хэрэгтэй
                      хөтөлбөрөө хурдан олоорой.
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                    {activeCategoryMaterials.length}
                  </span>
                </div>
              </div>

              <div className="mb-7 overflow-x-auto border-b border-slate-200">
                <div className="flex min-w-max gap-8">
                  {categoryTabs.map((category) => {
                    const active = category === activeCategory;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setActiveCategory(category);
                          setShowAllCourses(false);
                        }}
                        className={`relative shrink-0 pb-4 text-base font-black transition ${
                          active
                            ? "text-[#2d2f43]"
                            : "text-slate-500 hover:text-orange-600"
                        }`}
                      >
                        {category}
                        {active && (
                          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#2d2f43]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {showAllCourses ? (
                <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {activeCategoryMaterials.map((material, index) => (
                    <CompactStudyMaterialCard
                      key={material.id}
                      material={material}
                      index={index}
                      openingId={openingId}
                      onOpen={setActiveMaterial}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {visibleCategoryMaterials.map((material, index) => (
                    <StudyMaterialCard
                      key={material.id}
                      material={material}
                      index={index}
                      openingId={openingId}
                      onOpen={setActiveMaterial}
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowAllCourses((current) => !current)}
                className="mt-9 inline-flex items-center gap-2 text-base font-black text-orange-600 transition hover:text-orange-700"
              >
                {showAllCourses
                  ? "Онцлох grid рүү буцах"
                  : activeCategory === ALL_STUDY_CATEGORIES
                    ? `Бүх ${settings.countLabel} харах`
                    : `${activeCategory} чиглэлийн бүх сургалтыг харах`}
                <ArrowRight className="h-5 w-5" />
              </button>
            </section>
          )}
        </div>
      </main>

      {paymentMaterial && paymentSession && (
        <PaidAccessPaymentModal
          itemId={paymentMaterial.id}
          title={paymentMaterial.title}
          payment={paymentSession}
          checkUrl={`${API}/site-settings/study/systemqr/check`}
          request={authFetch}
          onPaid={(invoiceId) =>
            openRegisteredStudy(paymentMaterial, invoiceId)
          }
          onClose={() => {
            setPaymentMaterial(null);
            setPaymentSession(null);
          }}
        />
      )}

      {activeMaterial && (
        <StudyCourseModal
          material={activeMaterial}
          registered={Boolean(registeredMaterialIds[activeMaterial.id])}
          registering={openingId === activeMaterial.id}
          onRegister={registerStudy}
          onClose={() => setActiveMaterial(null)}
        />
      )}
    </div>
  );
}
