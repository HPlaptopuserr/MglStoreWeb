"use client";

import { useState } from "react";
import { Monitor, ChevronDown } from "lucide-react";
import { ClubTelevision } from "./ClubTelevision";
import { ClubPresentationControls } from "./ClubPresentationControls";
import { useClubPresentation } from "./useClubPresentation";
import { clubPresentationPages } from "./club-presentation";
import styles from "./club-presentation.module.css";

export function ClubPresentationViewer() {
  const {
    page,
    expanded,
    viewerRef,
    expandButtonRef,
    selectPage,
    next,
    previous,
    toggleExpanded,
  } = useClubPresentation();
  const [contentsOpen, setContentsOpen] = useState(false);

  return (
    <div
      ref={viewerRef}
      className={`${styles.viewer} ${expanded ? styles.expanded : ""}`}
      role={expanded ? "dialog" : "region"}
      aria-modal={expanded || undefined}
      aria-label="MGL CLUB зурагт танилцуулга"
    >
      <div className={styles.viewerHeader}>
        <div className={styles.channel}>
          <span>
            <Monitor size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>MGL CLUB</strong>
            <small>БИЗНЕСИЙН ХАМТЫН БОЛОМЖ</small>
          </div>
        </div>
        <div className={styles.pageSelector}>
          <label htmlFor="club-slide">Хуудас сонгох</label>
          <select
            id="club-slide"
            value={page}
            onChange={(event) => selectPage(Number(event.target.value))}
          >
            {clubPresentationPages.map((title, index) => (
              <option key={title} value={index}>
                {String(index + 1).padStart(2, "0")}. {title}
              </option>
            ))}
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </div>
      </div>
      <ClubTelevision page={page} />
      <ClubPresentationControls
        page={page}
        expanded={expanded}
        contentsOpen={contentsOpen}
        expandButtonRef={expandButtonRef}
        onPrevious={previous}
        onNext={next}
        onToggleExpanded={toggleExpanded}
        onToggleContents={() => setContentsOpen((value) => !value)}
      />
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label="Танилцуулгын явц"
        aria-valuemin={1}
        aria-valuemax={clubPresentationPages.length}
        aria-valuenow={page + 1}
      >
        <span
          style={{
            width: `${((page + 1) / clubPresentationPages.length) * 100}%`,
          }}
        />
      </div>
      <div
        id="club-slide-contents"
        className={styles.contents}
        hidden={!contentsOpen || expanded}
      >
        <p>
          ТАНИЛЦУУЛГЫН АГУУЛГА{" "}
          <span>{clubPresentationPages.length} хуудас</span>
        </p>
        <ol>
          {clubPresentationPages.map((title, index) => (
            <li key={title}>
              <button
                type="button"
                aria-current={page === index ? "page" : undefined}
                onClick={() => selectPage(index)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {title}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <p className={styles.keyboardHint}>
        {expanded
          ? "← → Хуудас солих · Esc Гарах"
          : "Танилцуулах горимд ← → товчоор хуудас солино"}
      </p>
    </div>
  );
}
