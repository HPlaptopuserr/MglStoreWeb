import Link from "next/link";
import { ArrowUpRight, Search, UserRound, PlusCircle } from "lucide-react";
import { clubRoutes } from "./club-routes";
import { ClubBrand } from "./ClubBrand";
import styles from "./club-design.module.css";
export function ClubHeader({
  joining,
  total,
}: {
  joining: boolean;
  total?: number | null;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <ClubBrand subtitle />
        <nav className={styles.navigation} aria-label="Клубийн үндсэн цэс">
          <Link href="/mgl-club#hero">Нүүр</Link>
          <Link href="/mgl-club#introduction">Танилцуулга</Link>
          <Link href="/mgl-club#club-directory">
            Гишүүд {total != null && <b>{total}</b>}
          </Link>
          <Link href="/mgl-club#needs-hub">Хэрэгцээ & Зарууд</Link>
          <Link href="/mgl-club#benefits">Давуу тал</Link>
          <Link href="/mgl-club#about">Клубийн дүрэм</Link>
        </nav>
        <div className={styles.headerActions}>
          <Link href={clubRoutes.profile} className={styles.secondary}>
            <UserRound size={16} />
            Миний клуб
          </Link>
          <Link
            href={joining ? "/mgl-club" : "/mgl-club/join"}
            className={styles.primary}
          >
            {joining ? "Гишүүдийг харах" : "Клубт нэгдэх"}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className={styles.mobileActions}>
          <Link href="/mgl-club#club-search" aria-label="Үйлчилгээ хайх">
            <Search size={21} />
          </Link>
          <Link href="/mgl-club/join" aria-label="Бизнесээ бүртгүүлэх">
            <PlusCircle size={21} />
          </Link>
          <Link href={clubRoutes.profile} aria-label="Миний клубийн профайл">
            <UserRound size={19} />
          </Link>
        </div>
      </div>
    </header>
  );
}
