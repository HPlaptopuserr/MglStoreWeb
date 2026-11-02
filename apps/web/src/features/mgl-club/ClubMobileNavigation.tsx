"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Handshake, PlusCircle, UserRound, UsersRound } from "lucide-react";
import styles from "./club-design.module.css";

type ClubSection = "club-directory" | "needs-hub";

export function ClubMobileNavigation() {
  const [active, setActive] = useState<ClubSection | null>(null);

  useEffect(() => {
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
  }, []);

  return (
    <nav className={styles.bottomNav} aria-label="Гар утасны клубийн цэс">
      <a
        href="#club-directory"
        aria-current={active === "club-directory" ? "location" : undefined}
        onClick={() => setActive("club-directory")}
      >
        <UsersRound size={22} aria-hidden="true" /> Гишүүд
      </a>
      <a
        href="#needs-hub"
        aria-current={active === "needs-hub" ? "location" : undefined}
        onClick={() => setActive("needs-hub")}
      >
        <Handshake size={22} aria-hidden="true" /> Хэрэгцээ
      </a>
      <Link href="/mgl-club/join">
        <PlusCircle size={22} aria-hidden="true" /> Нэгдэх
      </Link>
      <Link href="/profile">
        <UserRound size={22} aria-hidden="true" /> Профайл
      </Link>
    </nav>
  );
}
