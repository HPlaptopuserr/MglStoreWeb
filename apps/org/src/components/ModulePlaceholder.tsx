import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  legacyPath?: string;
};

export default function ModulePlaceholder({
  title,
  description,
  legacyPath,
}: ModulePlaceholderProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <div className="mt-8 max-w-2xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
          Generic org module
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">{title}</h2>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
          {description}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <p className="text-sm font-black text-slate-950">
          Энэ module-ийн org.mglstore.mn хувилбар бэлтгэгдэж байна.
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Одоогийн vendor screen-үүдийг шууд хуулж тавихгүй. Эхлээд хүнсний
          дэлгүүрт уягдсан үг хэллэг, POS-first flow, product-only assumption-уудыг
          салгаж байж энэ module-д оруулна.
        </p>
        {legacyPath && (
          <a
            href={`http://localhost:3002${legacyPath}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Одоогийн vendor module нээх
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </section>
  );
}
