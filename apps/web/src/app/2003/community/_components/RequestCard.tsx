import type { HelpRequest, Member } from "../model";
import styles from "../community.module.css";
export function RequestCard({
  request,
  member,
  onOpen,
  onToggle,
}: {
  request: HelpRequest;
  member: Member;
  onOpen: (member: Member) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <article className={styles.card}>
      <div className={styles.requestTop}>
        <span>{request.category}</span>
        <span className={request.resolved ? styles.resolved : styles.open}>
          {request.resolved ? "Шийдэгдсэн" : "Нээлттэй"}
        </span>
      </div>
      <h2>{request.title}</h2>
      <p className={styles.requestDescription}>{request.description}</p>
      <button className={styles.author} onClick={() => onOpen(member)}>
        {member.name} · {member.city} ↗
      </button>
      <button
        className={styles.cardAction}
        onClick={() => onToggle(request.id)}
      >
        {request.resolved ? "Дахин нээх" : "Шийдэгдсэн болгох"}
        <span>Турших</span>
      </button>
    </article>
  );
}
