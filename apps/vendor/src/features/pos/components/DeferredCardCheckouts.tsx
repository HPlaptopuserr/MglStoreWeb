import type { DeferredCardCheckout } from "@mgl/types";

export function DeferredCardCheckouts({ checkouts, disabled, onRestore }: {
  checkouts: DeferredCardCheckout[];
  disabled: boolean;
  onRestore: (checkout: DeferredCardCheckout) => void;
}) {
  if (!checkouts.length) return null;
  return <section aria-label="Хүлээгдэж буй картын сагс" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
    <p className="font-semibold">Тусад нь хадгалсан сагс · {checkouts.length}</p>
    <p>Эдгээр сагсанд дахин төлбөр авахгүй. Дараагийн үйлчлүүлэгчийг бэлэн/QR-аар үйлчилж болно.</p>
    <div className="mt-2 flex max-h-48 flex-wrap gap-2 overflow-y-auto">{checkouts.map(checkout => {
      const settled = checkout.status === "APPROVED" || checkout.status === "DECLINED";
      return <button type="button" key={checkout.attemptId} disabled={disabled || !settled}
        onClick={() => onRestore(checkout)} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-left disabled:opacity-60">
        {checkout.amount.toLocaleString()}₮ · {new Date(checkout.createdAt).toLocaleString("mn-MN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Ulaanbaatar" })}
        <span className="block text-xs">{checkout.status === "APPROVED" ? "Төлөгдсөн · Баримтыг дуусгах" : checkout.status === "DECLINED" ? "Амжилтгүй · Сагсыг сэргээх" : "Хариуг автоматаар шалгаж байна"}</span>
      </button>;
    })}</div>
  </section>;
}
