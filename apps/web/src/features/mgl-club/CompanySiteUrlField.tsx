"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CLUB_BUSINESS_SITE_ORIGIN,
  normalizeClubSiteSlug,
  type ClubWebsiteAccess,
} from "@mgl/types";
import { companySiteOrigin } from "@/lib/company-site-url";
import { API, authFetch } from "@/lib/api";
import styles from "./site-builder.module.css";
import {
  COMPANY_SITE_URL_EVENT,
  COMPANY_PUBLISHED_EVENT,
} from "./CompanyPublishResult";
export function CompanySiteUrlField({
  companyId,
  initialSlug,
  demo,
  disabled,
  onAccessDenied,
}: {
  companyId: string;
  initialSlug?: string | null;
  demo: boolean;
  disabled: boolean;
  onAccessDenied?: (access: ClubWebsiteAccess) => void;
}) {
  const [slug, setSlug] = useState(initialSlug || "");
  const [saved, setSaved] = useState(initialSlug || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const updatePublishedSlug = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail: unknown = event.detail;
      if (
        !detail ||
        typeof detail !== "object" ||
        !("companyId" in detail) ||
        detail.companyId !== companyId ||
        !("siteSlug" in detail) ||
        typeof detail.siteSlug !== "string"
      )
        return;
      const next = normalizeClubSiteSlug(detail.siteSlug);
      if (!next) return;
      setSlug((current) => (current === saved ? next : current));
      setSaved(next);
    };
    window.addEventListener(COMPANY_PUBLISHED_EVENT, updatePublishedSlug);
    window.addEventListener(COMPANY_SITE_URL_EVENT, updatePublishedSlug);
    return () => {
      window.removeEventListener(COMPANY_PUBLISHED_EVENT, updatePublishedSlug);
      window.removeEventListener(COMPANY_SITE_URL_EVENT, updatePublishedSlug);
    };
  }, [companyId, saved]);
  async function save() {
    if (disabled || busy || demo) return;
    const normalized = normalizeClubSiteSlug(slug);
    if (!normalized) {
      setError(
        "3–63 тэмдэгттэй латин үсэг, тоо, дунд зураас ашиглана уу. Системийн нэр ашиглахгүй.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await authFetch(
        `${API}/forms/mgl-club/my-companies/${companyId}/site-url`,
        { method: "PUT", body: JSON.stringify({ slug: normalized }) },
      );
      const data: {
        siteSlug?: string;
        message?: string;
        access?: ClubWebsiteAccess;
      } = await response.json();
      if (response.status === 403 && data.access) onAccessDenied?.(data.access);
      if (!response.ok || !data.siteSlug)
        throw new Error(data.message || "URL хадгалж чадсангүй.");
      setSaved(data.siteSlug);
      setSlug(data.siteSlug);
      window.dispatchEvent(
        new CustomEvent(COMPANY_SITE_URL_EVENT, {
          detail: { companyId, siteSlug: data.siteSlug },
        }),
      );
      setNotice("Танилцуулгын богино холбоос хадгаллаа.");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "URL хадгалж чадсангүй.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={styles.urlSettings}
      aria-label="Танилцуулгын богино холбоос"
    >
      <h2>Танилцуулгын богино холбоос</h2>
      <label>
        Холбоосын нэр
        <input
          value={slug}
          maxLength={63}
          placeholder="innovallc"
          disabled={disabled || busy || demo}
          onChange={(event) => {
            setSlug(event.target.value.toLowerCase());
            setError("");
            setNotice("");
          }}
          autoCapitalize="none"
          spellCheck={false}
        />
      </label>
      {!demo && (
        <button
          type="button"
          disabled={disabled || busy || slug === saved}
          onClick={() => void save()}
        >
          {busy ? "Хадгалж байна…" : "Холбоос хадгалах"}
        </button>
      )}
      {saved && (
        <Link
          href={`${companySiteOrigin}/${saved}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {CLUB_BUSINESS_SITE_ORIGIN}/{saved} ↗
        </Link>
      )}
      {demo && <p>Локал танилцуулгын богино холбоос.</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
