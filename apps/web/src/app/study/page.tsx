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
  buildStudyDisplayMaterials,
  buildFeaturedStudyMaterials,
  normalizeStudySettings,
  type StudySettings,
} from "./_components/study-utils";

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
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const orderedMaterials = buildStudyDisplayMaterials(materials);
  const featuredIds = buildFeaturedStudyMaterials(orderedMaterials).map(
    (material) => material.id,
  );
  const displayMaterials = [
    ...featuredIds.flatMap((id) =>
      orderedMaterials.filter((material) => material.id === id),
    ),
    ...orderedMaterials.filter(
      (material) => !featuredIds.includes(material.id),
    ),
  ];

  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await fetch(`${API}/site-settings/study`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Сургалтын мэдээлэл ачаалагдсангүй");
        const data = await res.json();
        const parsed = Array.isArray(data.projects) ? data.projects : [];
        setSettings(normalizeStudySettings(data.settings));
        const visibleMaterials = parsed.filter(
          (item: ProjectItem) => item.isActive !== false,
        );
        setMaterials(visibleMaterials);
      } catch (error) {
        console.error("Failed to fetch study materials", error);
        setLoadError("Сургалтын мэдээлэл ачаалагдсангүй. Дахин оролдоно уу.");
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [retryKey]);

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

      setActiveTicketOptionId(ticketOptionId || "");
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
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <main>
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6">
          <StudySections
            displayMaterials={displayMaterials}
            loading={loading}
            error={loadError}
            openingId={openingId}
            settings={settings}
            onOpenMaterial={openStudyMaterial}
            onRetry={() => setRetryKey((current) => current + 1)}
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

      {activeMaterial && !(paymentMaterial && paymentSession) && (
        <StudyCourseModal
          key={`${activeMaterial.id}:${activeTicketOptionId}`}
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
