import { Save, Loader2, CheckCircle2 } from "lucide-react";
import type { SectionKey } from "@/lib/sections/types";
import { SectionsSidebar } from "./SectionsSidebar";

type Props = {
  active: SectionKey;
  setActive: (key: SectionKey) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  children: React.ReactNode;
};

export function SectionsLayout({
  active,
  setActive,
  onSave,
  saving,
  saved,
  children,
}: Props) {
  const showSave = active === "banner" || active === "categories";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Нэмэлт хэсгүүд</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Нүүр хуудасны агуулгыг удирдана
          </p>
        </div>
        {showSave && (
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <CheckCircle2 size={16} />
            ) : (
              <Save size={16} />
            )}
            {saved ? "Хадгалагдлаа" : "Хадгалах"}
          </button>
        )}
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-0 rounded-3xl border border-slate-100 shadow-sm overflow-hidden bg-white" style={{ height: "calc(100vh - 180px)" }}>
        <SectionsSidebar active={active} onSelect={setActive} />
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
