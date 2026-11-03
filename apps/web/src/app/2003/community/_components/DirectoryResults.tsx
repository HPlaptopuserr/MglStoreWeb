import Link from "next/link";
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
        <div className={styles.empty}>Туршилтын мэдээллийг бэлдэж байна…</div>
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
              ? "Бүртгэл нээлттэй байна. Нийтлэх зөвшөөрөлтэй танилцуулгуудыг баталгаажуулсны дараа энд харуулна."
              : "Өөр үгээр хайх эсвэл шүүлтүүрээ цэвэрлээрэй."}
          </p>
          {!demo && total === 0 ? (
            <Link href="/2003/join" className={styles.primary}>
              Нэгдэх
            </Link>
          ) : (
            <button className={styles.primary} onClick={onClear}>
              Бүгдийг харах
            </button>
          )}
        </div>
      ) : (
        <div className={styles.sectorGroups}>
          {[...new Set(members.map((member) => member.sector))]
            .sort()
            .map((direction) => (
              <section key={direction} aria-label={direction}>
                <h2 className={styles.sectorHeading}>
                  {direction}
                  <span>
                    {
                      members.filter((member) => member.sector === direction)
                        .length
                    }{" "}
                    хүн
                  </span>
                </h2>
                <div className={styles.grid}>
                  {members
                    .filter((member) => member.sector === direction)
                    .map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        onOpen={onOpen}
                      />
                    ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </>
  );
}
