"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Monitor, Smartphone } from "lucide-react";
import type { ClubWebsite, MglClubMember } from "@mgl/types";
import { CompanyWebsite } from "./CompanyWebsite";
import styles from "./site-builder.module.css";

const frameDocument =
  '<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="company-preview-root"></div></body></html>';

function scrollFrameToSection(frame: HTMLIFrameElement | null, id: string) {
  const section = frame?.contentDocument?.getElementById(id);
  const previewWindow = frame?.contentWindow;
  if (!section || !previewWindow) return;
  const margin =
    Number.parseFloat(
      previewWindow.getComputedStyle(section).scrollMarginTop,
    ) || 0;
  previewWindow.scrollTo({
    top: section.getBoundingClientRect().top + previewWindow.scrollY - margin,
    behavior: "auto",
  });
}

export function CompanySiteLivePreview({
  member,
  site,
  selected,
  revealSelected,
}: {
  member: MglClubMember;
  site: ClubWebsite;
  selected: string;
  revealSelected: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [available, setAvailable] = useState({ width: 600, height: 520 });
  const width = device === "desktop" ? 1280 : 390;
  const scale = Math.min(1, available.width / width);
  const height = Math.max(1, available.height / scale);
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setAvailable({
        width: Math.max(1, entry.contentRect.width),
        height: Math.max(1, entry.contentRect.height),
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!document) return;
    const owner = frame.current?.ownerDocument;
    if (!owner) return;
    function copyStyles() {
      document!.head
        .querySelectorAll("[data-preview-style]")
        .forEach((node) => node.remove());
      owner!
        .querySelectorAll('link[rel="stylesheet"], style')
        .forEach((source) => {
          const clone = source.cloneNode(true) as HTMLElement;
          clone.setAttribute("data-preview-style", "true");
          if (
            source instanceof HTMLLinkElement &&
            clone instanceof HTMLLinkElement
          )
            clone.href = source.href;
          document!.head.appendChild(clone);
        });
      const highlight = document!.createElement("style");
      highlight.setAttribute("data-preview-style", "true");
      highlight.textContent =
        'html{scroll-behavior:auto!important}body{margin:0}[data-editor-selected="true"]{outline:3px solid #76b692;outline-offset:-3px}';
      document!.head.appendChild(highlight);
    }
    copyStyles();
    const observer = new MutationObserver(copyStyles);
    observer.observe(owner.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    function followPreviewLink(event: Event) {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      event.preventDefault();
      event.stopPropagation();
      const href = anchor.getAttribute("href") || "";
      if (href.startsWith("#"))
        scrollFrameToSection(frame.current, href.slice(1));
    }
    document.addEventListener("click", followPreviewLink, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", followPreviewLink, true);
    };
  }, [document]);
  useEffect(() => {
    if (!document) return;
    document
      .querySelectorAll("[data-editor-selected]")
      .forEach((node) => node.removeAttribute("data-editor-selected"));
    const section = document.getElementById(`company-section-${selected}`);
    section?.setAttribute("data-editor-selected", "true");
    scrollFrameToSection(frame.current, `company-section-${selected}`);
  }, [document, selected, revealSelected, height, width]);
  const mount = document?.getElementById("company-preview-root");
  return (
    <aside
      className={styles.livePreview}
      aria-label="Танилцуулгын шууд харагдац"
    >
      <div className={styles.previewToolbar}>
        <div>
          <strong>Шууд харагдац</strong>
          <span>Бичих бүрд шинэчлэгдэнэ · нийтлэгдээгүй ноорог</span>
        </div>
        <div className={styles.previewDevices} aria-label="Дэлгэцийн хэмжээ">
          <button
            type="button"
            aria-pressed={device === "desktop"}
            aria-label="Компьютерийн харагдац"
            onClick={() => setDevice("desktop")}
          >
            <Monitor size={17} />
          </button>
          <button
            type="button"
            aria-pressed={device === "phone"}
            aria-label="Утасны харагдац"
            onClick={() => setDevice("phone")}
          >
            <Smartphone size={17} />
          </button>
        </div>
      </div>
      <div ref={viewport} className={styles.frameViewport}>
        <div
          style={{ width: width * scale, height: height * scale }}
          className={styles.frameSizer}
        >
          <iframe
            ref={frame}
            title={`${member.businessName} — танилцуулгын шууд харагдац`}
            srcDoc={frameDocument}
            sandbox="allow-same-origin"
            onLoad={() => {
              setDocument(frame.current?.contentDocument || null);
              if (window.matchMedia("(max-width: 767px)").matches)
                setDevice("phone");
            }}
            style={
              {
                width,
                height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              } as CSSProperties
            }
          />
        </div>
        {mount &&
          createPortal(
            <CompanyWebsite member={member} site={site} preview />,
            mount,
          )}
      </div>
      <p className={styles.previewFootnote}>
        Ногоон хүрээтэй хэсгийг засаж байна. Өөрчлөлт “Нийтлэх” дарсны дараа л
        нийтэд харагдана.
      </p>
    </aside>
  );
}
