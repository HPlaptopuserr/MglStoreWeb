import { ShieldCheck } from "lucide-react";
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
}: {
  features: BusinessAppFeatures;
  members: BusinessAppMember[];
  dirty: boolean;
  ceoEnabled: boolean;
}) {
  const owners = members.filter(
    (member) => member.role === "OWNER" && member.memberActive !== false,
  );
  const apps = FEATURE_OPTIONS.filter((app) => features[app.key]);
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
            Admin байгууллагад апп нээнэ → Owner ажилтнууддаа эрх олгоно.
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
        {apps.map((app) => (
          <div
            key={app.key}
            className="rounded-xl border border-emerald-100 bg-white p-3"
          >
            <app.icon
              size={22}
              aria-hidden="true"
              className="mb-2 text-emerald-700"
            />
            <p className="text-sm font-semibold text-slate-900">{app.label}</p>
          </div>
        ))}
        {ceoEnabled && (
          <div className="rounded-xl border border-emerald-100 bg-white p-3 text-sm font-semibold text-slate-900">
            CEO үйлчилгээ
          </div>
        )}
      </div>
      {apps.length === 0 && !ceoEnabled && (
        <p className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600">
          Ажлын апп нээгээгүй байна. Доорх каталогоос сонгоно уу.
        </p>
      )}
      <p className="mt-4 text-xs leading-5 text-slate-600">
        Энэ нь байгууллагын тохиргооны урьдчилсан харагдац. Owner-д аппын эрхийг
        давхар оноохгүй. Апп доторх эцсийн харагдац нь тухайн хувилбарын
        дэмжлэгээс хамаарна.
      </p>
    </section>
  );
}
