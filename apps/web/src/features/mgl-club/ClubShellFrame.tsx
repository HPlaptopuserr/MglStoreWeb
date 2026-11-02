"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ClubHeader } from "./ClubHeader";
import { ClubFooter } from "./ClubFooter";
import { ClubMobileNavigation } from "./ClubMobileNavigation";
import { clubRoutes } from "./club-routes";
import styles from "./club-design.module.css";

export function ClubShellFrame({
  children,
  embedded,
  total,
}: {
  children: ReactNode;
  embedded: boolean;
  total?: number | null;
}) {
  const joining = usePathname() === clubRoutes.join;
  return (
    <div className={styles.page} data-embedded={embedded}>
      <a className={styles.skipLink} href="#club-main">
        Үндсэн агуулга руу очих
      </a>
      <div className={styles.announcement}>
        <div>
          <span>
            <i />
            Шинэ боломж: 21 аймгийн бизнес эрхлэгчдийн B2B сүлжээнд нэгдээрэй.
          </span>
          <Link href={clubRoutes.directory}>Шууд үзэх →</Link>
        </div>
      </div>
      <ClubHeader joining={joining} total={total} />
      <main id="club-main" className={joining ? styles.joinMain : undefined}>
        {children}
      </main>
      <ClubFooter />
      <ClubMobileNavigation />
    </div>
  );
}
