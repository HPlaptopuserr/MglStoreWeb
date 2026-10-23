import Link from "next/link";
import { Network } from "lucide-react";
import styles from "./club-design.module.css";
export function ClubBrand({ subtitle = false }: { subtitle?: boolean }) {
  return (
    <Link href="/mgl-club" className={styles.brand}>
      <span className={styles.brandIcon}>
        <Network size={subtitle ? 24 : 20} />
      </span>
      <span>
        MGL CLUB
        {subtitle && (
          <>
            <small className={styles.desktopSubtitle}>
              БИЗНЕСИЙН ХАМТЫН НИЙГЭМЛЭГ
            </small>
            <small className={styles.mobileOnly}>B2B СҮЛЖЭЭ</small>
          </>
        )}
      </span>
    </Link>
  );
}
