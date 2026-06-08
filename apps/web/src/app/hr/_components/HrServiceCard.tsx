import Link from "next/link";
import {
  ArrowRight,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  ImagePlus,
  ListChecks,
} from "lucide-react";
import type { HrMenuService } from "@/components/molecules/hr/HrServiceMenuCard";

type HrServiceCardProps = {
  service: HrMenuService;
  groupId: string;
  index: number;
  imageUrl?: string;
};

function isPlaceholderText(value?: string) {
  const text = (value || "").trim().toLowerCase();
  if (!text) return true;
  if (
    /^(asd|test|demo|sample|lorem|йы|ыб|юу багтах вэ)[\w\s,.-]*$/i.test(text)
  ) {
    return true;
  }
  const lettersOnly = text.replace(
    /[\s\d.,/\\|()[\]{}'"`~!@#$%^&*_:;?+=-]/g,
    "",
  );
  if (lettersOnly.length >= 8 && new Set(lettersOnly).size <= 3) return true;
  return false;
}

export function HrServiceCard({
  service,
  groupId,
  index,
  imageUrl,
}: HrServiceCardProps) {
  const formHref =
    service.hasForm && service.formSlug ? `/forms/${service.formSlug}` : "";
  const fileHref = service.fileUrl || "";
  const actionLabel = formHref
    ? "Маягт бөглөх"
    : fileHref
      ? "Файл нээх"
      : "Дэлгэрэнгүй үзэх";
  const actionHref = formHref || fileHref || `/hr/${groupId}`;
  const description = !isPlaceholderText(service.description)
    ? service.description
    : "HR үйлчилгээний хэрэгжилтэд ашиглах файл, маягт болон богино зааварчилгааг нэг дор бэлтгэсэн материал.";
  const details = service.details.filter(
    (detail) => !isPlaceholderText(detail),
  );

  return (
    <article className="group relative flex min-h-[430px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_24px_70px_rgba(251,146,60,0.18)]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

      <div className="relative m-3 mb-0 aspect-[16/10] overflow-hidden rounded-[18px] bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={service.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#f8fafc,#ecfdf5)] text-slate-500">
            <GraduationCap className="h-12 w-12 text-emerald-500" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">
              MGL Store HR
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/12 opacity-90" />
        <div className="absolute left-4 top-4 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-slate-700 shadow-sm backdrop-blur-md">
          {service.hasForm ? "Маягт" : fileHref ? "Файл" : "Материал"}
        </div>
        <div className="absolute right-4 top-4 rounded-full bg-orange-500 px-3.5 py-1.5 text-[11px] font-black uppercase text-white shadow-lg shadow-orange-900/25 ring-1 ring-white/35">
          {service.priceLabel}
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white shadow-sm backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />#
            {String(index + 1).padStart(6, "0")}
          </div>
          {imageUrl && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1.5 text-[11px] font-black text-slate-700 shadow-sm backdrop-blur-md">
              <ImagePlus className="h-3.5 w-3.5" />1
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
        <h2 className="line-clamp-2 text-[22px] font-black leading-[1.12] tracking-tight text-slate-950">
          {service.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-[15px] font-medium leading-7 text-slate-500">
          {description}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[150px] truncate">
              {service.fileName || (service.fileUrl ? "Файлтай" : "Файлгүй")}
            </span>
          </span>
          {details.slice(0, 2).map((detail, detailIndex) => (
            <span
              key={`${service.id}-detail-${detailIndex}`}
              className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-black text-emerald-700"
            >
              <ListChecks className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[150px] truncate">{detail}</span>
            </span>
          ))}
        </div>

        {fileHref && !formHref ? (
          <a
            href={actionHref}
            target="_blank"
            rel="noreferrer"
            className="mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-950/15 ring-1 ring-slate-900 transition hover:bg-orange-500 hover:shadow-orange-200"
          >
            <Download className="h-4 w-4" />
            {actionLabel}
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <Link
            href={actionHref}
            className="mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-950/15 ring-1 ring-slate-900 transition hover:bg-orange-500 hover:shadow-orange-200"
          >
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </article>
  );
}
