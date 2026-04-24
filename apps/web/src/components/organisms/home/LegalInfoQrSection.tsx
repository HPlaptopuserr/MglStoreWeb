import { QrGenerator } from "@mgl/ui";

const INFO_QR_URL = "https://mglstore.mn/info";

export function LegalInfoQrSection() {
  return (
    <section className="pb-10">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto w-fit rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
          <p className="mb-3 text-sm font-black text-slate-900">
            Хуулийн зөвлөгөө Багц
          </p>
          <QrGenerator
            value={INFO_QR_URL}
            size={160}
            level="H"
            includeMargin
            bgColor="#ffffff"
            fgColor="#0f172a"
          />
        </div>
      </div>
    </section>
  );
}
