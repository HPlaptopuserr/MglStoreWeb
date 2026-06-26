"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
  ImagePlus,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  formatMnt,
  getContractHref,
  getProjectImages,
  getResponsiblePeople,
  sortMglStoreFranchiseFirst,
  type FranchiseProject,
} from "./_lib/franchise";

export default function FranchisePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<FranchiseProject[]>([]);
  const [loading, setLoading] = useState(true);
  const hasMemberAccess = Boolean(user?.membership?.active || user?.isPrime);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API}/site-settings/franchise`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const parsed = Array.isArray(data.projects) ? data.projects : [];
        setProjects(
          sortMglStoreFranchiseFirst(
            parsed.filter(
              (project: FranchiseProject) => project.isActive !== false,
            ),
          ),
        );
      } catch (error) {
        console.error("Failed to fetch franchise", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const openFranchiseDetailPage = (projectId: string, invoiceId?: string) => {
    const query = invoiceId
      ? `?${new URLSearchParams({ invoiceId }).toString()}`
      : "";
    router.push(`/franchise/${projectId}${query}`);
  };

  const openProject = (project: FranchiseProject) => {
    if (project.price && project.price > 0 && hasMemberAccess) {
      openFranchiseDetailPage(project.id);
      return;
    }

    if (project.price && project.price > 0) {
      router.push(`/franchise/${project.id}/preview`);
      return;
    }

    openFranchiseDetailPage(project.id);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_24%_0%,rgba(255,111,44,0.22),transparent_34%),radial-gradient(circle_at_76%_0%,rgba(21,160,180,0.18),transparent_34%),linear-gradient(180deg,#171313_0%,#101011_58%,#111113_100%)] text-white">
      <main
        id="franchise-list"
        className="relative mx-auto max-w-7xl overflow-hidden px-4 py-10 sm:py-12 lg:px-8 lg:py-16"
      >
        <div className="pointer-events-none absolute left-0 top-0 h-px w-40 bg-orange-300/60" />

        <section className="relative z-10 mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200">
              <span className="h-px w-8 bg-orange-300/70" />
              Franchise
            </div>
            <h1 className="mt-4 text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">
              Франчайз{" "}
              <span className="font-serif text-3xl text-orange-200 sm:text-4xl">
                боломжууд
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-orange-50/70"></p>
          </div>
          <div className="w-fit rounded-xl border border-orange-200/20 bg-white/[0.04] px-5 py-4 text-sm font-black text-orange-100 shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
            Санал гомдол авах дугаар:{" "}
            <a href="tel:88008800" className="underline">
              91601316
            </a>
          </div>
          <div className="w-fit rounded-xl border border-orange-200/20 bg-white/[0.04] px-5 py-4 text-sm font-black text-orange-100 shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
            {loading ? "Ачаалж байна" : `${projects.length} бэлэн байна`}
          </div>
        </section>

        {loading ? (
          <div className="relative z-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-[455px] animate-pulse rounded-xl border border-white/10 bg-white/[0.04]"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="relative z-10 rounded-xl border border-dashed border-orange-200/30 bg-white/[0.04] p-14 text-center shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
            <p className="text-lg font-bold text-orange-50/80">
              Одоогоор нийтлэгдсэн франчайз алга байна.
            </p>
          </div>
        ) : (
          <section className="relative z-10">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project, index) => {
                const images = getProjectImages(project);
                const primaryImage = images[0];
                const isFree = !project.price || project.price <= 0;
                const contractHref = getContractHref(project);
                const responsiblePeople = getResponsiblePeople(project);
                const visibleResponsiblePeople = responsiblePeople.slice(0, 2);
                return (
                  <article
                    key={project.id}
                    className="group overflow-hidden rounded-xl border border-white/10 bg-[#18181b] shadow-[0_24px_70px_rgba(0,0,0,0.34)] transition duration-300 hover:-translate-y-1 hover:border-orange-300/40"
                  >
                    <div className="relative aspect-[16/12] overflow-hidden bg-[#0f0f11]">
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt={project.title}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#151516,#23201e)] text-white">
                          <ShieldCheck className="h-14 w-14 text-orange-300" />
                          <span className="text-sm font-black uppercase">
                            MGL Store франчайз
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#18181b] to-transparent" />
                      <div className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-orange-500 to-orange-300 px-4 py-1.5 text-[11px] font-black uppercase text-white shadow-lg shadow-orange-900/40">
                        {isFree ? "Үнэгүй" : formatMnt(project.price)}
                      </div>
                    </div>

                    <div className="flex min-h-[246px] flex-col px-6 pb-6 pt-5">
                      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-cyan-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                        PDF #{String(index + 1).padStart(6, "0")}
                        {images.length > 1 && (
                          <span className="ml-auto inline-flex items-center gap-1 text-orange-200/80">
                            <ImagePlus className="h-3.5 w-3.5" />
                            {images.length}
                          </span>
                        )}
                      </div>

                      <h2 className="mt-4 line-clamp-2 text-2xl font-black leading-tight text-white">
                        {project.title}
                      </h2>
                      <p className="mt-4 line-clamp-4 text-sm leading-6 text-orange-50/70">
                        {project.summary ||
                          "Франчайз танилцуулга, зураг болон PDF мэдээллийг нэг дороос үзэх боломжтой."}
                      </p>

                      {visibleResponsiblePeople.length > 0 && (
                        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.05] p-3">
                          <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-black uppercase tracking-wide text-cyan-200">
                            <span className="inline-flex items-center gap-1.5">
                              <UserRound className="h-3.5 w-3.5" />
                              Хариуцагч
                            </span>
                            {responsiblePeople.length >
                              visibleResponsiblePeople.length && (
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-orange-50/70">
                                +
                                {responsiblePeople.length -
                                  visibleResponsiblePeople.length}
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            {visibleResponsiblePeople.map(
                              (person, personIndex) => (
                                <div
                                  key={
                                    person.id ||
                                    person.teamMemberId ||
                                    personIndex
                                  }
                                  className="flex min-w-0 items-center gap-3"
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/10 text-white/60">
                                    {person.avatarUrl ? (
                                      <img
                                        src={person.avatarUrl}
                                        alt={person.name || "Хариуцагч"}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <UserRound className="h-4 w-4" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-black text-white">
                                      {person.name || "Нэр оруулаагүй"}
                                    </p>
                                    {(person.responsibility || person.role) && (
                                      <p className="truncate text-xs font-semibold text-orange-50/60">
                                        {person.responsibility || person.role}
                                      </p>
                                    )}
                                    <div className="mt-1 flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-[11px] font-bold text-orange-50/60">
                                      <span className="inline-flex items-center gap-1">
                                        <Phone className="h-3 w-3 text-orange-300" />
                                        {person.phone || "Дугаар оруулаагүй"}
                                      </span>
                                      {person.email && (
                                        <span className="inline-flex min-w-0 items-center gap-1">
                                          <Mail className="h-3 w-3 text-orange-300" />
                                          <span className="truncate">
                                            {person.email}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => openProject(project)}
                        className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-300 px-5 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-60"
                      >
                        {isFree ? "Дэлгэрэнгүй үзэх" : "3 хуудас preview үзэх"}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      {contractHref && (
                        <a
                          href={contractHref}
                          className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-cyan-200/30 bg-white/[0.06] px-5 text-sm font-black text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-200/10"
                        >
                          <FileText className="h-4 w-4" />
                          Гэрээ хийх
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}

              <article className="flex min-h-[455px] flex-col items-center justify-center rounded-xl border border-dashed border-orange-200/24 bg-white/[0.03] px-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-orange-200/10 text-orange-200 shadow-[0_0_35px_rgba(255,111,44,0.16)]">
                  <Plus className="h-8 w-8" />
                </div>
                <h3 className="mt-7 text-lg font-black text-orange-100">
                  Шинэ боломж удахгүй
                </h3>
                <p className="mt-3 max-w-xs text-sm font-semibold leading-6 text-orange-50/45">
                  Бид удахгүй шинэ франчайз боломжуудыг нэмэх болно.
                </p>
              </article>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
