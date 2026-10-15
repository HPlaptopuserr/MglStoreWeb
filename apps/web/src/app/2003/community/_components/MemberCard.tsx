import { ArrowUpRight, MapPin } from "lucide-react";
import { ACTIVITY_TYPES, type Member } from "../model";
import styles from "../community.module.css";
export function MemberCard({
  member,
  onOpen,
}: {
  member: Member;
  onOpen: (member: Member) => void;
}) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.avatar} aria-hidden="true">
          {member.name.split(" ").at(-1)?.slice(0, 1)}
        </span>
        <div>
          <h2>{member.name}</h2>
          <p>
            <MapPin size={13} aria-hidden="true" />
            {member.city}
          </p>
        </div>
      </div>
      <div className={styles.activityBadge}>
        {member.activity
          ? ACTIVITY_TYPES[member.activity].label
          : "Төлөв тодорхойлоогүй"}{" "}
        · {member.sector}
      </div>
      <div className={styles.work}>
        <span className={styles.fieldCaption}>
          {member.activity
            ? ACTIVITY_TYPES[member.activity].role
            : "Одоо хийж буй ажил"}
        </span>
        <strong>{member.role}</strong>
        <p>
          {member.organization} · {member.sector}
        </p>
      </div>
      <div className={styles.offer}>
        <span>ТУСАЛЖ ЧАДНА</span>
        <div className={styles.tags}>
          {member.offers.map((offer) => (
            <span key={offer}>{offer}</span>
          ))}
        </div>
      </div>
      <p className={styles.need}>
        <span>Хайж байна</span>{" "}
        {member.needs.join(", ") || "Одоогоор хүсэлтгүй"}
      </p>
      <button className={styles.cardAction} onClick={() => onOpen(member)}>
        Танилцуулга үзэх <ArrowUpRight size={17} />
      </button>
    </article>
  );
}
