import { QRCodeSVG } from "qrcode.react";
import { formatWarehouseInvestment } from "@mgl/types";
import type { InvestmentTopUp } from "./useInvestmentTopUps";

export function InvestmentTopUpDetails({
  item,
  busy,
  onCheck,
}: {
  item: InvestmentTopUp;
  busy: boolean;
  onCheck: () => void;
}) {
  const qr = item.method === "QR";
  return (
    <section className="space-y-4 rounded-2xl border border-blue-100 bg-white p-4 sm:p-6">
      <h3 className="text-lg font-bold">
        {formatWarehouseInvestment(item.amount)} цэнэглэх
      </h3>
      {qr && item.qrText && (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-slate-50 p-5">
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG
              value={item.qrText}
              size={208}
              marginSize={2}
              title="Хөрөнгө оруулалт цэнэглэх QR"
            />
          </div>
          <p className="text-center text-sm text-slate-600">
            Банкны апп-аараа QR кодыг уншуулж төлнө үү.
          </p>
        </div>
      )}
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-slate-500">Хүлээн авагч</dt>
          <dd className="mt-1 break-words font-semibold">
            {item.accountHolder}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Банк / данс</dt>
          <dd className="mt-1 select-all break-all font-semibold">
            {item.bankName} · {item.accountNumber}
          </dd>
        </div>
        {!qr && (
          <div>
            <dt className="text-slate-500">
              Гүйлгээний утга — бүтнээр нь хуулна уу
            </dt>
            <dd className="mt-1 select-all break-all rounded-lg bg-blue-50 p-3 font-mono text-blue-800">
              {item.reference}
            </dd>
          </div>
        )}
      </dl>
      <p className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
        {qr
          ? "Зөвхөн энэ QR-аар төлсөн төлбөрийг автоматаар шалгана. Данс руу шууд шилжүүлэх бол «Дансаар» сонголтыг ашиглана уу."
          : "Дүн болон гүйлгээний утгыг зөв оруулна уу. Оператор дансаар орсон гүйлгээг шалгаж баталгаажуулсны дараа хөрөнгө оруулалт нэмэгдэнэ."}
      </p>
      <button
        type="button"
        onClick={onCheck}
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
      >
        {busy
          ? "Шалгаж байна…"
          : qr
            ? "Төлбөр шалгах"
            : "Баталгаажсан эсэхийг шалгах"}
      </button>
    </section>
  );
}
