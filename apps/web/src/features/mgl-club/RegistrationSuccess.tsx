import type { ClubPaymentCredentials } from "./ClubGoldPayment";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import styles from "./registration.module.css";
export function RegistrationSuccess({
  credentials,
}: {
  credentials: ClubPaymentCredentials | null;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, []);
  return (
    <>
      <section ref={ref} className={styles.success} role="status" tabIndex={-1}>
        <span>
          <Check size={30} />
        </span>
        <p className={styles.eyebrow}>БҮРТГЭЛ АМЖИЛТТАЙ</p>
        <h1>Байгууллагын пост нийтлэгдлээ!</h1>
        <p>
          Таны байгууллага гишүүдийн жагсаалтад нэмэгдлээ. Гишүүд бүтээгдэхүүн,
          үйлчилгээг тань харж, тантай шууд холбогдох боломжтой боллоо.
        </p>
        <Link href="/mgl-club">
          Гишүүдийг харах <ArrowUpRight size={17} />
        </Link>
      </section>
      {credentials && (
        <Link href={`/mgl-club/companies/${credentials.registrationId}`}>
          Нийтэлсэн постоо харах ↗
        </Link>
      )}
    </>
  );
}
