"use client";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { MglClubMember, ClubWebsiteAccess } from "@mgl/types";
import { API, authFetch } from "@/lib/api";
import { ClubGoldPayment } from "./ClubGoldPayment";
import styles from "./company-admin.module.css";

export function websiteAccessDate(value: string | null): string | null {
  if (!value || !Number.isFinite(new Date(value).getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Ulaanbaatar",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || "";
  return `${part("year")} оны ${part("month")}-р сарын ${part("day")}`;
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
      <span className={styles.membershipLabel}>
        {access.eligible ? (
          <CheckCircle2 size={19} aria-hidden="true" />
        ) : (
          <LockKeyhole size={19} aria-hidden="true" />
        )}
        <strong>
          {access.eligible
            ? "Алтан гишүүнчлэл идэвхтэй"
            : access.status === "expired"
              ? "Алтан гишүүнчлэлийн хугацаа дууссан"
              : "Алтан гишүүнчлэл идэвхжээгүй"}
        </strong>
      </span>
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
      <span className={styles.eyebrow}>Алтан гишүүний үйлчилгээ</span>
      <h2>Танилцуулгын вэб бэлдэх</h2>
      <p>
        <strong>{company.businessName}</strong> байгууллагад зориулсан зураг,
        мэдээлэлтэй хувийн вэб бэлдэнэ. Бэлэн загварыг сонгоод энгийн
        талбаруудыг бөглөхөд хангалттай.
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
              <ol className={styles.websiteSteps}>
                <li>
                  <span>01</span>
                  <strong>Загвар сонгох</strong>
                  <p>
                    Байгууллагынхаа үйл ажиллагаанд тохирох бэлэн загварыг
                    сонгоно.
                  </p>
                </li>
                <li>
                  <span>02</span>
                  <strong>Мэдээллээ оруулах</strong>
                  <p>Гарчиг, тайлбар, зураг, холбоо барих мэдээллээ бөглөнө.</p>
                </li>
                <li>
                  <span>03</span>
                  <strong>Хянаад нийтлэх</strong>
                  <p>Урьдчилан хараад бэлэн болсон үедээ нийтэлнэ.</p>
                </li>
              </ol>
              <Link
                className={styles.primaryLink}
                href={`/mgl-club/site-builder/${company.id}`}
              >
                Загвар сонгож бэлдэх <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <p className={styles.registrationNote}>
                Энэ товч танилцуулга бэлдэх хэсгийг нээнэ. Та “Нийтлэх” дарсны
                дараа л вэб нийтэд харагдана.
              </p>
            </>
          ) : (
            <>
              <p className={styles.accessStatus}>
                Вэб бэлдэхийн тулд эхлээд Алтан гишүүнчлэлээ идэвхжүүлнэ.
                Бүртгэлийн мэдээлэл, мэдээгээ засах боломж нээлттэй хэвээр. Өмнө
                нийтэлсэн вэб байгаа бол нийтэд хэвээр харагдана.
              </p>
              <ClubGoldPayment companyId={company.id} onPaid={refresh} />
            </>
          )}
        </>
      )}
    </div>
  );
}
