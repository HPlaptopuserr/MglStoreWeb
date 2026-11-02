"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clubRoutes } from "./club-routes";
import { useEffect, useState } from "react";
import { Handshake, PlusCircle, UserRound, UsersRound } from "lucide-react";
import styles from "./club-design.module.css";

type ClubSection = "club-directory" | "needs-hub";

export function ClubMobileNavigation() {
  const pathname = usePathname();
  const isHome = pathname === clubRoutes.home;
  const isProfile = pathname === clubRoutes.profile;
  const [active, setActive] = useState<ClubSection | null>(null);

  useEffect(() => {
    if (pathname !== clubRoutes.home) return;
    const sections = ["club-directory", "needs-hub"] as const;
    const visible = new Set<ClubSection>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = sections.find((section) => section === entry.target.id);
          if (!id) continue;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        setActive(
          visible.has("needs-hub")
            ? "needs-hub"
            : visible.has("club-directory")
              ? "club-directory"
              : null,
        );
      },
      { rootMargin: "-10% 0px -55% 0px", threshold: 0 },
    );
    for (const id of sections) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <nav className={styles.bottomNav} aria-label="Гар утасны клубийн цэс">
      <Link
        href={clubRoutes.directory}
        prefetch
        aria-current={
          isHome && active === "club-directory" ? "location" : undefined
        }
        onClick={() => setActive("club-directory")}
      >
        <UsersRound size={22} aria-hidden="true" /> Гишүүд
      </Link>
      <Link
        href={clubRoutes.needs}
        prefetch
        aria-current={isHome && active === "needs-hub" ? "location" : undefined}
        onClick={() => setActive("needs-hub")}
      >
        <Handshake size={22} aria-hidden="true" /> Хэрэгцээ
      </Link>
      <Link
        href={clubRoutes.join}
        prefetch
        aria-current={pathname === clubRoutes.join ? "page" : undefined}
      >
        <PlusCircle size={22} aria-hidden="true" /> Нэгдэх
      </Link>
      <Link
        href={clubRoutes.profile}
        prefetch
        aria-current={isProfile ? "page" : undefined}
      >
        <UserRound size={22} aria-hidden="true" /> Профайл
      </Link>
    </nav>
  );
}
