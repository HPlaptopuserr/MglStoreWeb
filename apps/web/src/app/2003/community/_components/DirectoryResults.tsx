import { CommunityJoinLink } from "@/features/community-2003/CommunityMembership";
import { Search } from "lucide-react";
import { MemberCard } from "./MemberCard";
import type { Member } from "../model";
import styles from "../community.module.css";
interface DirectoryResultsProps {
  members: Member[];
  total: number;
  ready: boolean;
  demo: boolean;
  onClear: () => void;
  onOpen: (member: Member) => void;
}
export function DirectoryResults({
  members,
  total,
  ready,
  demo,
  onClear,
  onOpen,
}: DirectoryResultsProps) {
  const count = members.length;
  return (
    <>
      {" "}
      <div className={styles.results}>
        <p role="status">
          {ready ? `${count} хүн олдлоо` : "Жагсаалтыг ачаалж байна…"}
        </p>
        <button onClick={onClear}>Шүүлтүүр цэвэрлэх</button>
      </div>
      {!ready ? (
        <div className={styles.empty}>Танилцуулгуудыг ачаалж байна…</div>
      ) : count === 0 ? (
        <div className={styles.empty}>
          <Search size={30} />
          <h2>
            {!demo && total === 0
              ? "Танилцуулгууд удахгүй нэмэгдэнэ"
              : "Тохирох мэдээлэл олдсонгүй"}
          </h2>
          <p>
            {!demo && total === 0
              ? "Бүртгэл нээлттэй байна. Нийтлэх зөвшөөрөлтэй танилцуулгууд энд харагдана."
              : "Өөр үгээр хайх эсвэл шүүлтүүрээ цэвэрлээрэй."}
          </p>
          {!demo && total === 0 ? (
            <CommunityJoinLink className={styles.primary}>
              Нэгдэх
            </CommunityJoinLink>
          ) : (
            <button className={styles.primary} onClick={onClear}>
              Бүгдийг харах
            </button>
          )}
        </div>
      ) : (
        <ul className={styles.memberList} aria-label="Гишүүдийн жагсаалт">
          {members.map((member) => (
            <li key={member.id}>
              <MemberCard member={member} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
