import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";
interface ProjectHeaderProps {
  title?: string;
  href?: string;
  navigation?: ReadonlyArray<{ href: string; label: string }>;
  chooseHref?: string;
}
export function ProjectHeader({
  title = "ЕВРО ПЛАЗА",
  href = "/building",
  navigation = [
    { href: "#about", label: "Төслийн тухай" },
    { href: "#masterplan", label: "Ерөнхий төлөвлөлт" },
    { href: "#mall", label: "MGL Mall" },
  ],
  chooseHref = "#choose-block",
}: ProjectHeaderProps) {
  return (
    <header className="euro-header">
      <Link href={href} className="euro-brand">
        <Building2 size={34} strokeWidth={1.4} />
        <span>
          {title}
          <small>MGL RESIDENCES & MALL</small>
        </span>
      </Link>
      <nav aria-label="Төслийн цэс">
        {navigation.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <a className="euro-button" href={chooseHref}>
        Байр сонгох <ArrowUpRight size={16} />
      </a>
    </header>
  );
}
