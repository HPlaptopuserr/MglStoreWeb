import { AlertTriangle, RefreshCw } from "lucide-react";
import { WorkforceApiError } from "@/lib/workforce-api";

export default function WorkforceErrorPanel({
  error,
  onRetry,
}: {
  error: WorkforceApiError;
  onRetry: () => void;
}) {
  const fieldErrors = Object.entries(error.fields).filter(([, value]) => value);
  return (
    <section
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 p-6"
    >
      <div className="flex gap-4">
        <span className="h-fit rounded-xl bg-rose-100 p-2 text-rose-700">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wider text-rose-500">
            Алдааны код: {error.code}
          </p>
          <h2 className="mt-1 text-lg font-black text-rose-900">
            {error.message}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            {error.action}
          </p>
          {fieldErrors.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-semibold text-rose-800">
              {fieldErrors.map(([field, message]) => (
                <li key={field}>
                  {field}: {message}
                </li>
              ))}
            </ul>
          )}
          {error.retryable && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-black text-white transition hover:bg-rose-800"
            >
              <RefreshCw className="h-4 w-4" />
              Дахин оролдох
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
