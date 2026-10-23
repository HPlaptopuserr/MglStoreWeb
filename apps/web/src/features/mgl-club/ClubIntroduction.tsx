import { Download, FileText } from "lucide-react";
import { ClubPresentationViewer } from "./ClubPresentationViewer";
import {
  CLUB_PRESENTATION_PDF,
  clubPresentationPages,
} from "./club-presentation";
import styles from "./club-presentation.module.css";

export function ClubIntroduction() {
  return (
    <section
      id="introduction"
      aria-labelledby="introduction-title"
      className={styles.section}
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            <FileText size={15} aria-hidden="true" /> MGL CLUB · ТАНИЛЦУУЛГА
          </p>
          <h2 id="introduction-title">Мөнгөө Монголдоо үлдээе.</h2>
          <p>
            Клубийн зорилго, гишүүнчлэл, уулзалтын хөтөлбөр, ёс зүй болон
            хамтран ажиллах бизнес, төслүүдтэй бүрэн танилцаарай.
          </p>
        </div>
        <a href={CLUB_PRESENTATION_PDF} download className={styles.download}>
          <Download size={18} aria-hidden="true" /> PDF татах ·{" "}
          {clubPresentationPages.length} хуудас
        </a>
      </div>
      <ClubPresentationViewer />
      <p className={styles.sourceNote}>
        Эх танилцуулгын бүх 25 хуудсыг дарааллаар нь оруулав. Тоо баримт,
        төлөвлөгөө, хөрөнгө оруулалтын нөхцөл нь танилцуулгад дурдсан мэдээлэл
        болно.
      </p>
    </section>
  );
}
