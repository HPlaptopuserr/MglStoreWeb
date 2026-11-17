"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { MglClubMember, ClubWebsiteAccess } from "@mgl/types";
import { API, authFetch } from "@/lib/api";
import { ClubGoldPayment } from "./ClubGoldPayment";
import styles from "./company-admin.module.css";

export function websiteAccessDate(value: string | null): string | null {
  if (!value || !Number.isFinite(new Date(value).getTime())) return null;
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "long",
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date(value));
}
export function WebsiteAccessSummary({
  access,
}: {
  access: ClubWebsiteAccess;
}) {
  const date = websiteAccessDate(access.expiresAt);
  return (
    <div
      className={access.eligible ? styles.accessActive : styles.accessLocked}
    >
      <strong>
        {access.eligible
          ? "Алтан гишүүнчлэл идэвхтэй"
          : access.status === "expired"
            ? "Алтан гишүүнчлэлийн хугацаа дууссан"
            : "Алтан гишүүнчлэл идэвхжээгүй"}
      </strong>
      <p>{access.message}</p>
      {date && (
        <small>
          {access.eligible ? "Хүчинтэй хугацаа" : "Дууссан огноо"}: {date}
        </small>
      )}
    </div>
  );
}
export function CompanyWebsiteAccessPanel({
  company,
}: {
  company: MglClubMember;
}) {
  const [access, setAccess] = useState<ClubWebsiteAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const refresh = useCallback(() => setRetry((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setAccess(null);
    async function load() {
      try {
        const response = await authFetch(
          `${API}/forms/mgl-club/my-companies/${company.id}/website-access`,
          { signal: controller.signal },
        );
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Нэвтрэх хугацаа дууссан байна. Дахин нэвтэрнэ үү."
              : "Алтан гишүүнчлэлийн эрхийг шалгаж чадсангүй.",
          );
        const result: ClubWebsiteAccess = await response.json();
        if (!controller.signal.aborted) setAccess(result);
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
  }, [company.id, retry]);
  return (
    <div className={styles.panel}>
      <h2>Байгууллагын танилцуулгын вэб</h2>
      <p>
        Төлбөр нь баталгаажсан, хүчинтэй Алтан гишүүнчлэлтэй байгууллагын
        танилцуулгыг систем админ бэлдэж, нийтэлнэ.
      </p>
      {loading && (
        <p role="status" className={styles.accessStatus}>
          Алтан гишүүнчлэлийн эрхийг шалгаж байна…
        </p>
      )}
      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            Дахин шалгах
          </button>
        </div>
      )}
      {!loading && access && (
        <>
          <WebsiteAccessSummary access={access} />
          {access.eligible ? (
            <>
              <ol className={styles.steps}>
                <li>Бэлэн загвар сонгох</li>
                <li>
                  Гарчиг, тайлбар, бүтээгдэхүүний зураг, холбоо барих мэдээллээ
                  бөглөх
                </li>
                <li>Урьдчилан хараад нийтлэх</li>
              </ol>
              <Link
                className={styles.primaryLink}
                href={`/mgl-club/site-builder/${company.id}`}
              >
                Танилцуулга бэлдэх ↗
              </Link>
            </>
          ) : (
            <>
              <p className={styles.accessStatus}>
                Үндсэн мэдээлэл болон мэдээгээ засах боломж нээлттэй. Өмнө
                нийтэлсэн танилцуулга нийтэд хэвээр харагдана.
              </p>
              <ClubGoldPayment companyId={company.id} onPaid={refresh} />
            </>
          )}
        </>
      )}
    </div>
  );
}
