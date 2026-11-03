import { CalendarDays, UsersRound } from "lucide-react";
import { getMglClubOperatingYears, type MglClubMember } from "@mgl/types";
import styles from "./member-dialog.module.css";

export function MemberBusinessSummary({ member }: { member: MglClubMember }) {
  const years = getMglClubOperatingYears(member.foundedYear);
  if (years === null && !member.teamSize) return null;
  return (
    <dl className={styles.summary} aria-label="Бизнесийн товч мэдээлэл">
      {years !== null && (
        <div>
          <dt>
            <CalendarDays size={16} />
            Үйл ажиллагаа
          </dt>
          <dd>
            {years} <small>жил</small>
          </dd>
          <span>
            {years === 0
              ? `Энэ онд эхэлсэн · ${member.foundedYear}`
              : `${member.foundedYear} оноос ажиллаж байна`}
          </span>
        </div>
      )}
      {member.teamSize && (
        <div>
          <dt>
            <UsersRound size={16} />
            Багийн хэмжээ
          </dt>
          <dd>
            {member.teamSize} <small>ажилтан</small>
          </dd>
          <span>Бизнесийн хамт олон</span>
        </div>
      )}
    </dl>
  );
}
