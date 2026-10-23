import type { MouseEvent } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  MapPin,
  Phone,
  CalendarDays,
  UsersRound,
  Building2,
  UserRound,
} from "lucide-react";
import { getMglClubOperatingYears, type MglClubMember } from "@mgl/types";
import { memberDisplayName, memberServiceTags } from "./member-presentation";
import styles from "./club-design.module.css";
export function MemberCard({
  member,
  onOpen,
}: {
  member: MglClubMember;
  onOpen: (member: MglClubMember) => void;
}) {
  const name = memberDisplayName(member.name);
  const business = memberDisplayName(member.businessName);
  const years = getMglClubOperatingYears(member.foundedYear);
  const tags = memberServiceTags(member.offers);
  const open = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.focus();
    onOpen(member);
  };
  return (
    <article className={styles.memberCard}>
      <div className={styles.memberBody}>
        <div className={styles.cardBadges}>
          <span>
            <MapPin size={12} />
            {member.city}
          </span>
          <span className={member.isDemo ? styles.demoBadge : styles.clubBadge}>
            {member.isDemo ? "Туршилтын гишүүн" : "MGL CLUB"}
          </span>
        </div>
        <div className={styles.memberIdentity}>
          <div className={styles.monogram} aria-hidden="true">
            {Array.from(business)[0]}
          </div>
          <div>
            <h3 title={name}>{name}</h3>
            <p>{business}</p>
            <span className={styles.memberSector}>
              <BriefcaseBusiness size={13} />
              {member.sector}
            </span>
          </div>
        </div>
        <div className={styles.memberMetrics}>
          <span>
            <CalendarDays size={14} />
            {years === null
              ? "Эхэлсэн он оруулаагүй"
              : `${years === 0 ? "Энэ онд эхэлсэн" : `${years} жил үйл ажиллагаа`} (${member.foundedYear})`}
          </span>
          {member.teamSize && (
            <span>
              <UsersRound size={13} />
              {member.teamSize}
              <span className={styles.srOnly}> ажилтан</span>
            </span>
          )}
        </div>
        <div className={styles.mobileOffice}>
          {member.address && (
            <p>
              <Building2 size={15} />
              <span>
                <b>Оффис:</b> {member.address}
              </span>
            </p>
          )}
          <p>
            <UserRound size={15} />
            <span>
              <b>Хариуцсан:</b> {name}
              {member.role ? ` · ${member.role}` : ""}
            </span>
          </p>
        </div>
        <div className={styles.offers}>
          <span>САНАЛ БОЛГОХ ҮЙЛЧИЛГЭЭ</span>
          <p>{member.offers}</p>
          <div className={styles.tags}>
            {tags.slice(0, 2).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
            {tags.length > 2 && <span>+{tags.length - 2}</span>}
          </div>
        </div>
        <div className={styles.partnerNeed}>
          <span>ХАЙЖ БУЙ ТҮНШ:</span>
          <p>{member.needs || "Хамтын ажиллагаанд нээлттэй."}</p>
        </div>
      </div>
      <div className={styles.cardActions}>
        <button
          onClick={open}
          aria-haspopup="dialog"
          aria-label={`${name}: дэлгэрэнгүй танилцуулга`}
        >
          Танилцуулга үзэх <ArrowUpRight size={14} />
        </button>
        {member.isDemo ? (
          <button
            onClick={open}
            aria-haspopup="dialog"
            aria-label={`${name}: холбоо барих мэдээлэл`}
          >
            Холбогдох
          </button>
        ) : (
          <a
            href={`tel:${member.phone}`}
            aria-label={`${name}: ${member.phone} дугаарт залгах`}
          >
            <Phone size={13} />
            Холбогдох
          </a>
        )}
      </div>
    </article>
  );
}
