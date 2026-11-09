"use client";
import { useCommunityMembership } from "@/features/community-2003/CommunityMembership";
import { useState } from "react";
import Link from "next/link";
import { DemoMemberForm } from "../community/_components/DemoMemberForm";
import { useDemoDirectory } from "../community/useDemoDirectory";
import styles from "../community/community.module.css";
export function JoinDemo({ editId }: { editId?: string }) {
  const { addMember, ready, error, data, removeMember } = useDemoDirectory();
  const { memberIds, markJoined, clearMembership, checking } =
    useCommunityMembership();
  const [version, setVersion] = useState(0);
  const ownMember = data.members.find(
    (member) => member.id === editId && memberIds?.includes(member.id),
  );
  if (ready && !checking && editId && !ownMember)
    return (
      <section className="p-8">
        <p>Танилцуулга олдсонгүй.</p>
        <Link href="/2003/mine">Миний жагсаалт руу буцах</Link>
      </section>
    );
  return (
    <div className={styles.page}>
      <div className={styles.demoBanner}>
        LOCAL DEMO · Зөвхөн зохиомол мэдээлэл оруулна уу.
      </div>
      <div className={styles.main}>
        {error && (
          <p role="alert" className={styles.notice}>
            {error}
          </p>
        )}
        {ready && !checking ? (
          <DemoMemberForm
            key={version}
            initialMember={ownMember}
            onRemove={
              ownMember
                ? () => {
                    removeMember(ownMember.id);
                    clearMembership(ownMember.id);
                    setVersion((value) => value + 1);
                  }
                : undefined
            }
            onAdd={(member) => {
              addMember(member);
              markJoined(member.id);
            }}
          />
        ) : (
          <p role="status">Бүртгэлийг бэлдэж байна…</p>
        )}
        <Link href="/2003" className={styles.primary}>
          Гишүүдийн жагсаалт руу →
        </Link>
      </div>
    </div>
  );
}
