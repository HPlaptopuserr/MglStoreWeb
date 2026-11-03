import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";
export function ProjectNavigation({
  title = "ӨРГӨӨ 16",
  href = "/building/demo",
}: {
  title?: string;
  href?: string;
}) {
  return (
    <header className="residence-nav">
      <Link href={href} className="residence-brand">
        <Building2 size={26} strokeWidth={1.3} />
        <span>
          {title}
          <small>RESIDENCES & RETAIL</small>
        </span>
      </Link>
      <nav aria-label="Төслийн навигаци">
        <a href="#about">Төслийн тухай</a>
        {href === "/building/demo" ? (
          <a href="#layouts">Байрны төлөвлөлт</a>
        ) : (
          <a href="#gallery">Зургийн цомог</a>
        )}
        <a href="#choose-floor">Давхар сонгох</a>
      </nav>
      <a className="residence-nav-cta" href="#choose-floor">
        Байр сонгох
        <ArrowUpRight size={16} />
      </a>
    </header>
  );
}
