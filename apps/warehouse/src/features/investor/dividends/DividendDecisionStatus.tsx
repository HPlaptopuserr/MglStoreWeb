import { CheckCircle2 } from "lucide-react";
import type { WarehouseDividendDecisionSummary } from "@mgl/types";

export function DividendDecisionStatus({
  decision,
}: {
  decision: WarehouseDividendDecisionSummary;
}) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-xl bg-white p-3 text-sm text-emerald-800">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">
          {decision.choice === "REINVEST"
            ? "Үндсэн хөрөнгөд нэмэгдсэн"
            : "Дансаар авах сонголт баталгаажсан"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Verify.mn ·{" "}
          {new Date(decision.confirmedAt).toLocaleString("mn-MN", {
            timeZone: "Asia/Ulaanbaatar",
          })}
        </p>
      </div>
    </div>
  );
}
