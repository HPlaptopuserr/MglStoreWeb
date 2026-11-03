import {
  ArrowUpRight,
  BriefcaseBusiness,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import type { MglClubMember } from "@mgl/types";
import type { MemberView } from "./MemberDialog";
import { memberDisplayName } from "./member-presentation";
import styles from "./needs.module.css";
export function NeedCard({
  member,
  onOpen,
}: {
  member: MglClubMember;
  onOpen: (member: MglClubMember, view: MemberView) => void;
}) {
  const business = memberDisplayName(member.businessName);
  return (
    <article className={styles.card}>
      <div className={styles.cardContent}>
        <div className={styles.cardTop}>
          <span className={styles.location}>
            <MapPin size={12} />
            {member.city}
          </span>
          <span className={member.isDemo ? styles.demo : styles.status}>
            {member.isDemo ? "Туршилтын хэрэгцээ" : "Хамтрагч хайж байна"}
          </span>
        </div>
        <p className={styles.cardEyebrow}>БИДЭНД ХЭРЭГТЭЙ</p>
        <h3>{member.needs}</h3>
        <div className={styles.requester}>
          <span className={styles.avatar} aria-hidden="true">
            {Array.from(business)[0]}
          </span>
          <div>
            <h4>{business}</h4>
            <p>
              <UserRound size={12} />
              {memberDisplayName(member.name)}
            </p>
          </div>
        </div>
        <p className={styles.sector}>
          <BriefcaseBusiness size={13} />
          <span>
            Захиалагчийн салбар: <b>{member.sector}</b>
          </span>
        </p>
      </div>
      <footer className={styles.cardFooter}>
        <button
          aria-haspopup="dialog"
          aria-label={`${business}: бизнесийн танилцуулга`}
          onClick={(event) => {
            event.currentTarget.focus();
            onOpen(member, "overview");
          }}
        >
          Бизнесийг харах
          <ArrowUpRight size={14} />
        </button>
        <button
          aria-haspopup="dialog"
          aria-label={`${business}: холбоо барих`}
          onClick={(event) => {
            event.currentTarget.focus();
            onOpen(member, "contact");
          }}
        >
          <Phone size={14} />
          Холбогдох
        </button>
      </footer>
    </article>
  );
}
