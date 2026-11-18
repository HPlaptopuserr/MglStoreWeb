"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { isFullAdmin, type MglClubMember } from "@mgl/types";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, Globe2 } from "lucide-react";
import { CompanyLogo } from "./CompanyLogo";
import { CompanyPicker } from "./CompanyPicker";
import { CompanyWebsiteAccessPanel } from "./CompanyWebsiteAccessPanel";
import { CompanyProfileEditor } from "./CompanyProfileEditor";
import { CompanyBlogManager } from "./CompanyBlogManager";
import styles from "./company-admin.module.css";

type ManagedCompany = MglClubMember & { siteSlug?: string | null };
type Section = "profile" | "website" | "news";
const sections: { id: Section; label: string; detail: string }[] = [
  {
    id: "profile",
    label: "Бүртгэлийн мэдээлэл",
    detail: "Жагсаалтын нэр, үйлчилгээ, холбоо барих",
  },
  {
    id: "website",
    label: "Вэб танилцуулга",
    detail: "Алтан гишүүний зурагтай хувийн вэб",
  },
  { id: "news", label: "Мэдээ, нийтлэл", detail: "Байгууллагын шинэ мэдээлэл" },
];

export function CompanyAdminManager() {
  const { user, authFetch } = useAuth();
  const canManageAll = Boolean(user && isFullAdmin(user.role));
  const [companies, setCompanies] = useState<ManagedCompany[]>([]);
  const [companyId, setCompanyId] = useState("");
  useEffect(() => {
    if (window.location.hash === "#website" && user && isFullAdmin(user.role))
      setActive("website");
  }, [user]);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const [active, setActive] = useState<Section>("profile");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const selected = companies.find((company) => company.id === companyId);
  const hasInnova =
    imported || companies.some((company) => company.siteSlug === "innovallc");
  const locked = busy || importing;

  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await authFetch(`${API}/forms/mgl-club/my-companies`, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Нэвтрэх хугацаа дууссан байна. Миний клуб хэсгээс дахин нэвтэрнэ үү."
              : response.status === 403
                ? "Энэ байгууллагын мэдээллийг удирдах эрхгүй байна."
                : "Байгууллагуудыг ачаалж чадсангүй.",
          );
        const result: { companies: ManagedCompany[] } = await response.json();
        if (controller.signal.aborted) return;
        setCompanies(result.companies);
        setCompanyId((previous) =>
          result.companies.some((company) => company.id === previous)
            ? previous
            : result.companies[0]?.id || "",
        );
      } catch (cause: unknown) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Холболтын алдаа гарлаа.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [user?.id, retry, authFetch]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const saved = useCallback((member: MglClubMember) => {
    setCompanies((previous) =>
      previous.map((company) =>
        company.id === member.id ? { ...company, ...member } : company,
      ),
    );
  }, []);
  function mayLeave() {
    if (locked) return false;
    if (
      dirty &&
      !window.confirm(
        "Хадгалаагүй өөрчлөлт байна. Өөрчлөлтөө орхиод үргэлжлүүлэх үү?",
      )
    )
      return false;
    return true;
  }
  function guardLink(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (!mayLeave()) event.preventDefault();
  }
  function changeSection(section: Section) {
    if (section === "website" && !canManageAll) return;
    if (section === active || !mayLeave()) return;
    setDirty(false);
    setActive(section);
  }
  async function importInnova() {
    if (!canManageAll || !mayLeave()) return;
    setImporting(true);
    setError("");
    try {
      const response = await authFetch(
        `${API}/forms/mgl-club/my-companies/import-innova`,
        { method: "POST" },
      );
      const result: {
        member?: MglClubMember;
        siteSlug?: string;
        message?: string;
      } = await response.json();
      if (!response.ok || !result.member)
        throw new Error(
          result.message || "Инновагийн мэдээллийг нэмж чадсангүй.",
        );
      const member: ManagedCompany = {
        ...result.member,
        siteSlug: result.siteSlug,
      };
      setCompanies((previous) => [
        member,
        ...previous.filter((company) => company.id !== member.id),
      ]);
      setCompanyId(member.id);
      setActive("profile");
      setImported(true);
      setDirty(false);
      setEditorEpoch((value) => value + 1);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Холболтын алдаа гарлаа. Дахин оролдоно уу.",
      );
    } finally {
      setImporting(false);
    }
  }
  return (
    <section className={styles.manager}>
      <Link
        href="/mgl-club/profile"
        onClick={guardLink}
        className={styles.back}
      >
        ← Миний клуб
      </Link>
      <div className={styles.titleRow}>
        <div>
          <span className={styles.eyebrow}>
            {canManageAll ? "Систем админы хэсэг" : "Миний байгууллагууд"}
          </span>
          <h1>Байгууллагын удирдлага</h1>
          <p>
            {canManageAll
              ? "Байгууллагаа хайж сонгоод бүртгэлийн мэдээлэл, нийтлэл, танилцуулгын вэбийг удирдана."
              : "Өөрийн байгууллагын бүртгэл, мэдээлэл болон нийтлэлээ эндээс удирдана."}
          </p>
        </div>
        <Link
          href="/mgl-club/join"
          className={styles.secondaryLink}
          onClick={guardLink}
        >
          + Байгууллага нэмэх
        </Link>
      </div>
      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button
            type="button"
            disabled={locked}
            onClick={() => {
              if (mayLeave()) {
                setDirty(false);
                setRetry((value) => value + 1);
              }
            }}
          >
            Дахин ачаалах
          </button>
        </div>
      )}
      {loading ? (
        <div className={styles.panel} role="status">
          Байгууллагуудыг ачаалж байна…
        </div>
      ) : (
        <>
          {canManageAll && !hasInnova && !error && (
            <div className={styles.importNotice}>
              <div>
                <strong>Инновагийн танилцуулгыг эндээс засах</strong>
                <p>
                  Одоо нийтлэгдсэн зураг, мэдээллийг удирдлагад нэг удаа нэмнэ.
                  Одоо байгаа мэдээллийг дарж өөрчлөхгүй.
                </p>
              </div>
              <button
                type="button"
                disabled={locked}
                onClick={() => void importInnova()}
              >
                {importing ? "Нэмж байна…" : "Инноваг удирдлагад нэмэх"}
              </button>
            </div>
          )}
          {companies.length ? (
            <>
              <div className={styles.selectionHeading}>
                <h2>
                  <span>1</span> Байгууллагаа сонгох
                </h2>
                <small>{companies.length} бүртгэлтэй байгууллага</small>
              </div>
              <div className={styles.companyBar}>
                <CompanyPicker
                  companies={companies}
                  value={companyId}
                  disabled={locked}
                  onChange={(id) => {
                    if (id !== companyId && mayLeave()) {
                      setDirty(false);
                      setCompanyId(id);
                      setActive((previous) =>
                        previous === "website" ? "website" : "profile",
                      );
                    }
                  }}
                />
              </div>
              {selected && (
                <div className={styles.selectedCompany}>
                  <div className={styles.selectedLogo}>
                    <CompanyLogo
                      name={selected.businessName}
                      url={selected.logoUrl}
                    />
                  </div>
                  <div className={styles.selectedCopy}>
                    <small>Сонгосон байгууллага</small>
                    <strong>{selected.businessName}</strong>
                    <span>
                      {selected.sector} · {selected.city} · {selected.phone}
                    </span>
                  </div>
                  <Link
                    href={`/mgl-club/companies/${selected.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Нийтийн бүртгэл үзэх ↗
                  </Link>
                </div>
              )}
              {canManageAll && selected && active !== "website" && (
                <button
                  type="button"
                  className={styles.createWebsite}
                  disabled={locked}
                  onClick={() => changeSection("website")}
                >
                  <Globe2 size={23} aria-hidden="true" />
                  <span>
                    <strong>Танилцуулгын вэб бэлдэх</strong>
                    <small>
                      Алтан гишүүнчлэлийн эрхээ шалгаад бэлэн загвараас эхэлнэ.
                    </small>
                  </span>
                  <ArrowRight size={20} aria-hidden="true" />
                </button>
              )}
              <p className={styles.registrationNote}>
                Байгууллага бүртгэхэд танилцуулгын вэб автоматаар үүсэхгүй. Вэб
                бэлдэх, нийтлэхийг тусад нь сонгоно.
              </p>
              <div
                className={styles.tabs}
                aria-label="Байгууллагын мэдээллийн хэсгүүд"
              >
                {sections
                  .filter((section) => section.id !== "website" || canManageAll)
                  .map((section) => (
                    <button
                      type="button"
                      disabled={locked}
                      key={section.id}
                      aria-pressed={active === section.id}
                      aria-controls={`company-admin-${section.id}`}
                      onClick={() => changeSection(section.id)}
                    >
                      <strong>{section.label}</strong>
                      <span>{section.detail}</span>
                    </button>
                  ))}
              </div>
              {selected && (
                <section
                  id={`company-admin-${active}`}
                  aria-label={
                    sections.find((section) => section.id === active)?.label
                  }
                >
                  {active === "profile" && (
                    <CompanyProfileEditor
                      key={`${selected.id}:${editorEpoch}`}
                      company={selected}
                      onSaved={saved}
                      onDirtyChange={setDirty}
                      onBusyChange={setBusy}
                    />
                  )}
                  {canManageAll && active === "website" && (
                    <CompanyWebsiteAccessPanel
                      key={selected.id}
                      company={selected}
                    />
                  )}
                  {active === "news" && (
                    <CompanyBlogManager
                      key={`${selected.id}:${editorEpoch}`}
                      company={selected}
                      onDirtyChange={setDirty}
                      onBusyChange={setBusy}
                    />
                  )}
                </section>
              )}
            </>
          ) : (
            !error && (
              <div className={styles.panel}>
                <h2>Одоогоор байгууллага бүртгэгдээгүй байна</h2>
                <p>
                  {canManageAll
                    ? "Шинэ байгууллага нэмэх эсвэл Инновагийн нийтлэгдсэн танилцуулгыг удирдлагад нэмээрэй."
                    : "Байгууллагаа бүртгүүлээд өөрийн пост, мэдээ, нийтлэлээ нэмээрэй."}
                </p>
                <Link className={styles.primaryLink} href="/mgl-club/join">
                  Байгууллага нэмэх
                </Link>
              </div>
            )
          )}
        </>
      )}
    </section>
  );
}
