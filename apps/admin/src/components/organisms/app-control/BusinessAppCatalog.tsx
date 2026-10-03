import {
  FEATURE_OPTIONS,
  type BusinessAppFeatures,
  type AppFeatureOption,
} from "./mgl-business.model";

export function BusinessAppCatalog({
  features,
  onToggle,
}: {
  features: BusinessAppFeatures;
  onToggle: (key: keyof BusinessAppFeatures) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Дотоод ажиллагаа
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">
            Ажлын аппын каталог
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Байгууллагад нээсэн аппууд Owner-д автоматаар үйлчилнэ. Owner
            эдгээрийн хүрээнд ажилтанд эрх олгоно.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {FEATURE_OPTIONS.map((feature) => (
          <FeatureToggleCard
            key={feature.key}
            feature={feature}
            enabled={features[feature.key]}
            onToggle={() => onToggle(feature.key)}
          />
        ))}
      </div>
    </div>
  );
}

function FeatureToggleCard({
  feature,
  enabled,
  onToggle,
}: {
  feature: AppFeatureOption;
  enabled: boolean;
  onToggle: () => void;
}) {
  const Icon = feature.icon;

  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      aria-label={feature.label}
      className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
        enabled
          ? "border-emerald-200 bg-emerald-50 shadow-sm ring-2 ring-emerald-100"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            enabled ? "bg-white text-emerald-600" : "bg-slate-50 text-slate-500"
          }`}
        >
          <Icon size={20} />
        </span>
        <span
          className={`h-6 w-11 rounded-full p-0.5 transition ${
            enabled ? "bg-emerald-500" : "bg-slate-200"
          }`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
      </div>
      <p className="text-sm font-black text-slate-950">{feature.label}</p>
      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
        {enabled ? "Нээлттэй" : "Хаалттай"} · {feature.shortLabel}
      </p>
      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
        {feature.description}
      </p>
    </button>
  );
}
