import { ClubHeader } from "./ClubHeader";
import { ClubFooter } from "./ClubFooter";
import { headers } from "next/headers";
import { ClubMobileNavigation } from "./ClubMobileNavigation";
import type { ReactNode } from "react";
import styles from "./club-design.module.css";
export async function ClubShell({
  children,
  joining = false,
  total,
}: {
  children: ReactNode;
  joining?: boolean;
  total?: number | null;
}) {
  const embedded =
    (await headers()).get("user-agent")?.includes("MGLStoreApp/") ?? false;
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
          <a href="/mgl-club#club-directory">Шууд үзэх →</a>
        </div>
      </div>
      <ClubHeader joining={joining} total={total} />
      <main id="club-main" className={joining ? styles.joinMain : undefined}>
        {children}
      </main>
      <ClubFooter />
      {!joining && <ClubMobileNavigation />}
    </div>
  );
}
