import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

export function VendorSessionLoading({
  switching = false,
}: {
  switching?: boolean;
}) {
  return (
    <div
      role="status"
      className="flex min-h-dvh items-center justify-center gap-3 bg-slate-50 px-6 text-sm text-slate-600"
    >
      <Loader2
        className="size-5 animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      {switching ? "Дэлгүүр сольж байна…" : "Дэлгүүрийн мэдээлэл ачаалж байна…"}
    </div>
  );
}

export function VendorSessionFeedback({
  title,
  message,
  children,
  onLogout,
}: {
  title: string;
  message: string;
  children: ReactNode;
  onLogout: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-5">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <AlertCircle
          className="mb-4 size-8 text-amber-500"
          aria-hidden="true"
        />
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-slate-600">
          {message}
        </p>
        <div className="mt-6 space-y-4">{children}</div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-5 min-h-10 rounded-lg px-2 text-sm font-medium text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          Өөр бүртгэлээр нэвтрэх
        </button>
      </section>
    </main>
  );
}
