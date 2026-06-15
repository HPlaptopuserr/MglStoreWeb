"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";

export type PaidAccessResponsiblePerson = {
  id?: string;
  name?: string;
  role?: string;
  responsibility?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
};

type PaidAccessDetailContentProps = {
  kindLabel: string;
  title: string;
  accessMessage: string;
  images?: string[];
  body?: string;
  people?: PaidAccessResponsiblePerson[];
  pdfUrl?: string;
  contractHref?: string;
  contractLabel?: string;
  onBack?: () => void;
};

function getPdfFileName(title: string) {
  const normalized = title
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return `${normalized || "mgl-store-material"}.pdf`;
}

function ResponsiblePeopleSection({
  people = [],
}: {
  people?: PaidAccessResponsiblePerson[];
}) {
  if (people.length === 0) return null;

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 sm:px-5">
      <div className="mb-4 flex items-center gap-2">
        <UserRound className="h-5 w-5 text-cyan-300" />
        <h3 className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200 sm:text-sm">
          Хариуцаж байгаа ажилчид
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {people.map((person, index) => (
          <article
            key={person.id || `${person.name}-${index}`}
            className="rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/10 text-white/60">
                {person.avatarUrl ? (
                  <img
                    src={person.avatarUrl}
                    alt={person.name || "Хариуцагч"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-base font-black text-white">
                  {person.name || "Нэр оруулаагүй"}
                </p>
                {person.role && (
                  <p className="mt-1 text-sm font-bold text-orange-200">
                    {person.role}
                  </p>
                )}
              </div>
            </div>
            {person.responsibility && (
              <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-orange-50/75">
                {person.responsibility}
              </p>
            )}
            {(person.phone || person.email) && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-orange-50/75">
                {person.phone && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                    <Phone className="h-3.5 w-3.5" />
                    {person.phone}
                  </span>
                )}
                {person.email && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                    <Mail className="h-3.5 w-3.5" />
                    {person.email}
                  </span>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function PaidAccessDetailContent({
  kindLabel,
  title,
  accessMessage,
  images = [],
  body,
  people = [],
  pdfUrl,
  contractHref,
  contractLabel = "Гэрээ хийх",
  onBack,
}: PaidAccessDetailContentProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const handlePdfDownload = async () => {
    if (!pdfUrl || downloading) return;

    setDownloading(true);
    setDownloadError("");

    try {
      const response = await fetch(pdfUrl, { mode: "cors" });
      if (!response.ok) {
        throw new Error("PDF файл татахад алдаа гарлаа");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = getPdfFileName(title);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error(error);
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      setDownloadError(
        "Шууд татаж чадсангүй. PDF-г шинэ цонхонд нээлээ, тэндээс хадгална уу.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0d0d10] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="rounded-2xl border border-white/10 bg-[#141416] px-4 py-5 shadow-2xl sm:px-6">
          <button
            type="button"
            onClick={onBack}
            className="mb-5 inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-black text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Буцах
          </button>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
            {kindLabel}
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-orange-200 sm:text-base">
            {accessMessage}
          </p>
        </header>

        {images.length > 0 && (
          <section className="grid gap-3 sm:grid-cols-2">
            {images.map((image, index) => (
              <img
                key={`${image}-${index}`}
                src={image}
                alt={`${title} зураг ${index + 1}`}
                className="h-56 w-full rounded-xl border border-white/10 object-cover sm:h-72 lg:h-80"
              />
            ))}
          </section>
        )}

        {body && (
          <section className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 sm:px-5">
            {body.split("\n").map((line, index) => (
              <p
                key={index}
                className="whitespace-pre-wrap text-base leading-8 text-orange-50/80"
              >
                {line || "\u00A0"}
              </p>
            ))}
          </section>
        )}

        <ResponsiblePeopleSection people={people} />

        {contractHref && (
          <a
            href={contractHref}
            className="inline-flex h-12 w-fit items-center gap-2 rounded-xl border border-cyan-200/30 bg-cyan-300 px-5 text-sm font-black text-[#071014] transition hover:brightness-110"
          >
            <FileText className="h-4 w-4" />
            {contractLabel}
          </a>
        )}

        {pdfUrl ? (
          <section className="space-y-4">
            <div className="grid gap-3 rounded-2xl border border-emerald-200/20 bg-emerald-300/10 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-200/15 text-emerald-100">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-emerald-50">
                    PDF файл бэлэн
                  </p>
                  <p className="mt-1 text-xs font-bold text-emerald-50/65">
                    Утсан дээр татах эсвэл шинэ цонхонд нээж үзнэ.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:flex">
                <button
                  type="button"
                  onClick={handlePdfDownload}
                  disabled={downloading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-black text-[#071014] transition hover:brightness-110"
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "Татаж байна..." : "PDF татах"}
                </button>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Нээх
                </a>
              </div>
            </div>
            {downloadError && (
              <p className="rounded-xl border border-amber-200/20 bg-amber-300/10 px-4 py-3 text-xs font-bold text-amber-50/80">
                {downloadError}
              </p>
            )}
            <div className="hidden overflow-hidden rounded-xl border border-white/10 bg-black/40 sm:block">
              <iframe
                src={pdfUrl}
                title={`${title} PDF`}
                className="h-[78vh] w-full bg-white"
              />
            </div>
          </section>
        ) : (
          <div className="rounded-xl border border-dashed border-orange-200/30 bg-white/[0.03] p-8 text-center text-sm font-bold text-orange-100/70">
            PDF файл оруулаагүй байна.
          </div>
        )}
      </div>
    </main>
  );
}
