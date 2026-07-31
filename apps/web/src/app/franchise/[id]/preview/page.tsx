"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  ExternalLink,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  PaidAccessPaymentModal,
  type PaidAccessPaymentSession,
} from "@/components/molecules/payments/PaidAccessPaymentModal";
import {
  PaidAccessDetailError,
  PaidAccessDetailLoading,
} from "@/components/molecules/paid-access/PaidAccessDetailState";
import { ProjectPdfPreview } from "@/components/molecules/projects/ProjectPdfPreview";
import {
  formatMnt,
  getResponsiblePeople,
  type FranchiseProject,
  type FranchiseMembershipAccess,
} from "../../_lib/franchise";

export default function FranchisePreviewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, authFetch } = useAuth();
  const [project, setProject] = useState<FranchiseProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [paymentSession, setPaymentSession] =
    useState<PaidAccessPaymentSession | null>(null);
  const [membershipAccess, setMembershipAccess] =
    useState<FranchiseMembershipAccess | null>(null);
  const [mPointBalance, setMPointBalance] = useState(0);

  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (!projectId) {
      setError("Franchise ID олдсонгүй");
      setLoading(false);
      return;
    }

    const fetchProject = async () => {
      try {
        setLoading(true);
        setError("");
        const res = user
          ? await authFetch(`${API}/site-settings/franchise`, {
              cache: "no-store",
            })
          : await fetch(`${API}/site-settings/franchise`, {
              cache: "no-store",
            });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(
            data.message || "Franchise preview авахад алдаа гарлаа",
          );
        }
        const projects = Array.isArray(data.projects) ? data.projects : [];
        const match = projects.find(
          (item: FranchiseProject) => item.id === projectId,
        );
        if (!match) throw new Error("Franchise олдсонгүй");
        setProject(match as FranchiseProject);
        setMembershipAccess(data.membershipAccess || null);
        setMPointBalance(Number(data.mPointBalance || 0));
      } catch (fetchError) {
        console.error(fetchError);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Franchise preview авахад алдаа гарлаа",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [authFetch, projectId, user]);

  const openDetail = (invoiceId?: string) => {
    if (!project) return;
    const query = invoiceId
      ? `?${new URLSearchParams({ invoiceId }).toString()}`
      : "";
    router.push(`/franchise/${project.id}${query}`);
  };

  const unlockProject = async () => {
    if (!project) return;

    if (project.hasPurchased) {
      openDetail();
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      setOpening(true);
      if (membershipAccess?.eligible && membershipAccess.remainingCredits > 0) {
        const unlockResponse = await authFetch(
          `${API}/site-settings/franchise/${project.id}/membership-unlock`,
          { method: "POST" },
        );
        const unlockData = await unlockResponse.json().catch(() => ({}));
        if (!unlockResponse.ok || !unlockData.success) {
          throw new Error(
            unlockData.message || "Гишүүнчлэлийн эрхээр нээж чадсангүй",
          );
        }
        openDetail();
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
        openDetail();
        return;
      }
      setPaymentSession({
        invoiceId: data.invoiceId,
        providerInvoiceId: data.providerInvoiceId,
        amount: Number(data.amount || project.price || 0),
        qrText: String(data.qrText || ""),
        qrImage: String(data.qrImage || ""),
        urls: Array.isArray(data.urls) ? data.urls : [],
        expiresAt: data.expiresAt,
      });
    } catch (unlockError) {
      console.error(unlockError);
      alert(
        unlockError instanceof Error
          ? unlockError.message
          : "Төлбөрийн QR үүсгэхэд алдаа гарлаа",
      );
    } finally {
      setOpening(false);
    }
  };

  const unlockWithMPoint = async () => {
    if (!project) return;
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      setOpening(true);
      const response = await authFetch(
        `${API}/site-settings/franchise/${project.id}/m-point-unlock`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || "M Point-оор нээж чадсангүй");
      }
      setMPointBalance(Number(data.pointBalance || 0));
      openDetail();
    } catch (unlockError) {
      alert(
        unlockError instanceof Error
          ? unlockError.message
          : "M Point-оор нээж чадсангүй",
      );
    } finally {
      setOpening(false);
    }
  };

  if (loading) {
    return <PaidAccessDetailLoading label="Franchise preview уншиж байна..." />;
  }

  if (error || !project) {
    return (
      <PaidAccessDetailError
        title="Preview нээгдсэнгүй"
        message={error || "Franchise preview олдсонгүй"}
        backLabel="Franchise руу буцах"
        onBack={() => router.push("/franchise")}
      />
    );
  }

  const people = getResponsiblePeople(project);

  return (
    <div className="min-h-screen bg-[#0f0f11] text-white">
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.push("/franchise")}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Franchise руу буцах
        </button>

        <section className="mt-6 overflow-hidden rounded-3xl border border-orange-200/20 bg-[#111113] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="border-b border-white/10 px-5 py-5 sm:px-7">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
              Franchise preview
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase leading-tight sm:text-4xl">
              {project.title}
            </h1>
            <p className="mt-3 text-sm font-bold text-orange-200">
              Эхний 3 хуудсыг үнэгүй үзээд, бүтэн мэдээллийг төлбөрөөр нээнэ.
            </p>
          </div>

          <div className="grid gap-6 px-5 py-5 sm:px-7 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              {project.summary && (
                <p className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-semibold leading-7 text-orange-50/80">
                  {project.summary}
                </p>
              )}
              <ProjectPdfPreview
                project={project}
                hasFullAccess={Boolean(project.hasPurchased)}
              />
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                  Хариуцагч
                </p>
                {people.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {people.slice(0, 3).map((person, index) => (
                      <div
                        key={person.id || person.teamMemberId || index}
                        className="flex min-w-0 gap-3 rounded-xl bg-white/[0.04] p-3"
                      >
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
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">
                            {person.name || "Нэр оруулаагүй"}
                          </p>
                          {(person.responsibility || person.role) && (
                            <p className="mt-0.5 truncate text-xs font-semibold text-orange-50/60">
                              {person.responsibility || person.role}
                            </p>
                          )}
                          <p className="mt-1 inline-flex items-center gap-1 text-xs font-black text-orange-100">
                            <Phone className="h-3.5 w-3.5 text-orange-300" />
                            {person.phone || "Дугаар оруулаагүй"}
                          </p>
                          {person.email && (
                            <p className="mt-1 flex min-w-0 items-center gap-1 text-[11px] font-bold text-orange-50/60">
                              <Mail className="h-3 w-3 shrink-0 text-orange-300" />
                              <span className="truncate">{person.email}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-semibold text-orange-50/60">
                    Хариуцагч нэмээгүй байна.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-orange-200/20 bg-orange-200/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-100/70">
                  Бүтэн PDF
                </p>
                <p className="mt-2 text-2xl font-black text-orange-100">
                  {formatMnt(project.price)}
                </p>
                <button
                  type="button"
                  onClick={unlockProject}
                  disabled={opening}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-300 px-5 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-60"
                >
                  {opening ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : project.hasPurchased ||
                    (membershipAccess?.remainingCredits || 0) > 0 ? (
                    <ExternalLink className="h-4 w-4" />
                  ) : (
                    <LockKeyhole className="h-4 w-4" />
                  )}
                  {opening
                    ? "Нээж байна..."
                    : project.hasPurchased
                      ? "Нээсэн төслөө үзэх"
                      : (membershipAccess?.remainingCredits || 0) > 0
                        ? "1 эрхээр бүтнээр нээх"
                        : "Төлж бүтнээр нээх"}
                </button>
                {!project.hasPurchased && Number(project.price || 0) > 0 && (
                  <button
                    type="button"
                    onClick={unlockWithMPoint}
                    disabled={
                      opening || mPointBalance < Number(project.price || 0)
                    }
                    className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-200/30 bg-amber-200/10 px-5 text-sm font-black text-amber-100 transition hover:border-amber-200/60 hover:bg-amber-200/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Coins className="h-4 w-4" />
                    {mPointBalance >= Number(project.price || 0)
                      ? `${Number(project.price || 0).toLocaleString("mn-MN")} M Point-оор нээх`
                      : `M Point хүрэлцэхгүй (${mPointBalance.toLocaleString("mn-MN")} M)`}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => openDetail()}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                Дэлгэрэнгүй page
                <ArrowRight className="h-4 w-4" />
              </button>
            </aside>
          </div>
        </section>
      </main>

      {paymentSession && (
        <PaidAccessPaymentModal
          itemId={project.id}
          title={project.title}
          payment={paymentSession}
          checkUrl={`${API}/site-settings/franchise/systemqr/check`}
          request={authFetch}
          onPaid={async (invoiceId) => openDetail(invoiceId)}
          onClose={() => setPaymentSession(null)}
        />
      )}
    </div>
  );
}
