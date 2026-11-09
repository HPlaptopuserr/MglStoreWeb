import type { ReactNode } from "react";

/** Keep checkout actions visible while receipt fields and order details grow. */
export function SelfServiceCheckoutLayout({
  header,
  children,
  footer,
}: {
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#f3f5f2] p-3 text-[#10221c] sm:p-5">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
        <div className="mb-4 shrink-0">{header}</div>
        <div
          role="region"
          aria-label="Захиалга болон төлбөрийн тохиргоо"
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[28px] pb-4 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          {children}
        </div>
        <footer
          aria-label="Төлбөр баталгаажуулах"
          className="mt-3 shrink-0 rounded-2xl border border-[#e7e1d3] bg-white p-3 shadow-[0_-4px_20px_rgba(15,35,29,0.06)] sm:px-5"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          {footer}
        </footer>
      </div>
    </main>
  );
}
