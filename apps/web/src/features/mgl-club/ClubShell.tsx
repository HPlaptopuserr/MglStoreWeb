import { ClubHeader } from "./ClubHeader";
import { ClubFooter } from "./ClubFooter";
import Link from "next/link";
import { UserRound, UsersRound, Handshake, PlusCircle } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./club-design.module.css";
export function ClubShell({
  children,
  joining = false,
  total,
}: {
  children: ReactNode;
  joining?: boolean;
  total?: number | null;
}) {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#club-main">
        Үндсэн агуулга руу очих
      </a>
      <div className={styles.announcement}>
        <div>
          <span>
            <i />
            Шинэ боломж: 21 аймгийн бизнес эрхлэгчдийн B2B сүлжээнд нэгдээрэй.
          </span>
          <a href="/mgl-club#club-directory">Шууд үзэх →</a>
        </div>
      </div>
      <ClubHeader joining={joining} total={total} />
      <main id="club-main" className={joining ? styles.joinMain : undefined}>
        {children}
      </main>
      <ClubFooter />
      {!joining && (
        <nav className={styles.bottomNav} aria-label="Гар утасны клубийн цэс">
          <a href="#club-directory">
            <UsersRound size={21} />
            Гишүүд
          </a>
          <a href="#needs-hub">
            <Handshake size={21} />
            Хэрэгцээ
          </a>
          <Link href="/mgl-club/join">
            <PlusCircle size={21} />
            Бүртгүүлэх
          </Link>
          <Link href="/profile">
            <UserRound size={21} />
            Профайл
          </Link>
        </nav>
      )}
    </div>
  );
}
