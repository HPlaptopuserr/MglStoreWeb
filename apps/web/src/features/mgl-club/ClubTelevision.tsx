"use client";

import Image from "next/image";
import { useState } from "react";
import { ExternalLink, ImageOff, RotateCcw } from "lucide-react";
import {
  CLUB_PRESENTATION_PDF,
  clubPresentationPages,
} from "./club-presentation";
import styles from "./club-presentation.module.css";

function TelevisionScreen({ page }: { page: number }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const title = clubPresentationPages[page];
  return (
    <div className={styles.screen} aria-busy={!loaded && !failed}>
      {!loaded && !failed && (
        <div className={styles.loading} role="status">
          <span />
          Танилцуулгыг ачаалж байна…
        </div>
      )}
      {failed ? (
        <div className={styles.failure} role="alert">
          <ImageOff size={30} aria-hidden="true" />
          <p>Хуудсыг ачаалж чадсангүй.</p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Дахин ачаалах
          </button>
          <a
            href={`${CLUB_PRESENTATION_PDF}#page=${page + 1}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Эх PDF-ийг нээх
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
      ) : (
        <Image
          key={attempt}
          className={loaded ? styles.screenImage : styles.imagePending}
          src={`/mgl-club/slides/page-${String(page + 1).padStart(2, "0")}.webp${attempt ? `?retry=${attempt}` : ""}`}
          alt={`${page + 1}-р хуудас: ${title}`}
          width={2400}
          height={1351}
          unoptimized
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function ClubTelevision({ page }: { page: number }) {
  return (
    <div className={styles.tvScene}>
      <div className={styles.television}>
        <TelevisionScreen key={page} page={page} />
        <div className={styles.chin} aria-hidden="true">
          <span>
            MGL <b>CLUB</b>
          </span>
          <i />
        </div>
      </div>
      <div className={styles.tvStand} aria-hidden="true">
        <i />
        <i />
      </div>
    </div>
  );
}
