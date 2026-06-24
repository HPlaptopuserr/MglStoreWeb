import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { OrgMerchantSettings } from "@/components/org/OrgMerchantSettings";

export default function SettingsPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <div className="mt-8 max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-indigo-600">
          Байгууллагын тохиргоо
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          Тохиргоо
        </h1>
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">
          Restaurant QR menu болон төлбөрийн org-level тохиргоог эндээс
          удирдана.
        </p>
      </div>

      <div className="mt-6">
        <OrgMerchantSettings />
      </div>
    </section>
  );
}
