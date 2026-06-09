"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  GraduationCap,
  Layers3,
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
import { StudyCourseModal } from "./_components/StudyCourseModal";
import {
  DEFAULT_STUDY_SETTINGS,
  buildStudyDisplayMaterials,
  getCourseScheduleText,
  normalizeStudySettings,
  type StudySettings,
} from "./_components/study-utils";

const ALL_STUDY_CATEGORIES = "Бүгд";

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
        setMaterials(visibleMaterials);
      } catch (error) {
        console.error("Failed to fetch study materials", error);
        setMaterials([]);
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
              className="absolute inset-0 h-full w-full object-cover opacity-70"
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,27,22,0.97)_0%,rgba(16,27,22,0.9)_38%,rgba(16,27,22,0.58)_68%,rgba(16,27,22,0.28)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_42%,rgba(249,115,22,0.14),transparent_34%)]" />
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
                  <div className="grid gap-0 md:grid-cols-[minmax(360px,0.95fr)_minmax(0,1fr)]">
                    <div className="flex min-h-72 bg-slate-50 p-3 md:min-h-full">
                      {getProjectImages(featuredMaterials[0])[0] ? (
                        <img
                          src={getProjectImages(featuredMaterials[0])[0]}
                          alt={featuredMaterials[0].title}
                          className="h-full w-full object-contain"
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
                        {(featuredMaterials[0].courseDate ||
                          featuredMaterials[0].registrationLabel) && (
                          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                            {getCourseScheduleText(featuredMaterials[0]) ||
                              featuredMaterials[0].registrationLabel}
                          </span>
                        )}
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
