import { formatMoney } from "../utils/pos-display-format";
import type { PosCreditListLine } from "../types/credit-repayment";

export function CreditLineAmount({ line, onRepay }: { line: PosCreditListLine; onRepay: () => void }) {
  return (
    <>
      <p className="font-black tabular-nums text-slate-950">
        {formatMoney(line.lineTotal)}
      </p>
      <p className="text-[10px] font-semibold text-slate-500">Барааны дүн</p>
      <button
        type="button"
        onKeyDown={event => event.stopPropagation()}
        onClick={event => { event.stopPropagation(); onRepay(); }}
        className="mt-1 min-h-8 rounded-lg px-2 text-[10px] font-bold text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >Баримтын зээл төлөх</button>
    </>
  );
}
