"use client";

import {
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  RadioTower,
  XCircle,
} from "lucide-react";

export type DeliveryDispatchAttempt = {
  id: string;
  status: "QUEUED" | "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CANCELLED";
  sequence: number;
  distanceKm: number | null;
  expiresAt: string | null;
  note?: string | null;
  branch: {
    id: string;
    name: string;
    address: string;
    lat: number | null;
    lng: number | null;
  };
};

export type DeliverySession = {
  orderId: string;
  orderNumber: string;
  subtotal?: number;
  total?: number;
  status: "ACCEPTED" | "SEARCHING" | "QUEUED" | "NO_BRANCH_AVAILABLE" | "NOT_STARTED";
  canPay: boolean;
  autoAssignedDelivery?: boolean;
  customerLocation?: {
    address: string;
    lat: number | null;
    lng: number | null;
  };
  radiusZonesKm?: number[];
  activeZone?: number | null;
  activeRadiusKm?: number | null;
  activeExpiresAt: string | null;
  acceptedBranch: DeliveryDispatchAttempt["branch"] | null;
  attempts: DeliveryDispatchAttempt[];
};

function getRemainingSeconds(expiresAt: string | null, now: number) {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
}

function getAttemptMeta(status: DeliveryDispatchAttempt["status"]) {
  switch (status) {
    case "ACCEPTED":
      return {
        label: "Хүлээн авсан",
        icon: CheckCircle2,
        dotClass: "bg-emerald-500",
      };
    case "PENDING":
      return {
        label: "Хүсэлт илгээсэн",
        icon: RadioTower,
        dotClass: "bg-orange-500",
      };
    case "QUEUED":
      return {
        label: "Дараалалд",
        icon: Clock3,
        dotClass: "bg-slate-400",
      };
    default:
      return {
        label: "Амжилтгүй",
        icon: XCircle,
        dotClass: "bg-rose-400",
      };
  }
}

function formatZoneLabel(zone: number, zones: number[]) {
  const radius = zones[zone - 1];
  const previousRadius = zones[zone - 2] ?? 0;
  if (!radius) return `${zone}-р бүс`;
  return previousRadius > 0 ? `${previousRadius}-${radius} км` : `0-${radius} км`;
}

export function DeliveryDispatchRadar({
  session,
  now,
}: {
  session: DeliverySession;
  now: number;
}) {
  const activeAttempt = session.attempts.find((attempt) => attempt.status === "PENDING");
  const remainingSeconds = getRemainingSeconds(session.activeExpiresAt, now);
  const isFinishedWithoutBranch = session.status === "NO_BRANCH_AVAILABLE";
  const radiusZones = session.radiusZonesKm?.length ? session.radiusZonesKm : [2, 5, 10, 20];
  const activeZone = session.activeZone ?? activeAttempt?.sequence ?? null;
  const activeZoneAttempts = activeZone
    ? session.attempts.filter((attempt) => attempt.sequence === activeZone)
    : [];
  const mapBranches = session.attempts.slice(0, 10);
  const completedCount = session.attempts.filter((attempt) =>
    ["ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"].includes(attempt.status),
  ).length;
  const wasAutoAssigned = session.attempts.some(
    (attempt) =>
      attempt.status === "ACCEPTED" &&
      attempt.note?.includes("систем автоматаар оноосон"),
  ) || session.autoAssignedDelivery === true;

  const title = session.canPay
    ? wasAutoAssigned
      ? "Хүргэлтийн ажилтан автоматаар оноогдлоо"
      : "Хүргэлт авах салбар олдлоо"
    : isFinishedWithoutBranch
      ? "5 салбарын хайлт дууслаа"
      : "Хүргэлтийн хүсэлт илгээж байна";

  const description = session.canPay
    ? wasAutoAssigned
      ? session.acceptedBranch
        ? `10 секундэд салбар хариу өгөөгүй тул ${session.acceptedBranch.name}-ыг сонгож, бүртгэлтэй хүргэлтийн компанийн ажилтанд захиалгыг автоматаар оноолоо. Одоо төлбөрөө үргэлжлүүлнэ үү.`
        : "10 секундэд салбарын хариу ирээгүй тул захиалгыг бүртгэлтэй хүргэлтийн компанийн ажилтанд автоматаар оноолоо. Одоо төлбөрөө үргэлжлүүлнэ үү."
      : `${session.acceptedBranch?.name ?? "Салбар"} захиалгыг хүлээн авлаа. Одоо төлбөрөө үргэлжлүүлж болно.`
    : isFinishedWithoutBranch
      ? "Хамгийн ойр салбарууд руу хүсэлт явуулсан ч хүргэлт авах боломжтой салбар олдсонгүй."
      : activeAttempt
        ? `${formatZoneLabel(activeAttempt.sequence, radiusZones)} бүсийн ${activeZoneAttempts.length} салбар руу notification зэрэг илгээгдсэн. 10 секундэд хэн ч авахгүй бол хүргэлтийн компанийн ажилтанд автоматаар онооно.`
        : "Хэрэглэгчийн координат дээр үндэслэн radius бүсүүдээр салбаруудыг зэрэг шалгаж байна.";

  if (isFinishedWithoutBranch) {
    return (
      <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-amber-900">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm">
          <MapPin size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black">Хүргэлт баталгаажаагүй</p>
          <p className="mt-0.5 text-xs leading-4 text-amber-800">
            Энэ захиалга салбараас авах горимд шилжлээ.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm shadow-sm">
      <div className="relative h-28 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,.24),transparent_36%),radial-gradient(circle_at_80%_20%,rgba(34,197,94,.20),transparent_28%)]" />

        <div className="absolute left-1/2 top-[44%] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-300/50" />
        <div className="absolute left-1/2 top-[44%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-300/30" />
        {!session.canPay && !isFinishedWithoutBranch && (
          <div className="absolute left-1/2 top-[44%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange-300/60 animate-ping" />
        )}

        <div className="absolute left-1/2 top-[44%] flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-950/30">
          <Navigation size={18} />
        </div>

        {mapBranches.map((attempt, index) => {
          const meta = getAttemptMeta(attempt.status);
          const positions = [
            ["18%", "24%"],
            ["76%", "27%"],
            ["27%", "72%"],
            ["70%", "72%"],
            ["49%", "18%"],
            ["13%", "55%"],
            ["86%", "54%"],
            ["37%", "33%"],
            ["61%", "45%"],
            ["48%", "80%"],
          ];
          const [left, top] = positions[index] ?? ["50%", "50%"];

          return (
            <div
              key={attempt.id}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 shadow-lg shadow-slate-950/20 sm:gap-1.5 sm:px-2 sm:py-1"
              style={{ left, top }}
            >
              <span className={`h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${meta.dotClass}`} />
              <span className="max-w-10 truncate text-[10px] font-black text-slate-800 sm:max-w-16">
                {attempt.sequence}
              </span>
            </div>
          );
        })}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent px-3 pb-2 pt-8 text-white">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-white/55 sm:text-[11px]">
              Dispatch radar
            </p>
            <h3 className="mt-0.5 pr-20 text-sm font-black leading-4">
              {title}
            </h3>
          </div>
          {remainingSeconds !== null && !session.canPay && !isFinishedWithoutBranch && (
            <div className="absolute bottom-2 right-3 shrink-0 rounded-xl bg-white px-2.5 py-1.5 text-center text-slate-950">
              <p className="text-base font-black tabular-nums">{remainingSeconds}</p>
              <p className="text-[10px] font-bold text-slate-500">сек</p>
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-2 p-3">
        <p className="break-words text-xs leading-4 text-slate-600">{description}</p>

        {session.customerLocation && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Хүргүүлэх байршил
            </p>
            <p className="mt-0.5 truncate text-xs font-bold text-slate-700">
              {session.customerLocation.address}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {radiusZones.map((radiusKm, index) => {
            const zone = index + 1;
            const zoneAttempts = session.attempts.filter((attempt) => attempt.sequence === zone);
            const isActive = activeZone === zone && !session.canPay && !isFinishedWithoutBranch;
            const isDone = zoneAttempts.length > 0 && zoneAttempts.every((attempt) =>
              ["ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"].includes(attempt.status),
            );

            return (
              <div
                key={radiusKm}
                className={`rounded-lg px-1.5 py-1.5 text-center ring-1 ${
                  isActive
                    ? "bg-orange-500 text-white ring-orange-500"
                    : isDone
                      ? "bg-slate-100 text-slate-500 ring-slate-200"
                      : "bg-white text-slate-600 ring-slate-200"
                }`}
              >
                <p className="text-[10px] font-black sm:text-[10px]">{zone}-р бүс</p>
                <p className="mt-0.5 text-[11px] font-bold">{formatZoneLabel(zone, radiusZones)}</p>
                <p className="mt-0.5 text-[10px] font-semibold opacity-80">{zoneAttempts.length} дэлгүүр</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <div className="rounded-lg bg-slate-50 px-3 py-1.5">
            <p className="text-[10px] font-bold text-slate-400">Шалгах</p>
            <p className="text-sm font-black text-slate-950">{session.attempts.length}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-1.5">
            <p className="text-[10px] font-bold text-slate-400">Дууссан</p>
            <p className="text-sm font-black text-slate-950">{completedCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-1.5">
            <p className="text-[10px] font-bold text-slate-400">Төлөв</p>
            <p className="truncate text-sm font-black text-slate-950">
              {session.canPay ? "OK" : isFinishedWithoutBranch ? "Pickup" : "Live"}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
