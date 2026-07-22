"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface PrivacyPolicyNavItem {
  number: string;
  label: string;
  id: string;
}

interface PrivacyPolicyNavProps {
  items: readonly PrivacyPolicyNavItem[];
}

export function PrivacyPolicyNav({ items }: PrivacyPolicyNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map(({ id }) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visibleSection) setActiveId(visibleSection.target.id);
      },
      { rootMargin: "-22% 0px -68% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return (
    <aside className="sticky top-20 z-20 h-fit rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur sm:p-5 lg:top-36 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
      <h2 className="text-sm font-bold text-slate-950">Агуулга</h2>
      <nav aria-label="Нууцлалын бодлогын агуулга" className="mt-3 lg:mt-4">
        <ol className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
          {items.map(({ number, label, id }) => {
            const isActive = activeId === id;

            return (
              <li key={id} className="shrink-0 lg:shrink">
                <Link
                  href={`#${id}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={() => setActiveId(id)}
                  className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm leading-5 transition-colors lg:w-full ${
                    isActive
                      ? "bg-amber-50 font-medium text-amber-800"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <span
                    className={`font-semibold ${
                      isActive ? "text-amber-600" : "text-slate-400"
                    }`}
                  >
                    {number}
                  </span>
                  <span className="hidden lg:inline">{label}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
      <a
        href="#account-deletion"
        className="mt-4 hidden rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-slate-800 lg:block"
      >
        Бүртгэл устгах
      </a>
    </aside>
  );
}
