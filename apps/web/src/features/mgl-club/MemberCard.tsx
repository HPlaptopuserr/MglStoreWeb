import Link from "next/link";
import { ArrowUpRight, MapPin, Phone } from "lucide-react";
import type { MglClubMember } from "@mgl/types";
import { CompanyLogo } from "./CompanyLogo";
import { memberDisplayName } from "./member-presentation";
import styles from "./member-list.module.css";

export function MemberCard({ member }: { member: MglClubMember }) {
  const business = memberDisplayName(member.businessName);
  return (
    <article className={styles.row}>
      <Link
        className={styles.open}
        href={`/mgl-club/companies/${member.id}`}
        aria-label={`${business}: байгууллагын танилцуулга`}
      >
        <span className={styles.logo}>
          <CompanyLogo name={business} url={member.logoUrl} />
        </span>
        <span className={styles.body}>
          <strong className={styles.title}>{business}</strong>
          <span className={styles.sector}>{member.sector}</span>
          <span className={styles.offers}>{member.offers}</span>
          {member.isDemo && (
            <span className={styles.demo}>Туршилтын байгууллага</span>
          )}
        </span>
        <span className={styles.side}>
          <ArrowUpRight size={22} aria-hidden="true" />
          <span>
            <MapPin size={13} aria-hidden="true" />
            {member.city}
          </span>
          <span className={styles.action}>Дэлгэрэнгүй үзэх</span>
        </span>
      </Link>
      {!member.isDemo && member.phone && (
        <a
          className={styles.phone}
          href={`tel:${member.phone}`}
          aria-label={`${business}: ${member.phone} дугаарт залгах`}
        >
          <Phone size={14} />
          {member.phone}
        </a>
      )}
    </article>
  );
}
