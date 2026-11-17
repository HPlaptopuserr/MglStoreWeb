"use client";
import Link from "next/link";
import { useState } from "react";
import { CLUB_BUSINESS_SITE_ORIGIN, normalizeClubSiteSlug } from "@mgl/types";
import { companySiteOrigin } from "@/lib/company-site-url";
import { API, authFetch } from "@/lib/api";
import styles from "./site-builder.module.css";
export function CompanySiteUrlField({
  companyId,
  initialSlug,
  demo,
  disabled,
}: {
  companyId: string;
  initialSlug?: string | null;
  demo: boolean;
  disabled: boolean;
}) {
  const [slug, setSlug] = useState(initialSlug || "");
  const [saved, setSaved] = useState(initialSlug || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function save() {
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
      const data: { siteSlug?: string; message?: string } =
        await response.json();
      if (!response.ok || !data.siteSlug)
        throw new Error(data.message || "URL хадгалж чадсангүй.");
      setSaved(data.siteSlug);
      setSlug(data.siteSlug);
      setNotice("Танилцуулгын URL хадгаллаа.");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "URL хадгалж чадсангүй.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.urlSettings} aria-label="Танилцуулгын URL">
      <h2>Танилцуулгын URL</h2>
      <label>
        URL-ийн нэр
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
          {busy ? "Хадгалж байна…" : "URL хадгалах"}
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
