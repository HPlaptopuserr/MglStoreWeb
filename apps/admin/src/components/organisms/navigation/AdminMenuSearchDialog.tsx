"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { searchAdminMenu, type MenuSearchEntry } from "@/lib/admin-menu-search";

export function AdminMenuSearchDialog({
  entries,
  onDismiss,
}: {
  entries: MenuSearchEntry[];
  onDismiss: () => void;
}) {
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);
  const backdropStart = useRef(false);
  const titleId = useId();
  const resultsId = useId();
  const results = useMemo(
    () => searchAdminMenu(entries, query),
    [entries, query],
  );
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        backdropStart.current =
          event.target === event.currentTarget &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom);
      }}
      onClick={(event) => {
        if (backdropStart.current && event.target === event.currentTarget)
          onDismiss();
        backdropStart.current = false;
      }}
      onKeyDown={(event) => {
        if (
          !["ArrowDown", "ArrowUp"].includes(event.key) ||
          event.nativeEvent.isComposing
        )
          return;
        const links = Array.from(
          resultsRef.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ??
            [],
        );
        if (!links.length) return;
        event.preventDefault();
        const index = links.findIndex(
          (link) => link === document.activeElement,
        );
        const next =
          event.key === "ArrowDown"
            ? (index + 1) % links.length
            : index <= 0
              ? links.length - 1
              : index - 1;
        links[next]?.focus();
      }}
      className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <header className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2 id={titleId} className="font-bold">
            Цэс хайх
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Цэсний хайлтыг хаах"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-lime-600"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>
        <form
          role="search"
          className="relative mx-5 my-3"
          onSubmit={(event) => {
            event.preventDefault();
            resultsRef.current
              ?.querySelector<HTMLAnchorElement>("a[href]")
              ?.click();
          }}
        >
          <Search
            aria-hidden="true"
            className="absolute left-3 top-3 h-5 w-5 text-slate-400"
          />
          <input
            ref={inputRef}
            type="search"
            aria-label="Цэсний нэр эсвэл түлхүүр үг"
            aria-controls={resultsId}
            value={query}
            maxLength={100}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Дэлгүүр, агуулах, QR, POS..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100"
          />
        </form>
        <p role="status" className="px-5 pb-2 text-xs text-slate-500">
          {results.length} цэс {query ? "олдлоо" : "— нэрээр нь хайж болно"}
        </p>
        <ul
          ref={resultsRef}
          id={resultsId}
          className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-3"
        >
          {results.map((entry) => (
            <li key={entry.href}>
              <Link
                href={entry.href}
                onClick={onDismiss}
                className="group flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-lime-50 focus-visible:bg-lime-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-lime-600"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">
                    {entry.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{entry.group}</p>
                </div>
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-lime-700"
                />
              </Link>
            </li>
          ))}
          {!results.length && (
            <li className="px-3 py-8 text-center text-sm text-slate-500">
              Тохирох цэс олдсонгүй. Өөр нэр эсвэл түлхүүр үгээр хайна уу.
            </li>
          )}
        </ul>
        <footer className="shrink-0 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          ↑ ↓ сонгох · Enter нээх · Esc хаах
        </footer>
      </div>
    </dialog>
  );
}
