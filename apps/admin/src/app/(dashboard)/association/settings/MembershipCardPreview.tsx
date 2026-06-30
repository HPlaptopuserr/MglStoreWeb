import { BadgeCheck, Sparkles } from "lucide-react";
import type { MembershipType } from "./_types";
import { getFeatureRows } from "./membershipTypeUtils";

const PREVIEW_ACCENTS = [
  "border-slate-300 bg-slate-50",
  "border-blue-300 bg-blue-50/40",
  "border-violet-300 bg-violet-50/40",
  "border-amber-300 bg-amber-50/40",
];

export function MembershipCardPreview({
  type,
  idx,
}: {
  type: MembershipType;
  idx: number;
}) {
  const features = getFeatureRows(type.desc);
  const primaryDuration = type.durations[0];
  const payLabel =
    primaryDuration?.price && primaryDuration.price > 0
      ? `${primaryDuration.price.toLocaleString()}₮ төлөх`
      : `${type.label || "Tier"} төлөх`;

  return (
    <aside className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
            Live card preview
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            Popup дээр ингэж харагдана
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-400 shadow-sm">
          #{idx + 1}
        </span>
      </div>

      <div className={`rounded-2xl border p-4 shadow-sm ${PREVIEW_ACCENTS[idx % PREVIEW_ACCENTS.length]}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="max-w-full break-words text-xl font-black leading-tight text-slate-950 [overflow-wrap:anywhere]">
              {type.label || "Tier нэр"}
            </h3>
            <div className="mt-2 flex items-end gap-1.5">
              <span className="truncate text-3xl font-black tracking-tight text-slate-950">
                {(type.price || "0₮ / сар").split("₮")[0]}
              </span>
              <span className="pb-1 text-[10px] font-black uppercase text-slate-400">
                ₮ / сар
              </span>
            </div>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
            <BadgeCheck size={17} />
          </span>
        </div>

        <div className="mb-4 grid gap-2">
          {type.durations.length > 0 ? (
            type.durations.map((duration, durationIdx) => (
              <div
                key={`${duration.months}-${durationIdx}`}
                className={`rounded-xl border px-3 py-2 text-xs font-black ${
                  durationIdx === 0
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {duration.label || `${duration.months || ""} сар`}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-400">
              Хугацааны сонголтгүй
            </div>
          )}
        </div>

        <div className="min-h-[104px] space-y-2">
          {features.length > 0 ? (
            features.map((feature, featureIdx) => (
              <div
                key={`${feature.text}-${featureIdx}`}
                className={`flex items-start gap-2 text-xs font-bold leading-5 ${
                  feature.enabled ? "text-slate-700" : "text-slate-300 line-through"
                }`}
              >
                <span className={feature.enabled ? "mt-0.5 text-orange-500" : "mt-1 text-slate-300"}>
                  {feature.enabled ? (
                    <Sparkles size={13} />
                  ) : (
                    <span className="block h-2 w-2 rounded-full border border-current" />
                  )}
                </span>
                <span>{feature.text}</span>
              </div>
            ))
          ) : (
            <p className="text-xs font-semibold text-slate-400">
              Feature мөр оруулаагүй байна.
            </p>
          )}
        </div>

        <button
          type="button"
          className="mt-5 flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 text-sm font-black text-white shadow-sm"
        >
          <BadgeCheck size={15} className="mr-2" />
          {payLabel}
        </button>
      </div>
    </aside>
  );
}
