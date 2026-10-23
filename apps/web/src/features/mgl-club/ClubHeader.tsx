import Link from "next/link";
import {
  ArrowUpRight,
  ShoppingBag,
  Search,
  UserRound,
  PlusCircle,
} from "lucide-react";
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
          <a href="/mgl-club#hero">Нүүр</a>
          <a href="/mgl-club#introduction">Танилцуулга</a>
          <a href="/mgl-club#club-directory">
            Гишүүд {total != null && <b>{total}</b>}
          </a>
          <a href="/mgl-club#needs-hub">Хэрэгцээ & Зарууд</a>
          <a href="/mgl-club#benefits">Давуу тал</a>
          <a href="/mgl-club#about">Клубийн дүрэм</a>
        </nav>
        <div className={styles.headerActions}>
          <Link href="/" className={styles.secondary}>
            <ShoppingBag size={16} />
            Дэлгүүр
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
          <a href="/mgl-club#club-search" aria-label="Үйлчилгээ хайх">
            <Search size={21} />
          </a>
          <Link href="/mgl-club/join" aria-label="Бизнесээ бүртгүүлэх">
            <PlusCircle size={21} />
          </Link>
          <Link href="/profile" aria-label="Миний профайл">
            <UserRound size={19} />
          </Link>
        </div>
      </div>
    </header>
  );
}
