"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { QrGenerator } from "@mgl/ui";
import { API, authFetch } from "@/lib/api";
import styles from "./companies.module.css";
export interface ClubPaymentCredentials {
  registrationId: string;
  paymentToken: string;
}
interface Invoice {
  invoiceId: string;
  amount: number;
  qrText: string;
  expiresAt: string;
  deepLinks: Array<{ name: string; link: string }>;
}
type PaymentProps = {
  onPaid?: () => void;
} & (
  | { credentials: ClubPaymentCredentials; companyId?: never }
  | { companyId: string; credentials?: never }
);
export function ClubGoldPayment({
  credentials,
  companyId,
  onPaid,
}: PaymentProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const base = companyId
    ? `${API}/forms/mgl-club/my-companies/${companyId}`
    : `${API}/forms/mgl-club/gold/${credentials?.registrationId}`;
  const token = credentials?.paymentToken;
  useEffect(() => {
    if (!invoice || paid || expired) return;
    let stopped = false;
    let checking = false;
    async function poll() {
      if (checking || document.hidden || !invoice) return;
      checking = true;
      try {
        const response = companyId
          ? await authFetch(
              `${base}/gold-invoices/${invoice.invoiceId}/check`,
              { method: "POST" },
            )
          : await fetch(`${base}/invoices/${invoice.invoiceId}/check`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
        const data: { status?: string } = await response.json();
        if (!response.ok) throw new Error();
        if (!stopped) {
          setError("");
          setPaid(data.status === "PAID");
          if (data.status === "PAID") onPaid?.();
          setExpired(data.status === "EXPIRED");
        }
      } catch {
        if (!stopped)
          setError("Төлбөр шалгаж чадсангүй. Холболт сэргэхэд дахин шалгана.");
      } finally {
        checking = false;
      }
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [invoice, paid, expired, base, token, companyId, onPaid]);
  async function create() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = companyId
        ? await authFetch(`${base}/gold-invoice`, { method: "POST" })
        : await fetch(`${base}/invoice`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
      const data: Invoice & { message?: string } = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Нэхэмжлэх үүсгэж чадсангүй.");
      setInvoice(data);
      setExpired(false);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Холболтын алдаа гарлаа.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.payment} aria-labelledby="gold-payment-title">
      <h2 id="gold-payment-title">Алтан гишүүнчлэл</h2>
      <p>
        <strong>1,200,000₮ · 6 сар</strong>
      </p>
      <p>
        Төлбөр баталгаажмагц Алтан гишүүнчлэл идэвхжиж, байгууллагын
        танилцуулгын вэб бэлдэх болон нийтлэх эрх нээгдэнэ.
      </p>
      {paid ? (
        <div role="status">
          <p>Төлбөр баталгаажлаа. Алтан гишүүнчлэл идэвхжлээ!</p>
          {companyId ? (
            <button type="button" onClick={onPaid}>
              Танилцуулгын эрхийг шалгах
            </button>
          ) : (
            <Link href="/mgl-club">Алтан гишүүдийг харах ↗</Link>
          )}
        </div>
      ) : (
        <>
          {invoice && !expired && (
            <div className={styles.qr}>
              <QrGenerator value={invoice.qrText} size={220} />
              <div className={styles.bankLinks}>
                {invoice.deepLinks
                  .filter((bank) =>
                    /^(https?:\/\/|[a-z][a-z0-9+.-]*:\/\/)/i.test(bank.link),
                  )
                  .map((bank) => (
                    <a key={bank.link} href={bank.link}>
                      {bank.name || "Банкны апп"} ↗
                    </a>
                  ))}
              </div>
              <p role="status">
                Банкны апп-аар QR уншуулна уу. Төлбөрийг автоматаар шалгаж
                байна…
              </p>
            </div>
          )}
          {expired && (
            <p role="status">
              Нэхэмжлэхийн хугацаа дууслаа. Шинээр үүсгэнэ үү.
            </p>
          )}
          {(!invoice || expired) && (
            <button type="button" disabled={busy} onClick={() => void create()}>
              {busy ? "Нэхэмжлэх үүсгэж байна…" : "Төлбөрийн QR үүсгэх"}
            </button>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
