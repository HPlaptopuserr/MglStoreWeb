import { ExternalLink, Phone, UserRound } from "lucide-react";
import type { MglClubMember } from "@mgl/types";
import { memberDisplayName } from "./member-presentation";
import styles from "./member-dialog.module.css";

export function MemberContactDetails({ member }: { member: MglClubMember }) {
  return (
    <section className={styles.infoSection}>
      <h3>Холбоо барих хүн</h3>
      <div className={styles.contactCard}>
        <div className={styles.contactIdentity}>
          <span className={styles.factIcon}>
            <UserRound size={19} />
          </span>
          <div>
            <h4>{memberDisplayName(member.name)}</h4>
            <p>{member.role || "Бизнесийн төлөөлөгч"}</p>
          </div>
        </div>
        {!member.isDemo && (
          <a className={styles.contactLink} href={`tel:${member.phone}`}>
            <Phone size={16} />
            {member.phone}
          </a>
        )}
        {member.website && (
          <a
            className={styles.contactLink}
            href={member.website}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={16} />
            {member.isDemo ? "Жишээ цахим хуудас" : "Цахим хуудас үзэх"}
            <ExternalLink size={12} />
          </a>
        )}
        {member.isDemo && (
          <p className={styles.contactHint}>
            Энэ нь туршилтын танилцуулга тул бодит утасны дугаар оруулаагүй.
          </p>
        )}
      </div>
    </section>
  );
}
