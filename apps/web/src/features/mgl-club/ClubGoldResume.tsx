"use client";
import { useState } from "react";
import {
  ClubGoldPayment,
  type ClubPaymentCredentials,
} from "./ClubGoldPayment";
import styles from "./companies.module.css";
export function ClubGoldResume() {
  const [credentials, setCredentials] = useState<ClubPaymentCredentials | null>(
    null,
  );
  const [error, setError] = useState("");
  function resume() {
    try {
      const data: unknown = JSON.parse(
        sessionStorage.getItem("mgl-club-payment") || "null",
      );
      if (
        !data ||
        typeof data !== "object" ||
        !("registrationId" in data) ||
        !("paymentToken" in data) ||
        typeof data.registrationId !== "string" ||
        typeof data.paymentToken !== "string"
      )
        throw new Error();
      setCredentials({
        registrationId: data.registrationId,
        paymentToken: data.paymentToken,
      });
      setError("");
    } catch {
      setError(
        "Энэ хөтөчид төлбөрийн бүртгэл алга байна. Байгууллагаа логоны хамт бүртгүүлээд үргэлжлүүлээрэй.",
      );
    }
  }
  if (credentials) return <ClubGoldPayment credentials={credentials} />;
  return (
    <section className={styles.payment}>
      <h2>Алтан гишүүнчлэл · 6 сар</h2>
      <p>
        1,200,000₮ · Байгууллагын лого, нэрийг нүүр хуудасны Алтан гишүүд хэсэгт
        байршуулна.
      </p>
      <button type="button" onClick={resume}>
        Бүртгэлийн төлбөрөө үргэлжлүүлэх
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
