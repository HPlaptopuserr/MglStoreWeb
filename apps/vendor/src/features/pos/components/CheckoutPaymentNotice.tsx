import { CheckCircle2, Info } from "lucide-react";
import { formatMoney } from "../utils/pos-display-format";

interface Props {
  paid: number;
  remaining: number;
  blocker?: string | null;
}

export function CheckoutPaymentNotice({ paid, remaining, blocker }: Props) {
  const partial = remaining > 0;
  const Icon = partial ? Info : CheckCircle2;
  return (
    <section
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-xl border p-4 ${partial ? "border-blue-200 bg-blue-50 text-blue-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
    >
      <Icon size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-bold">
          {partial
            ? "Хэсэгчилсэн төлбөр бүртгэгдлээ"
            : "Төлбөр бүрэн бүртгэгдлээ"}
        </p>
        <p className="mt-1 text-sm font-semibold">
          Төлсөн {formatMoney(paid)} · Үлдэгдэл {formatMoney(remaining)}
        </p>
        <p className="mt-1 text-xs leading-5">
          {blocker || (partial
            ? "Нийт төлбөр дуусаагүй байна. Үлдсэн хэсгээ төлнө үү."
            : "Борлуулалт, баримтаа үүсгэхийн тулд «Гүйлгээ батлах» дарна уу. Борлуулалт бүртгэгдсэний дараа касс руу буцна.")}
        </p>
      </div>
    </section>
  );
}
