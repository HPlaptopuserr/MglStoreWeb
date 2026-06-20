import { CheckCircle2, Info, XCircle } from "lucide-react";

export type ReelsNoticeKind = "success" | "info" | "error";

type ReelsNoticeProps = {
  kind: ReelsNoticeKind;
  message: string;
};

const noticeIcon = {
  success: CheckCircle2,
  info: Info,
  error: XCircle,
};

export function ReelsNotice({ kind, message }: ReelsNoticeProps) {
  const Icon = noticeIcon[kind];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom,0px))] z-[60] flex justify-center px-4 md:bottom-6">
      <div className="flex max-w-[min(92vw,360px)] items-center gap-2 rounded-full bg-slate-950/88 px-4 py-2 text-xs font-black text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
        <Icon
          className={`h-4 w-4 ${
            kind === "success"
              ? "text-emerald-400"
              : kind === "error"
                ? "text-red-400"
                : "text-sky-300"
          }`}
        />
        <span className="truncate">{message}</span>
      </div>
    </div>
  );
}
