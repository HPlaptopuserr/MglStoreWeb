import type { ReactNode } from "react";
import { Building2, ShieldCheck } from "lucide-react";
import type { VendorSessionUser } from "./vendor-session.model";

const capabilityLabels: Record<string, string> = {
  SALES_REPRESENTATIVE: "Борлуулалтын төлөөлөгч",
  ORDER_PROCESSOR: "Захиалга боловсруулах",
  STOCK_MANAGER: "Бараа, нөөцийн удирдлага",
  DELIVERY_DRIVER: "Хүргэлтийн ажилтан",
  WORKFORCE_ATTENDANCE_VIEW: "Ирц харах",
  WORKFORCE_REPORT_EXPORT: "Ажилтны тайлан татах",
  QUALITY_INSPECTION_PERFORM: "Чанарын шалгалт хийх",
  QUALITY_INSPECTION_REVIEW: "Чанарын шалгалт хянах",
  QUALITY_TEMPLATE_MANAGE: "Чанарын загвар удирдах",
  QUALITY_REPORT_VIEW: "Чанарын тайлан харах",
};

export function MemberWorkspace({
  user,
  selector,
  error,
  onLogout,
}: {
  user: VendorSessionUser;
  selector: ReactNode;
  error: string | null;
  onLogout: () => void;
}) {
  return (
    <main className="min-h-dvh bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <p className="font-semibold text-slate-900">
            {user.fullName || user.email}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {user.orgRole === "ADMIN"
              ? "Менежер"
              : user.orgRole === "VIEWER"
                ? "Ажиглагч"
                : "Ажилтан"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {selector}
          <button
            type="button"
            onClick={onLogout}
            className="min-h-10 rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-100 focus-visible:outline-2"
          >
            Гарах
          </button>
        </div>
      </header>
      <section className="mx-auto max-w-3xl space-y-6 px-5 py-10 sm:py-16">
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
          >
            {error}
          </p>
        )}
        <div>
          <Building2 className="mb-4 size-9 text-blue-600" aria-hidden="true" />
          <p className="text-sm text-slate-500">Таны ажиллах байгууллага</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {user.organizationName}
          </h1>
          <p className="mt-3 text-sm text-emerald-700">
            Энэ байгууллагад ажилтны эрхээр нэвтэрсэн байна.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck size={20} aria-hidden="true" />
            Танд оноосон ажлын эрх
          </h2>
          {user.capabilities.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {user.capabilities.map((capability) => (
                <li
                  key={capability}
                  className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800"
                >
                  {capabilityLabels[capability] || "Байгууллагын нэмэлт эрх"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Одоогоор тусгай ажлын эрх оноогоогүй байна.
            </p>
          )}
          <p className="mt-5 text-sm leading-6 text-slate-600">
            POS касс ашиглах эрх тусдаа олгогдоно. Касс ажиллуулах бол
            байгууллагын эзэмшигчээс кассын эрх авна уу.
          </p>
        </div>
      </section>
    </main>
  );
}
