import { ChevronRight, Phone } from "lucide-react";
import Image from "next/image";
import { resolveApiAssetUrl } from "@/lib/api";
import { ACTIVITY_TYPES, type Member } from "../model";
import styles from "../community.module.css";
export function MemberCard({
  member,
  onOpen,
}: {
  member: Member;
  onOpen: (member: Member) => void;
}) {
  const title =
    member.offers.filter((offer) => offer.trim()).join(", ") ||
    member.role ||
    member.profession ||
    member.sector;
  const description = [
    ...new Set(
      [member.organization, member.role || member.profession].filter(Boolean),
    ),
  ].join(" · ");
  const activity = member.activity
    ? ACTIVITY_TYPES[member.activity].label
    : member.sector;
  return (
    <article className={styles.memberRow}>
      <span className={styles.rowAvatar} aria-hidden="true">
        {member.photoUrl ? (
          <Image
            src={resolveApiAssetUrl(member.photoUrl)}
            alt=""
            width={64}
            height={64}
            unoptimized
            className={styles.rowPhoto}
          />
        ) : (
          member.name.split(" ").at(-1)?.slice(0, 1)
        )}
      </span>
      <div className={styles.rowContent}>
        <h2 className={styles.rowName}>
          <button
            type="button"
            className={styles.rowOpen}
            onClick={() => onOpen(member)}
            aria-haspopup="dialog"
            aria-label={`${title} — ${member.name}, танилцуулга үзэх`}
          >
            <span>{title}</span>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </h2>
        <p className={styles.rowPerson}>{member.name}</p>
        {description && <p className={styles.rowDescription}>{description}</p>}
        <div className={styles.rowBottom}>
          {member.phone ? (
            <a
              className={styles.rowPhone}
              href={`tel:${member.phone}`}
              aria-label={`${member.name} руу залгах: ${member.phone}`}
            >
              <Phone size={14} aria-hidden="true" />
              {member.phone}
            </a>
          ) : (
            <span className={styles.rowProfession}>{member.profession}</span>
          )}
          <p className={styles.rowMeta}>
            {member.city && <span>{member.city}</span>}
            <span>{activity}</span>
          </p>
        </div>
      </div>
    </article>
  );
}
