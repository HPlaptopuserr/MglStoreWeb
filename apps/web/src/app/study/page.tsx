"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  PaidAccessPaymentModal,
  type PaidAccessPaymentSession,
} from "@/components/molecules/payments/PaidAccessPaymentModal";
import type { ProjectItem } from "@/components/molecules/projects/project-types";
import { StudyCourseModal } from "./_components/StudyCourseModal";
import { StudySections } from "./_components/StudySections";
import {
  DEFAULT_STUDY_SETTINGS,
  buildFeaturedStudyMaterials,
  buildStudyDisplayMaterials,
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
  const [activeTicketOptionId, setActiveTicketOptionId] = useState("");
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
  const featuredMaterials = buildFeaturedStudyMaterials(displayMaterials);
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

  const openStudyMaterial = (
    material: ProjectItem,
    ticketOptionId?: string,
  ) => {
    setActiveTicketOptionId(ticketOptionId || "");
    setActiveMaterial(material);
  };

  const registerStudy = async (
    material: ProjectItem,
    ticketOptionId?: string,
  ) => {
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
        body: JSON.stringify({
          projectId: material.id,
          ...(ticketOptionId && ticketOptionId !== "default"
            ? { ticketOptionId }
            : {}),
        }),
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
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-3 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6">
          <StudySections
            activeCategory={activeCategory}
            activeCategoryMaterials={activeCategoryMaterials}
            allCategoryLabel={ALL_STUDY_CATEGORIES}
            categoryTabs={categoryTabs}
            displayMaterials={displayMaterials}
            featuredMaterials={featuredMaterials}
            loading={loading}
            openingId={openingId}
            settings={settings}
            showAllCourses={showAllCourses}
            visibleCategoryMaterials={visibleCategoryMaterials}
            onOpenMaterial={openStudyMaterial}
            onSelectCategory={(category) => {
              setActiveCategory(category);
              setShowAllCourses(false);
            }}
            onToggleShowAllCourses={() =>
              setShowAllCourses((current) => !current)
            }
          />
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
          initialTicketOptionId={activeTicketOptionId}
          registered={Boolean(registeredMaterialIds[activeMaterial.id])}
          registering={openingId === activeMaterial.id}
          onRegister={registerStudy}
          onClose={() => {
            setActiveMaterial(null);
            setActiveTicketOptionId("");
          }}
        />
      )}
    </div>
  );
}
