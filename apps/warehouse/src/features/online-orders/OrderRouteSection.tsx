import {
  Mail,
  MapPin,
  Navigation,
  Phone,
  Store,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { OnlineOrder } from "./online-order.types";

function parseCustomerNote(note: string | null) {
  const lines = note?.split("\n").map((line) => line.trim()).filter(Boolean) ?? [];
  const secondaryPhoneLine = lines.find((line) =>
    line.toLocaleLowerCase("mn").startsWith("нэмэлт дугаар:"),
  );
  return {
    secondaryPhone: secondaryPhoneLine?.split(":").slice(1).join(":").trim(),
    note: lines
      .filter((line) => {
        const normalized = line.toLocaleLowerCase("mn");
        return (
          !normalized.startsWith("имэйл:") &&
          !normalized.startsWith("нэмэлт дугаар:")
        );
      })
      .join("\n"),
  };
}

export function OrderRouteSection({ order }: { order: OnlineOrder }) {
  const mapsUrl = order.shippingAddress.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        order.shippingAddress,
      )}`
    : null;
  const customerNote = parseCustomerNote(order.note);
  const sourceName = order.branch
    ? `${order.organization.name} · ${order.branch.name}`
    : order.organization.name;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-black text-slate-900">
          Захиалагч ба хүргэлт
        </h3>
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
          <Store size={13} className="shrink-0 text-blue-600" />
          <span className="truncate">{sourceName}</span>
        </span>
      </header>

      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <InfoRow
          icon={UserRound}
          label="Хүлээн авагч"
          value={order.customer.name}
        />
        <InfoRow
          icon={Phone}
          label="Холбоо барих"
          value={[
            order.customer.phone || order.phone,
            customerNote.secondaryPhone,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <InfoRow
            icon={MapPin}
            label="Хүргэх хаяг"
            value={order.shippingAddress}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
          >
            <Navigation size={14} />
            Газрын зураг
          </a>
        )}
        <a
          href={`mailto:${order.customer.email}`}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
        >
          <Mail size={14} />
          Имэйл
        </a>
      </div>

      {customerNote.note && (
        <div className="mx-4 mb-4 rounded-lg border border-amber-100 bg-amber-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">
            Захиалагчийн тайлбар
          </p>
          <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-amber-900">
            {customerNote.note}
          </p>
        </div>
      )}
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-semibold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}
