"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { useOrg } from "@/components/org/OrgContext";
import {
  getAccessPinStatus,
  removeAccessPin,
  saveAccessPin,
} from "@/lib/protected-section-pin";

const onlyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 4);

export function OrgAccessPinSettings() {
  const { user } = useOrg();
  const organizationId = user.organizationId || "";
  const isOwner = String(user.orgRole || "").toUpperCase() === "OWNER";
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    if (!organizationId) return;

    getAccessPinStatus(organizationId)
      .then((status) => {
        if (active) setConfigured(status.configured);
      })
      .catch((error) => {
        if (active) {
          setMessage({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "PIN тохиргоог уншиж чадсангүй.",
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [organizationId]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!/^\d{4}$/.test(pin)) {
      setMessage({ type: "error", text: "PIN код яг 4 оронтой тоо байна." });
      return;
    }
    if (pin !== confirmPin) {
      setMessage({ type: "error", text: "Давтан оруулсан PIN код таарахгүй байна." });
      return;
    }

    setSaving(true);
    try {
      const result = await saveAccessPin(organizationId, pin);
      setConfigured(true);
      setPin("");
      setConfirmPin("");
      setMessage({
        type: "success",
        text: result.message || "4 оронтой PIN код хадгалагдлаа.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "PIN код хадгалж чадсангүй.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Хамгаалалтын PIN кодыг устгах уу?")) return;
    setSaving(true);
    setMessage(null);
    try {
      await removeAccessPin(organizationId);
      setConfigured(false);
      setPin("");
      setConfirmPin("");
      setMessage({ type: "success", text: "PIN код устгагдлаа." });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "PIN код устгаж чадсангүй.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          {configured ? (
            <ShieldCheck className="h-5 w-5" />
          ) : (
            <KeyRound className="h-5 w-5" />
          )}
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Хурдан нэвтрэх
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            4 оронтой хамгаалалтын PIN
          </h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            Бүтээгдэхүүн, тайлан болон рестораны касс руу орохдоо login нэр,
            нууц үгийн оронд энэ кодыг ашиглана. PIN нь зөвхөн нэвтэрсэн
            төхөөрөмж дээр хамгаалалттай хэсгийг тайлна.
          </p>
        </div>
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          PIN тохиргоо ачаалж байна...
        </div>
      ) : !isOwner ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
          {configured
            ? "PIN код тохируулагдсан. Кодыг зөвхөн байгууллагын owner сольж чадна."
            : "PIN код тохируулаагүй байна. Байгууллагын owner энэ кодыг үүсгэнэ."}
        </div>
      ) : (
        <form onSubmit={handleSave} className="mt-5 max-w-xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                {configured ? "Шинэ PIN" : "PIN код"}
              </span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                pattern="[0-9]{4}"
                maxLength={4}
                value={pin}
                onChange={(event) => setPin(onlyDigits(event.target.value))}
                disabled={saving}
                placeholder="••••"
                className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-xl font-black tracking-[0.5em] text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                PIN давтах
              </span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                pattern="[0-9]{4}"
                maxLength={4}
                value={confirmPin}
                onChange={(event) =>
                  setConfirmPin(onlyDigits(event.target.value))
                }
                disabled={saving}
                placeholder="••••"
                className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-xl font-black tracking-[0.5em] text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving || pin.length !== 4 || confirmPin.length !== 4}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {configured ? "PIN солих" : "PIN хадгалах"}
            </button>
            {configured ? (
              <button
                type="button"
                onClick={() => void handleRemove()}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                PIN устгах
              </button>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
