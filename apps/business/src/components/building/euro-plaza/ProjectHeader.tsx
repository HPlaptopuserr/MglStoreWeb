import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";
export function ProjectHeader() {
  return (
    <header className="euro-header">
      <Link href="/building" className="euro-brand">
        <Building2 size={34} strokeWidth={1.4} />
        <span>
          ЕВРО ПЛАЗА<small>MGL RESIDENCES & MALL</small>
        </span>
      </Link>
      <nav aria-label="Төслийн цэс">
        <a href="#about">Төслийн тухай</a>
        <a href="#masterplan">Ерөнхий төлөвлөлт</a>
        <a href="#mall">MGL Mall</a>
      </nav>
      <a className="euro-button" href="#choose-block">
        Байр сонгох <ArrowUpRight size={16} />
      </a>
    </header>
  );
}
