import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Minimize,
  ListVideo,
} from "lucide-react";
import type { Ref } from "react";
import { clubPresentationPages } from "./club-presentation";
import styles from "./club-presentation.module.css";

interface PresentationControlsProps {
  page: number;
  expanded: boolean;
  contentsOpen: boolean;
  expandButtonRef: Ref<HTMLButtonElement>;
  onPrevious: () => void;
  onNext: () => void;
  onToggleExpanded: () => void;
  onToggleContents: () => void;
}

export function ClubPresentationControls({
  page,
  expanded,
  contentsOpen,
  expandButtonRef,
  onPrevious,
  onNext,
  onToggleExpanded,
  onToggleContents,
}: PresentationControlsProps) {
  return (
    <div className={styles.remoteArea}>
      <div
        className={styles.remote}
        role="group"
        aria-label="Танилцуулгын удирдлага"
      >
        <button
          type="button"
          className={styles.pageButton}
          onClick={onPrevious}
          disabled={page === 0}
          aria-label="Өмнөх хуудас"
        >
          <ChevronLeft size={21} aria-hidden="true" />
        </button>
        <span className={styles.counter} aria-live="polite" aria-atomic="true">
          <strong>{String(page + 1).padStart(2, "0")}</strong>
          <span>/</span>
          {clubPresentationPages.length}
        </span>
        <button
          type="button"
          className={styles.pageButton}
          onClick={onNext}
          disabled={page === clubPresentationPages.length - 1}
          aria-label="Дараах хуудас"
        >
          <ChevronRight size={21} aria-hidden="true" />
        </button>
        <span className={styles.remoteDivider} aria-hidden="true" />
        <button
          type="button"
          aria-label="Хуудасны жагсаалт"
          aria-expanded={contentsOpen && !expanded}
          aria-controls="club-slide-contents"
          onClick={onToggleContents}
          className={styles.listButton}
          disabled={expanded}
        >
          <ListVideo size={20} aria-hidden="true" />
        </button>
        <button
          ref={expandButtonRef}
          type="button"
          onClick={onToggleExpanded}
          aria-label={
            expanded ? "Бүтэн дэлгэцээс гарах" : "Бүтэн дэлгэцээр танилцуулах"
          }
          aria-pressed={expanded}
          className={styles.expandButton}
        >
          {expanded ? (
            <Minimize size={18} aria-hidden="true" />
          ) : (
            <Expand size={18} aria-hidden="true" />
          )}
          <span>{expanded ? "Гарах" : "Танилцуулах"}</span>
        </button>
      </div>
      <p className={styles.caption} aria-live="polite" aria-atomic="true">
        {clubPresentationPages[page]}
      </p>
    </div>
  );
}
