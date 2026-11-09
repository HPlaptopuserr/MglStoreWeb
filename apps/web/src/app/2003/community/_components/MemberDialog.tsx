"use client";
import { useLenis } from "@studio-freight/react-lenis";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { resolveApiAssetUrl } from "@/lib/api";
import { ArrowLeft, Phone, UserRound } from "lucide-react";
import { ACTIVITY_TYPES, type Member } from "../model";
import styles from "../community.module.css";
export function MemberDialog({
  member,
  onClose,
  demo = true,
}: {
  member: Member;
  demo?: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const lenis = useLenis();
  useLockBodyScroll();
  useEffect(() => {
    if (!lenis) return;
    const wasStopped = lenis.isStopped;
    lenis.stop();
    return () => {
      if (!wasStopped) lenis.start();
    };
  }, [lenis]);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement)
        previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-lenis-prevent="true"
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="member-title"
    >
      <header className={styles.dialogTopbar}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Танилцуулга хаах"
          className={styles.dialogBack}
        >
          <ArrowLeft size={22} aria-hidden="true" />
          <span>Буцах</span>
        </button>
        <span>2003 · Танилцуулга</span>
      </header>
      <div className={styles.dialogBody}>
        <div className={styles.detailIdentity}>
          <div className={styles.detailPortrait}>
            {member.photoUrl && !photoFailed ? (
              <Image
                src={resolveApiAssetUrl(member.photoUrl)}
                alt={`${member.name} — танилцуулгын зураг`}
                width={112}
                height={112}
                unoptimized
                onError={() => setPhotoFailed(true)}
                className={styles.detailPortraitImage}
              />
            ) : (
              <UserRound
                size={48}
                aria-label="Танилцуулгын зураг оруулаагүй"
                role="img"
              />
            )}
          </div>
          <div className={styles.detailIdentityText}>
            <p className={styles.eyebrow}>
              {demo ? "ТУРШИЛТЫН ТАНИЛЦУУЛГА" : "ГИШҮҮНИЙ ТАНИЛЦУУЛГА"}
            </p>
            <h2 id="member-title">{member.name}</h2>
            <p>
              {[member.organization, member.profession]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <section>
          <h3>
            {member.activity
              ? ACTIVITY_TYPES[member.activity].direction
              : "Үйл ажиллагааны чиглэл"}
          </h3>
          <ul className={styles.detailPills}>
            {[
              ...new Set(
                member.sector
                  .split(/[,;\n]+/)
                  .map((sector) => sector.trim())
                  .filter(Boolean),
              ),
            ].map((sector) => (
              <li key={sector}>{sector}</li>
            ))}
            {member.activity && (
              <li>{ACTIVITY_TYPES[member.activity].label}</li>
            )}
          </ul>
          {member.bio && <p className={styles.detailBio}>{member.bio}</p>}
        </section>
        <section>
          <h3>Юугаар тусалж чадах вэ?</h3>
          {member.offers.length > 0 ? (
            <ul className={styles.detailPills}>
              {member.offers.map((offer) => (
                <li key={offer}>{offer}</li>
              ))}
            </ul>
          ) : (
            <p>Одоогоор мэдээлэл оруулаагүй.</p>
          )}
        </section>
        <section>
          <h3>Ямар дэмжлэг хэрэгтэй вэ?</h3>
          {member.needs.length > 0 ? (
            <ul className={styles.detailPills}>
              {member.needs.map((need) => (
                <li key={need}>{need}</li>
              ))}
            </ul>
          ) : (
            <p>Одоогоор хүсэлт оруулаагүй.</p>
          )}
        </section>
        <section>
          {member.phone && (
            <>
              <h3>Холбоо барих</h3>
              <a
                className={styles.phoneLink}
                href={`tel:${member.phone}`}
                aria-label={`${member.name} руу залгах: ${member.phone}`}
              >
                <Phone size={16} aria-hidden="true" />
                {member.phone}
              </a>
            </>
          )}
          <dl className={styles.detailFacts}>
            <div>
              <dt>Мэргэжил</dt>
              <dd>{member.profession}</dd>
            </div>
            {member.role && (
              <div>
                <dt>
                  {member.activity
                    ? ACTIVITY_TYPES[member.activity].role
                    : "Албан тушаал"}
                </dt>
                <dd>{member.role}</dd>
              </div>
            )}
            {member.organization && (
              <div>
                <dt>
                  {member.activity
                    ? ACTIVITY_TYPES[member.activity].organization
                    : "Байгууллага"}
                </dt>
                <dd>{member.organization}</dd>
              </div>
            )}
            {member.city && (
              <div>
                <dt>Байршил</dt>
                <dd>{member.city}</dd>
              </div>
            )}
          </dl>
        </section>
        {demo && (
          <div className={styles.notice}>
            Энэ бол зохиомол хүний жишээ. Бодит холбоо барих мэдээлэл байхгүй.
          </div>
        )}
      </div>
    </dialog>
  );
}
