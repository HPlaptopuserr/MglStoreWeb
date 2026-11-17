"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type ClubWebsite,
  type ClubWebsiteAccess,
  type MglClubMember,
  parseClubWebsite,
} from "@mgl/types";
import { useAuth } from "@/lib/auth-context";
import { API, authFetch } from "@/lib/api";
import { localCompanies } from "./local-companies";
import { demoCompanies } from "./demo-companies";
import {
  demoClubWebsite,
  demoSiteKey,
  withLocalWebsiteMedia,
} from "./website-template";
import { CompanySiteEditor } from "./CompanySiteEditor";
import styles from "./site-builder.module.css";
export interface ClubWebsiteState {
  draft: ClubWebsite;
  published: ClubWebsite | null;
  version: number;
  siteSlug?: string | null;
  access?: ClubWebsiteAccess;
}
export function CompanySiteBuilder({ companyId }: { companyId: string }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const demo =
    process.env.NODE_ENV !== "production" &&
    companyId.startsWith("demo-company-");
  const [loaded, setLoaded] = useState<{
      member: MglClubMember;
      state: ClubWebsiteState;
    } | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (!demo && !userId) return;
      setError("");
      try {
        if (demo) {
          const member = [...localCompanies, ...demoCompanies].find(
            (c) => c.id === companyId,
          );
          if (!member) throw new Error("Байгууллага олдсонгүй.");
          let draft = demoClubWebsite(member);
          try {
            const saved = localStorage.getItem(demoSiteKey(companyId, "draft"));
            if (saved) draft = parseClubWebsite(JSON.parse(saved)) || draft;
          } catch {
            /* Fall back to the built-in demonstration. */
          }
          if (!controller.signal.aborted)
            setLoaded({
              member,
              state: {
                draft: withLocalWebsiteMedia(member, draft),
                published: null,
                version: 0,
                access: {
                  eligible: true,
                  status: "active",
                  expiresAt: null,
                  message: "Локал туршилтын загвар. Төлбөрийн эрх олгохгүй.",
                },
                siteSlug:
                  companyId === "demo-company-innova" ? "innovallc" : null,
              },
            });
          return;
        }
        const [profileResponse, siteResponse] = await Promise.all([
          fetch(`${API}/forms/mgl-club/members/${companyId}`, {
            signal: controller.signal,
          }),
          authFetch(`${API}/forms/mgl-club/my-companies/${companyId}/website`, {
            signal: controller.signal,
          }),
        ]);
        if (siteResponse.status === 403)
          throw new Error(
            "Байгууллагын мэдээллийг зөвхөн систем админ засах эрхтэй.",
          );
        if (!profileResponse.ok || !siteResponse.ok)
          throw new Error("Байгууллагын танилцуулга ачаалж чадсангүй.");
        const profile: { member: MglClubMember } = await profileResponse.json();
        const state: ClubWebsiteState = await siteResponse.json();
        if (!controller.signal.aborted)
          setLoaded({ member: profile.member, state });
      } catch (cause: unknown) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Холболтын алдаа гарлаа.",
          );
      }
    }
    void load();
    return () => controller.abort();
  }, [companyId, demo, userId, retry]);
  if (!demo && (authLoading || !user))
    return (
      <section className={styles.message}>
        <h1>Байгууллагын танилцуулга бэлдэх</h1>
        <p>
          {authLoading
            ? "Бүртгэлийг ачаалж байна…"
            : "Байгууллагын танилцуулгыг засахын тулд систем админаар нэвтэрнэ үү."}
        </p>
        {!authLoading && (
          <Link href="/mgl-club/profile">Миний клуб рүү нэвтрэх ↗</Link>
        )}
      </section>
    );
  if (error)
    return (
      <section className={styles.message}>
        <h1>Танилцуулгын засварлагч</h1>
        <p role="alert">{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoaded(null);
            setRetry((v) => v + 1);
          }}
        >
          Дахин ачаалах
        </button>
        <Link href="/mgl-club/manage">Миний байгууллагууд</Link>
      </section>
    );
  if (!loaded || loaded.member.id !== companyId)
    return (
      <p role="status" className={styles.message}>
        Танилцуулгын мэдээлэл болон гишүүнчлэлийн эрхийг ачаалж байна…
      </p>
    );
  return (
    <CompanySiteEditor
      key={`${companyId}-${retry}`}
      member={loaded.member}
      initial={loaded.state}
      demo={demo}
    />
  );
}
