import { MGL_CLUB_LOCATIONS, type MglClubMember } from "@mgl/types";
import { MemberCard } from "./MemberCard";
import styles from "./club-design.module.css";
const locationOrder = new Map<string, number>(
  MGL_CLUB_LOCATIONS.map((location, index) => [location, index]),
);
export function MemberGrid({
  members,
  onOpen,
}: {
  members: MglClubMember[];
  onOpen: (member: MglClubMember) => void;
}) {
  const sorted = [...members].sort(
    (left, right) =>
      (locationOrder.get(left.city) ?? 99) -
      (locationOrder.get(right.city) ?? 99),
  );
  return (
    <div className={styles.grid}>
      {sorted.map((member) => (
        <MemberCard key={member.id} member={member} onOpen={onOpen} />
      ))}
    </div>
  );
}
