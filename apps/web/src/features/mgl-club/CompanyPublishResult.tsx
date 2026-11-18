"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { normalizeClubSiteSlug } from "@mgl/types";
import { API, authFetch } from "@/lib/api";
import { companySiteOrigin } from "@/lib/company-site-url";
import styles from "./site-builder.module.css";

export const COMPANY_PUBLISHED_EVENT = "mgl-club-company-published";
export const COMPANY_SITE_URL_EVENT = "mgl-club-site-url-updated";
type PublishedProps = {
  companyId: string;
  initialPublished: boolean;
  initialSlug?: string | null;
};
type PublishedState = { published: boolean; slug: string | null };
function eventData(
  event: Event,
  companyId: string,
): { siteSlug: string | null } | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail: unknown = event.detail;
  if (
    !detail ||
    typeof detail !== "object" ||
    !("companyId" in detail) ||
    detail.companyId !== companyId
  )
    return null;
  return {
    siteSlug:
      "siteSlug" in detail && typeof detail.siteSlug === "string"
        ? normalizeClubSiteSlug(detail.siteSlug)
        : null,
  };
}
function publicHref(companyId: string, slug: string | null) {
  return slug
    ? `${companySiteOrigin}/${slug}`
    : `/mgl-club/companies/${companyId}`;
}

export function CompanyPublishedLink({
  companyId,
  initialPublished,
  initialSlug,
}: PublishedProps) {
  const [state, setState] = useState<PublishedState>({
    published: initialPublished,
    slug: normalizeClubSiteSlug(initialSlug || ""),
  });
  useEffect(() => {
    const published = (event: Event) => {
      const data = eventData(event, companyId);
      if (data) setState({ published: true, slug: data.siteSlug });
    };
    const urlChanged = (event: Event) => {
      const data = eventData(event, companyId);
      if (data) setState((current) => ({ ...current, slug: data.siteSlug }));
    };
    window.addEventListener(COMPANY_PUBLISHED_EVENT, published);
    window.addEventListener(COMPANY_SITE_URL_EVENT, urlChanged);
    return () => {
      window.removeEventListener(COMPANY_PUBLISHED_EVENT, published);
      window.removeEventListener(COMPANY_SITE_URL_EVENT, urlChanged);
    };
  }, [companyId]);
  return (
    <Link
      href={
        state.published
          ? publicHref(companyId, state.slug)
          : `/mgl-club/companies/${companyId}`
      }
      target="_blank"
      rel="noopener noreferrer"
    >
      {state.published ? "Нийтэлсэн вэб үзэх ↗" : "Байгууллагын пост үзэх ↗"}
    </Link>
  );
}

export function CompanyPublishResult({
  companyId,
  initialPublished,
  initialSlug,
  notice,
}: PublishedProps & { notice: string }) {
  const [state, setState] = useState<PublishedState>({
    published: initialPublished,
    slug: normalizeClubSiteSlug(initialSlug || ""),
  });
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const urlInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let controller: AbortController | null = null;
    async function read() {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const response = await authFetch(
          `${API}/forms/mgl-club/my-companies/${companyId}/website`,
          { signal },
        );
        const data: {
          published?: unknown;
          siteSlug?: string | null;
          message?: string;
        } = await response.json();
        if (!response.ok)
          throw new Error(
            data.message || "Нийтэлсэн холбоосыг шалгаж чадсангүй.",
          );
        if (signal.aborted) return;
        const slug = normalizeClubSiteSlug(data.siteSlug || "");
        setState({ published: Boolean(data.published), slug });
        setError("");
        if (data.published)
          window.dispatchEvent(
            new CustomEvent(COMPANY_SITE_URL_EVENT, {
              detail: { companyId, siteSlug: slug, resolved: true },
            }),
          );
      } catch (cause: unknown) {
        if (!signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Нийтэлсэн холбоосыг шалгаж чадсангүй.",
          );
      }
    }
    const published = (event: Event) => {
      const data = eventData(event, companyId);
      if (!data) return;
      controller?.abort();
      setState({ published: true, slug: data.siteSlug });
      setError("");
      setCopyStatus("");
      if (!data.siteSlug) void read();
    };
    const urlChanged = (event: Event) => {
      const data = eventData(event, companyId);
      if (!data) return;
      const detail: unknown =
        event instanceof CustomEvent ? event.detail : null;
      if (
        detail &&
        typeof detail === "object" &&
        "resolved" in detail &&
        detail.resolved === true
      )
        return;
      setCopyStatus("");
      void read();
    };
    window.addEventListener(COMPANY_PUBLISHED_EVENT, published);
    window.addEventListener(COMPANY_SITE_URL_EVENT, urlChanged);
    if (initialPublished || notice === "Байгууллагын танилцуулгыг нийтэллээ.")
      void read();
    return () => {
      controller?.abort();
      window.removeEventListener(COMPANY_PUBLISHED_EVENT, published);
      window.removeEventListener(COMPANY_SITE_URL_EVENT, urlChanged);
    };
  }, [companyId, initialPublished, notice]);
  if (!state.published) return null;
  const href = publicHref(companyId, state.slug);
  const url =
    href.startsWith("/") && typeof window !== "undefined"
      ? `${window.location.origin}${href}`
      : href;
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(url);
      setCopyStatus("Холбоосыг хууллаа.");
    } catch {
      urlInput.current?.focus();
      urlInput.current?.select();
      setCopyStatus(
        "Автоматаар хуулж чадсангүй. Сонгогдсон холбоосыг Ctrl+C / ⌘C дарж хуулна уу.",
      );
    }
  }
  return (
    <section
      className={styles.publishResult}
      aria-label="Нийтэлсэн вэбийн холбоос"
    >
      <h2>
        {notice === "Байгууллагын танилцуулгыг нийтэллээ."
          ? "Вэб нийтлэгдлээ"
          : "Нийтэлсэн вэб"}
      </h2>
      <div className={styles.publishedUrl}>
        <input
          ref={urlInput}
          aria-label="Нийтэлсэн вэбийн URL"
          readOnly
          value={url}
        />
        <Link href={href} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={15} />
          Нээх
        </Link>
        <button type="button" onClick={() => void copy()}>
          <Copy size={15} />
          Хуулах
        </button>
      </div>
      <Link
        href="/mgl-club#hero"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.goldMembersLink}
      >
        Алтан гишүүд ↗
      </Link>
      {copyStatus && <p role="status">{copyStatus}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
