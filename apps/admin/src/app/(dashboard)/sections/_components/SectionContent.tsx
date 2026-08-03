import type { ReactNode } from "react";

export function SectionContent({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#fbfcff] p-3 sm:p-4 lg:p-5">
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  );
}
