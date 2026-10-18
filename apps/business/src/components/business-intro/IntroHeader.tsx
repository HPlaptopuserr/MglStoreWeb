import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { IntroBrand } from "./IntroBrand";

export function IntroHeader() {
  return (
    <header className="intro-header">
      <IntroBrand />
      <nav aria-label="Үндсэн цэс">
        <Link href="/attendance">Цаг удирдлага</Link>
        <a href="#services">Үйлчилгээнүүд</a>
        <a href="#teams">Хэнд зориулсан бэ?</a>
        <Link href="/building">Барилгын төслүүд</Link>
        <a href="#contact">Холбогдох</a>
      </nav>
      <Link
        href="/attendance"
        className="intro-button intro-button-small intro-button-secondary"
      >
        Нэвтрэх <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </header>
  );
}
