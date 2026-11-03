import { Handshake, PackageCheck } from "lucide-react";
import type { MglClubMember } from "@mgl/types";
import { memberServiceTags } from "./member-presentation";
import styles from "./member-dialog.module.css";

export function MemberServices({ member }: { member: MglClubMember }) {
  const tags = memberServiceTags(member.offers);
  return (
    <>
      <section className={styles.serviceCard}>
        <h3>
          <PackageCheck size={19} />
          Санал болгох үйлчилгээ
        </h3>
        <p>{member.offers}</p>
        {tags.length > 1 && (
          <div className={styles.serviceTags}>
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </section>
      <section className={styles.needCard}>
        <h3>
          <Handshake size={19} />
          Хайж буй хамтрагч
        </h3>
        <p>
          {member.needs || "Одоогоор худалдан авах хэрэгцээ оруулаагүй байна."}
        </p>
      </section>
      <details className={styles.aboutBusiness}>
        <summary>Бизнесийн тухай дэлгэрэнгүй</summary>
        <p>{member.description}</p>
      </details>
    </>
  );
}
