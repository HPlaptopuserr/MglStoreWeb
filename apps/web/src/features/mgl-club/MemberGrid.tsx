import { MGL_CLUB_LOCATIONS, type MglClubMember } from "@mgl/types";
import { MemberCard } from "./MemberCard";
import styles from "./member-list.module.css";
const locationOrder = new Map<string, number>(
  MGL_CLUB_LOCATIONS.map((location, index) => [location, index]),
);
export function MemberGrid({ members }: { members: MglClubMember[] }) {
  const sorted = [...members].sort(
    (left, right) =>
      (locationOrder.get(left.city) ?? 99) -
      (locationOrder.get(right.city) ?? 99),
  );
  return (
    <div className={styles.list}>
      {sorted.map((member) => (
        <MemberCard key={member.id} member={member} />
      ))}
    </div>
  );
}
