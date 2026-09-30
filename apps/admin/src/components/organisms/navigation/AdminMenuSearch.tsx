"use client";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAdminAuth } from "@/lib/admin-auth";
import { SECTIONS } from "@/lib/sections/constants";
import { buildAdminMenuIndex } from "@/lib/admin-menu-search";
import { AdminMenuSearchDialog } from "./AdminMenuSearchDialog";

export function AdminMenuSearch({
  navItems,
}: {
  navItems: { label: string; href: string }[];
}) {
  const { hasPermission, isReady } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const entries = useMemo(
    () => buildAdminMenuIndex(navItems, SECTIONS, hasPermission),
    [navItems, hasPermission],
  );
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (
        !isReady ||
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "k"
      )
        return;
      if (document.querySelector("dialog[open]")) return;
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [isReady]);
  return (
    <>
      <div className="border-b border-slate-200 bg-white/95 px-4 py-3 md:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <button
            type="button"
            aria-haspopup="dialog"
            disabled={!isReady}
            onClick={() => setOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-500 transition hover:border-lime-300 hover:bg-lime-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-600 disabled:opacity-50 sm:max-w-lg"
          >
            <Search aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              {isReady ? "Цэс хайх…" : "Цэс ачааллаж байна…"}
            </span>
            <kbd className="hidden rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs sm:inline">
              Ctrl / ⌘ K
            </kbd>
          </button>
        </div>
      </div>
      {open && isReady && (
        <AdminMenuSearchDialog
          entries={entries}
          onDismiss={() => setOpen(false)}
        />
      )}
    </>
  );
}
