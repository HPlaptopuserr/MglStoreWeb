"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  MapPin,
  Phone,
  X,
  BriefcaseBusiness,
  Info,
  ArrowRight,
} from "lucide-react";
import type { MglClubMember } from "@mgl/types";
import { memberDisplayName } from "./member-presentation";
import { MemberBusinessFacts } from "./MemberBusinessFacts";
import { MemberBusinessSummary } from "./MemberBusinessSummary";
import { MemberContactDetails } from "./MemberContactDetails";
import { MemberServices } from "./MemberServices";
import styles from "./member-dialog.module.css";

const views = [
  { id: "overview", label: "Танилцуулга" },
  { id: "contact", label: "Байршил, холбоо" },
] as const;
export type MemberView = (typeof views)[number]["id"];
export function MemberDialog({
  member,
  onClose,
  initialView = "overview",
}: {
  member: MglClubMember;
  onClose: () => void;
  initialView?: MemberView;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();
  const [view, setView] = useState<MemberView>(initialView);
  const name = memberDisplayName(member.name);
  const business = memberDisplayName(member.businessName);
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
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [view]);
  function navigateTabs(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? views.length - 1
          : event.key === "ArrowRight"
            ? (index + 1) % views.length
            : event.key === "ArrowLeft"
              ? (index + views.length - 1) % views.length
              : null;
    if (next === null) return;
    event.preventDefault();
    setView(views[next].id);
    tabRefs.current[next]?.focus();
  }
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-subtitle`}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <div className={styles.frame}>
        <header className={styles.header}>
          <span className={styles.mobileHandle} aria-hidden="true" />
          <button
            type="button"
            autoFocus
            className={styles.close}
            onClick={onClose}
            aria-label="Танилцуулга хаах"
          >
            <X size={20} />
          </button>
          <div className={styles.identityRow}>
            <div className={styles.monogram} aria-hidden="true">
              {Array.from(business)[0]}
            </div>
            <div className={styles.identity}>
              <p className={styles.profileLabel}>
                MGL CLUB · БИЗНЕСИЙН ТАНИЛЦУУЛГА
              </p>
              <h2 id={`${id}-title`}>{business}</h2>
              <p id={`${id}-subtitle`}>{name}</p>
            </div>
          </div>
          <div className={styles.badges}>
            <span>
              <MapPin size={13} />
              {member.city}
            </span>
            <span>
              <BriefcaseBusiness size={13} />
              {member.sector}
            </span>
          </div>
        </header>
        <div
          className={styles.switcher}
          role="tablist"
          aria-label="Гишүүний мэдээлэл"
        >
          {views.map((item, index) => (
            <button
              key={item.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`${id}-tab-${item.id}`}
              role="tab"
              aria-selected={view === item.id}
              aria-controls={`${id}-panel-${item.id}`}
              tabIndex={view === item.id ? 0 : -1}
              onClick={() => setView(item.id)}
              onKeyDown={(event) => navigateTabs(event, index)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className={styles.body} ref={bodyRef}>
          {views.map((item) => (
            <div
              key={item.id}
              id={`${id}-panel-${item.id}`}
              role="tabpanel"
              aria-labelledby={`${id}-tab-${item.id}`}
              tabIndex={0}
              hidden={view !== item.id}
              className={styles.panel}
            >
              {item.id === "overview" ? (
                <>
                  <MemberBusinessSummary member={member} />
                  <MemberServices member={member} />
                </>
              ) : (
                <>
                  <MemberBusinessFacts member={member} />
                  <MemberContactDetails member={member} />
                </>
              )}
            </div>
          ))}
        </div>
        <footer className={styles.footer}>
          {member.isDemo && (
            <p className={styles.demoNote}>
              <Info size={14} />
              <span>Туршилтын гишүүн · Бодит холбоо барих мэдээлэлгүй</span>
            </p>
          )}
          <div className={styles.footerActions}>
            <button onClick={onClose}>Хаах</button>
            {view === "overview" ? (
              <button
                className={styles.primaryAction}
                onClick={() => {
                  setView("contact");
                  tabRefs.current[1]?.focus();
                }}
              >
                Холбоо барих <ArrowRight size={16} />
              </button>
            ) : (
              !member.isDemo && (
                <a
                  className={styles.primaryAction}
                  href={`tel:${member.phone}`}
                >
                  <Phone size={16} />
                  Шууд залгах
                </a>
              )
            )}
          </div>
        </footer>
      </div>
    </dialog>
  );
}
