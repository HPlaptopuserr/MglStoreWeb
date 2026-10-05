import { BrainCircuit, ShieldCheck } from "lucide-react";
import { BusinessAppToggle } from "./BusinessAppToggle";
import {
  FEATURE_OPTIONS,
  type BusinessAppFeatures,
  type BusinessAppMember,
} from "./mgl-business.model";

export function BusinessOwnerPreview({
  features,
  members,
  dirty,
  ceoEnabled,
  onToggle,
  onToggleCeo,
}: {
  features: BusinessAppFeatures;
  members: BusinessAppMember[];
  dirty: boolean;
  ceoEnabled: boolean;
  onToggle: (key: keyof BusinessAppFeatures) => void;
  onToggleCeo: () => void;
}) {
  const owners = members.filter(
    (member) => member.role === "OWNER" && member.memberActive !== false,
  );
  const hasEnabledApps = FEATURE_OPTIONS.some((app) => features[app.key]);
  return (
    <section
      aria-label="Owner-д нээгдэх аппууд"
      className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-slate-950">
            <ShieldCheck size={20} className="text-emerald-700" />
            Owner-д нээгдэх аппууд
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Аппын toggle-ийг сонгоод “App тохиргоо хадгалах” товчийг дарна уу.
          </p>
        </div>
        <span
          role="status"
          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800"
        >
          {dirty
            ? "Хадгалаагүй өөрчлөлтийн харагдац"
            : "Хадгалсан тохиргооны харагдац"}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700">
        {owners.length
          ? owners
              .map(
                (owner) =>
                  owner.fullName || owner.email || owner.phone || "Owner",
              )
              .join(", ")
          : "Идэвхтэй Owner бүртгэгдээгүй байна."}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {FEATURE_OPTIONS.map((app) => (
          <BusinessAppToggle
            key={app.key}
            label={app.label}
            icon={app.icon}
            enabled={features[app.key]}
            onToggle={() => onToggle(app.key)}
          />
        ))}
        <BusinessAppToggle
          label="CEO үйлчилгээ"
          icon={BrainCircuit}
          enabled={ceoEnabled}
          onToggle={onToggleCeo}
        />
      </div>
      {!hasEnabledApps && !ceoEnabled && (
        <p className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600">
          Ажлын апп нээгээгүй байна. Дээрх toggle-оор апп нээнэ үү.
        </p>
      )}
      <p className="mt-4 text-xs leading-5 text-slate-600">
        Энэ сонголт доорх ажлын аппын каталогтой ижил тохиргоог өөрчилнө.
        Байгууллагад нээсэн аппууд Owner-д үйлчилж, Owner ажилтнууддаа эрх олгоно.
      </p>
    </section>
  );
}
