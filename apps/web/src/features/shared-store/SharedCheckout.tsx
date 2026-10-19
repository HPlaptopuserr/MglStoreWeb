"use client";
import { useRef, useState, type FormEvent } from "react";
import { Loader2, MapPin, Phone, ShieldCheck } from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { StoreDialog } from "./StoreDialog";
import { money, type BasketLine, type RetailOrder } from "./types";
export function SharedCheckout({
  lines,
  onOrder,
  onClose,
}: {
  lines: BasketLine[];
  onOrder: (order: RetailOrder) => void;
  onClose: () => void;
}) {
  const { user, authFetch } = useAuth();
  const key = useRef(crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await authFetch(`${API}/store/shared-store/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutKey: key.current,
          phone: data.get("phone"),
          shippingAddress: data.get("address"),
          note: data.get("note"),
          lines: lines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
          })),
        }),
      });
      const payload = (await response.json()) as RetailOrder & {
        message?: string;
      };
      if (!response.ok)
        throw new Error(payload.message || "Захиалга үүсгэж чадсангүй.");
      onOrder(payload);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
    } finally {
      setPending(false);
    }
  }
  return (
    <StoreDialog title="Захиалгын мэдээлэл" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-bold">{lines[0]?.product.warehouse?.name}</p>
          <p className="mt-2 text-xs leading-5">
            Барааны дүн:{" "}
            <strong>
              {money(
                lines.reduce(
                  (sum, line) =>
                    sum + Number(line.product.price) * line.quantity,
                  0,
                ),
              )}
            </strong>
            <br />
            Хүргэлтийн нөхцөлийг дэлгүүр утсаар баталгаажуулна.
          </p>
        </div>
        <label className="block text-sm font-semibold">
          <span className="mb-2 flex items-center gap-2">
            <Phone size={15} />
            Утасны дугаар
          </span>
          <input
            required
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={user?.phone || ""}
            placeholder="99112233"
            maxLength={20}
            className="min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        </label>
        <label className="block text-sm font-semibold">
          <span className="mb-2 flex items-center gap-2">
            <MapPin size={15} />
            Хүлээн авах хаяг
          </span>
          <textarea
            required
            name="address"
            autoComplete="street-address"
            minLength={5}
            maxLength={1000}
            rows={3}
            placeholder="Дүүрэг, хороо, байр, тоот. Очиж авах бол энд тэмдэглэнэ үү."
            className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        </label>
        <label className="block text-sm font-semibold">
          Нэмэлт тайлбар{" "}
          <span className="font-normal text-slate-400">(заавал биш)</span>
          <textarea
            name="note"
            maxLength={1000}
            rows={2}
            className="mt-2 w-full rounded-xl border border-slate-200 p-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ShieldCheck size={18} />
          )}
          QR төлбөр рүү үргэлжлүүлэх
        </button>
      </form>
    </StoreDialog>
  );
}
