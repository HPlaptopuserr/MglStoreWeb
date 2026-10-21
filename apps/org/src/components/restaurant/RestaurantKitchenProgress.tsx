import { ChefHat } from "lucide-react";
import type { RestaurantTicket } from "@/lib/restaurant-pos-api";

const stages = [
  { status: "NEW", label: "Хүлээгдэж байна", style: "text-slate-600" },
  { status: "PREPARING", label: "Бэлтгэж байна", style: "text-amber-700" },
  { status: "READY", label: "Хоол бэлэн", style: "text-emerald-700" },
] as const;

/** Kitchen progress stays independent of payment status, including paid QR orders. */
export function RestaurantKitchenProgress({ tickets }: { tickets: RestaurantTicket["kitchenTickets"] }) {
  const active = tickets.filter((ticket) => ticket.status !== "CANCELLED");
  if (active.length === 0) return null;
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><ChefHat aria-hidden="true" className="h-3.5 w-3.5" />Гал тогооны явц</p>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {stages.map((stage) => {
          const count = active.filter((ticket) => ticket.status === stage.status || (stage.status === "READY" && ticket.status === "SERVED")).length;
          return count > 0 ? <span key={stage.status} className={`text-[10px] font-bold ${stage.style}`}>{stage.label}{active.length > 1 ? ` · ${count} тасалбар` : ""}</span> : null;
        })}
      </div>
    </div>
  );
}
