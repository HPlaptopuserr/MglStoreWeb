import { MessageSquare, Loader2, RotateCcw } from "lucide-react";
import type { WarehouseDividendVerification } from "@mgl/types";

export function DividendVerificationPanel({
  session,
  onReset,
}: {
  session: WarehouseDividendVerification;
  onReset: () => void;
}) {
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-blue-100 bg-white p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <MessageSquare className="size-4 text-blue-600" />
        Verify.mn баталгаажуулалт
      </h3>
      <p className="text-sm leading-6 text-slate-600">
        {session.displayInstruction}
      </p>
      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
        <span className="text-xs text-slate-500">Илгээх текст</span>
        <span className="font-mono text-xl font-bold tracking-widest text-slate-900">
          {session.text}
        </span>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Нэг SMS 150₮. Бүртгэлтэй дугаарынхаа SIM-ээс илгээнэ үү. Шинэ код авбал
        хуучин кодыг бүү ашиглаарай.
      </p>
      <a
        href={session.smsUri}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <MessageSquare className="size-4" />
        SMS илгээх
      </a>
      <p
        role="status"
        className="flex items-center justify-center gap-2 text-xs text-slate-500"
      >
        <Loader2 className="size-3.5 animate-spin" />
        SMS баталгаажуулалтыг хүлээж байна…
      </p>
      <button
        type="button"
        onClick={onReset}
        className="flex min-h-10 items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <RotateCcw className="size-3.5" />
        Сонголтоо дахин хийх
      </button>
    </div>
  );
}
