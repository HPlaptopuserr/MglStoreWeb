import type { ReactNode } from "react";

export function SectionContent({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#fbfcff] p-4 sm:p-6 lg:p-7">
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  );
}
