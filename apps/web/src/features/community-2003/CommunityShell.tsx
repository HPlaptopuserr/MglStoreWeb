"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UsersRound, CirclePlus, UserRound, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { CommunityWorkspace } from "./CommunityWorkspace";
import styles from "./community-shell.module.css";
const items = [
  { href: "/2003", label: "Хүмүүс", icon: UsersRound },
  { href: "/2003/join", label: "Нэгдэх", icon: CirclePlus },
  { href: "/2003/profile", label: "Профайл", icon: UserRound },
];
export function CommunityShell({
  children,
  embedded,
}: {
  children: ReactNode;
  embedded: boolean;
}) {
  const pathname = usePathname();
  return (
    <CommunityWorkspace>
      <div className={styles.shell} data-embedded={embedded}>
        <a className={styles.skip} href="#community-content">
          Агуулга руу шилжих
        </a>
        <header className={styles.header}>
          <Link href="/2003" className={styles.brand} aria-label="2003 нүүр">
            <span className={styles.mark}>
              03<span>✳</span>
            </span>
            <span>
              <b>2003</b>
              <small>БИДНИЙ ХҮРЭЭЛЭЛ</small>
            </span>
          </Link>
          <Link href="/2003/join" className={styles.headerAction}>
            Нэгдэх <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </header>
        <main id="community-content" className={styles.content}>
          {children}
        </main>
        <nav className={styles.nav} aria-label="2003 үндсэн цэс">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch
              aria-current={pathname === href ? "page" : undefined}
            >
              <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </CommunityWorkspace>
  );
}
