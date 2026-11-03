"use client";
import { useEffect, useState, type FormEvent } from "react";
import { API, adminFetch } from "@/lib/api";
export function WorkforceAddonPrices() {
  const [prices, setPrices] = useState<{
      tracking: number | null;
      mail: number | null;
    } | null>(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    void adminFetch(`${API}/admin/workforce-addon-prices`, {
      signal: abort.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          catalog?: { code: string; price: number | null }[];
          message?: string;
        };
        if (!response.ok) throw new Error(result.message ?? "Үнэ ачаалсангүй");
        setPrices({
          tracking:
            result.catalog?.find((c) => c.code === "tracking")?.price ?? null,
          mail: result.catalog?.find((c) => c.code === "mail")?.price ?? null,
        });
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : "Алдаа");
      });
    return () => abort.abort();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    setSaved(false);
    try {
      const response = await adminFetch(`${API}/admin/workforce-addon-prices`, {
        method: "PATCH",
        body: JSON.stringify({
          tracking: form.get("tracking") ? Number(form.get("tracking")) : null,
          mail: form.get("mail") ? Number(form.get("mail")) : null,
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Хадгалж чадсангүй");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-bold text-slate-700">
        Маркетийн нийт байгууллагад үйлчлэх үнэ
      </summary>
      <p className="mt-3 text-xs text-slate-500">
        Эдгээр үнэ бүх байгууллагын маркет дээр үйлчилнэ. Хоосон бол худалдан
        авалт идэвхгүй.
      </p>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {prices && (
        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={submit}>
          <label className="grid gap-1 text-xs text-slate-600">
            Трекинг үйлчилгээ (₮)
            <input
              type="number"
              name="tracking"
              min={1}
              max={100000000}
              defaultValue={prices.tracking ?? ""}
              className="rounded-lg border border-slate-200 p-2"
            />
          </label>
          <label className="grid gap-1 text-xs text-slate-600">
            Имэйл үйлчилгээ (₮)
            <input
              type="number"
              name="mail"
              min={1}
              max={100000000}
              defaultValue={prices.mail ?? ""}
              className="rounded-lg border border-slate-200 p-2"
            />
          </label>
          <button
            className="self-end rounded-lg bg-slate-900 p-2 text-xs font-bold text-white"
            disabled={pending}
          >
            {pending ? "Хадгалж байна…" : "Нийт үнийг хадгалах"}
          </button>
          {saved && (
            <p role="status" className="text-xs text-emerald-700">
              Хадгалагдлаа
            </p>
          )}
        </form>
      )}
    </details>
  );
}
