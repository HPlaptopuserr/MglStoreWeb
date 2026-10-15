"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ACTIVITY_TYPES, type Member } from "../model";
import styles from "../community.module.css";
export function MemberDialog({
  member,
  onClose,
}: {
  member: Member;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="member-title"
    >
      <div className={styles.dialogBody}>
        <button
          className={styles.close}
          onClick={onClose}
          aria-label="Танилцуулга хаах"
        >
          <X />
        </button>
        <p className={styles.eyebrow}>ТУРШИЛТЫН ТАНИЛЦУУЛГА</p>
        <h2 id="member-title">{member.name}</h2>
        <p>
          {member.city} · {member.sector}
        </p>
        <section>
          <h3>
            {member.activity
              ? ACTIVITY_TYPES[member.activity].label
              : "Одоо юу хийж байна?"}
          </h3>
          <p>
            {member.activity
              ? ACTIVITY_TYPES[member.activity].direction
              : "Чиглэл"}
            : {member.sector}
          </p>
          <strong>
            {member.role} · {member.organization}
          </strong>
          <p>Мэргэжил: {member.profession}</p>
          <p>{member.bio}</p>
        </section>
        <section>
          <h3>Юугаар тусалж чадах вэ?</h3>
          <ul>
            {member.offers.map((offer) => (
              <li key={offer}>{offer}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Ямар дэмжлэг хэрэгтэй вэ?</h3>
          <ul>
            {member.needs.map((need) => (
              <li key={need}>{need}</li>
            ))}
          </ul>
          {!member.needs.length && <p>Одоогоор хүсэлт оруулаагүй.</p>}
        </section>
        <div className={styles.notice}>
          Энэ бол зохиомол хүний жишээ. Бодит холбоо барих мэдээлэл байхгүй.
          Үндсэн хувилбарт зөвшөөрсөн холбоо барих сувгийг зөвхөн баталгаажсан
          гишүүдэд харуулна.
        </div>
      </div>
    </dialog>
  );
}
