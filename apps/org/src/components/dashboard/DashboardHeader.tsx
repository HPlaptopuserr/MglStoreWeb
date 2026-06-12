import { OrgUser } from "@/lib/api";

export default function DashboardHeader({ user }: { user: OrgUser }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
            Organization operating system
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {user.organizationName || "Байгууллага"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Энэ dashboard нь зөвхөн хүнсний дэлгүүрт биш, тухайн байгууллагад
            нээгдсэн module-ууд дээр тулгуурлаж ажиллана.
          </p>
        </div>
        <span className="w-fit rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
          {user.orgRole || "ORG USER"}
        </span>
      </div>
    </section>
  );
}
