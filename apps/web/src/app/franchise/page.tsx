"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
  ImagePlus,
  Loader2,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  PaidAccessPaymentModal,
  type PaidAccessPaymentSession,
} from "@/components/molecules/payments/PaidAccessPaymentModal";

type FranchiseProject = {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  details?: string;
  price?: number;
  imageUrl?: string;
  imageUrls?: string[];
  pdfUrl?: string;
  contractTemplateId?: string;
  contractUrl?: string;
  responsiblePeople?: ProjectResponsiblePerson[];
  tags?: string[];
  isActive?: boolean;
};

type ProjectResponsiblePerson = {
  id?: string;
  name?: string;
  role?: string;
  responsibility?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
};

function getProjectImages(project: FranchiseProject) {
  return Array.from(
    new Set(
      [
        ...(Array.isArray(project.imageUrls) ? project.imageUrls : []),
        project.imageUrl,
      ]
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  );
}

function getResponsiblePeople(project: FranchiseProject) {
  return Array.isArray(project.responsiblePeople)
    ? project.responsiblePeople.filter(
        (person) =>
          person?.name ||
          person?.role ||
          person?.responsibility ||
          person?.phone ||
          person?.email ||
          person?.avatarUrl,
      )
    : [];
}

function formatMnt(value?: number) {
  return `₮${Number(value || 0).toLocaleString("mn-MN")}`;
}

function isMglStoreFranchise(project: Pick<FranchiseProject, "title">) {
  const title = String(project.title || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return title.includes("mglstore");
}

function sortMglStoreFranchiseFirst(projects: FranchiseProject[]) {
  return projects
    .map((project, index) => ({ project, index }))
    .sort((a, b) => {
      const aPriority = isMglStoreFranchise(a.project) ? 0 : 1;
      const bPriority = isMglStoreFranchise(b.project) ? 0 : 1;
      return aPriority - bPriority || a.index - b.index;
    })
    .map(({ project }) => project);
}

function getContractHref(project: FranchiseProject) {
  if (project.contractUrl) return project.contractUrl;
  if (project.contractTemplateId) {
    return `/contract/sign/${encodeURIComponent(project.contractTemplateId)}`;
  }
  return "";
}

function ResponsiblePeopleSection({ project }: { project: FranchiseProject }) {
  const people = getResponsiblePeople(project);
  if (people.length === 0) return null;

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4">
      <div className="mb-4 flex items-center gap-2">
        <UserRound className="h-5 w-5 text-cyan-300" />
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
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

function FranchiseDetailModal({
  project,
  onClose,
}: {
  project: FranchiseProject;
  onClose: () => void;
}) {
  const images = getProjectImages(project);
  const contractHref = getContractHref(project);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        aria-label="Хаах"
      />
      <article className="relative z-10 max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-orange-200/20 bg-[#111113] text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Franchise
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
              {project.title}
            </h2>
            <p className="mt-2 text-sm font-bold text-orange-200">
              Франчайз танилцуулга болон PDF
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
            aria-label="Хаах"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          {images.length > 0 && (
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {images.map((image, index) => (
                <img
                  key={`${image}-${index}`}
                  src={image}
                  alt={`${project.title} зураг ${index + 1}`}
                  className="h-64 w-full rounded-xl border border-white/10 object-cover"
                />
              ))}
            </div>
          )}

          {(project.details || project.summary) && (
            <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4">
              {(project.details || project.summary || "")
                .split("\n")
                .map((line, index) => (
                  <p
                    key={index}
                    className="whitespace-pre-wrap text-base leading-8 text-orange-50/80"
                  >
                    {line || "\u00A0"}
                  </p>
                ))}
            </div>
          )}

          <ResponsiblePeopleSection project={project} />

          {contractHref && (
            <a
              href={contractHref}
              className="mb-6 inline-flex items-center gap-2 rounded-xl border border-cyan-200/30 bg-cyan-300 px-5 py-3 text-sm font-black text-[#071014] transition hover:brightness-110"
            >
              <FileText className="h-4 w-4" />
              Гэрээ хийх
            </a>
          )}

          {project.pdfUrl ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                <iframe
                  src={project.pdfUrl}
                  title={`${project.title} PDF`}
                  className="h-[70vh] w-full bg-white"
                />
              </div>
              <a
                href={project.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-300 px-5 py-3 text-sm font-black text-black transition hover:brightness-110"
              >
                <FileText className="h-4 w-4" />
                PDF-г шинэ цонхонд нээх
              </a>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-orange-200/30 bg-white/[0.03] p-8 text-center text-sm font-bold text-orange-100/70">
              PDF файл оруулаагүй байна.
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

export default function FranchisePage() {
  const router = useRouter();
  const { user, authFetch } = useAuth();
  const [projects, setProjects] = useState<FranchiseProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<FranchiseProject | null>(
    null,
  );
  const [loadedProjects, setLoadedProjects] = useState<
    Record<string, FranchiseProject>
  >({});
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [paymentProject, setPaymentProject] = useState<FranchiseProject | null>(
    null,
  );
  const [paymentSession, setPaymentSession] =
    useState<PaidAccessPaymentSession | null>(null);

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

  const fetchProjectDetail = async (projectId: string, invoiceId?: string) => {
    const params = invoiceId
      ? `?${new URLSearchParams({ invoiceId }).toString()}`
      : "";
    const res = await authFetch(
      `${API}/site-settings/franchise/${projectId}/detail${params}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Franchise мэдээлэл авахад алдаа гарлаа");
    }
    return data.project as FranchiseProject;
  };

  const openPaidProject = async (
    project: FranchiseProject,
    invoiceId: string,
  ) => {
    const detail = await fetchProjectDetail(project.id, invoiceId);
    setLoadedProjects((prev) => ({ ...prev, [project.id]: detail }));
    setPaymentProject(null);
    setPaymentSession(null);
    setActiveProject(detail);
  };

  const openProject = async (project: FranchiseProject) => {
    const cachedProject = loadedProjects[project.id];
    if (cachedProject) {
      setActiveProject(cachedProject);
      return;
    }

    try {
      setOpeningId(project.id);
      if (!project.price || project.price <= 0) {
        const detail = await fetchProjectDetail(project.id);
        setLoadedProjects((prev) => ({ ...prev, [project.id]: detail }));
        setActiveProject(detail);
        return;
      }

      if (!user) {
        router.push("/login");
        return;
      }

      const res = await authFetch(`${API}/site-settings/franchise/systemqr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Төлбөрийн QR үүсгэхэд алдаа гарлаа");
      }
      if (data.free) {
        const detail = await fetchProjectDetail(project.id);
        setLoadedProjects((prev) => ({ ...prev, [project.id]: detail }));
        setActiveProject(detail);
        return;
      }

      setPaymentProject(project);
      setPaymentSession({
        invoiceId: data.invoiceId,
        providerInvoiceId: data.providerInvoiceId,
        amount: Number(data.amount || project.price || 0),
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
          : "Franchise мэдээлэл авахад алдаа гарлаа",
      );
    } finally {
      setOpeningId(null);
    }
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
            <p className="mt-5 max-w-2xl text-sm leading-7 text-orange-50/70">

            </p>
          </div>
          <div className="w-fit rounded-xl border border-orange-200/20 bg-white/[0.04] px-5 py-4 text-sm font-black text-orange-100 shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
          Санал гомдол авах дугаар: <a href="tel:88008800" className="underline">
            95606060
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
                const primaryResponsiblePerson =
                  getResponsiblePeople(project)[0];
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

                      {primaryResponsiblePerson && (
                        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.05] p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/10 text-white/60">
                              {primaryResponsiblePerson.avatarUrl ? (
                                <img
                                  src={primaryResponsiblePerson.avatarUrl}
                                  alt={
                                    primaryResponsiblePerson.name ||
                                    "Хариуцагч"
                                  }
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <UserRound className="h-5 w-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-cyan-200">
                                <UserRound className="h-3.5 w-3.5" />
                                Хариуцагч
                              </div>
                              <p className="mt-1 truncate text-sm font-black text-white">
                                {primaryResponsiblePerson.name ||
                                  "Нэр оруулаагүй"}
                              </p>
                            </div>
                          </div>
                          {(primaryResponsiblePerson.responsibility ||
                            primaryResponsiblePerson.role) && (
                            <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-orange-50/60">
                              {primaryResponsiblePerson.responsibility ||
                                primaryResponsiblePerson.role}
                            </p>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => openProject(project)}
                        disabled={openingId === project.id}
                        className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-300 px-5 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-60"
                      >
                        {openingId === project.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            {isFree
                              ? "Дэлгэрэнгүй үзэх"
                              : "Төлөөд дэлгэрэнгүй үзэх"}
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
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

      {paymentProject && paymentSession && (
        <PaidAccessPaymentModal
          itemId={paymentProject.id}
          title={paymentProject.title}
          payment={paymentSession}
          checkUrl={`${API}/site-settings/franchise/systemqr/check`}
          request={authFetch}
          onPaid={(invoiceId) => openPaidProject(paymentProject, invoiceId)}
          onClose={() => {
            setPaymentProject(null);
            setPaymentSession(null);
          }}
        />
      )}

      {activeProject && (
        <FranchiseDetailModal
          project={activeProject}
          onClose={() => setActiveProject(null)}
        />
      )}
    </div>
  );
}
