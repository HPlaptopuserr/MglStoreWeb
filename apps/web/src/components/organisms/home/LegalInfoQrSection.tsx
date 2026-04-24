import { QrGenerator } from "@mgl/ui";

const qrItems = [
  {
    title: "Хуулийн зөвлөгөө",
    url: "https://mglstore.mn/info/legal",
    cardClass: "border-amber-100 bg-amber-50/70",
    titleClass: "text-amber-900",
    qrColor: "#92400e",
  },
  {
    title: "Нягтлан, татвар",
    url: "https://mglstore.mn/info/accounting",
    cardClass: "border-sky-100 bg-sky-50/80",
    titleClass: "text-sky-900",
    qrColor: "#075985",
  },
  {
    title: "Хүний нөөц",
    url: "https://mglstore.mn/info/hr",
    cardClass: "border-fuchsia-100 bg-fuchsia-50/80",
    titleClass: "text-fuchsia-900",
    qrColor: "#86198f",
  },
];

export function LegalInfoQrSection() {
  return (
    <section className="pb-10">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto flex w-fit flex-wrap justify-center gap-4">
          {qrItems.map((item) => (
            <div
              key={item.url}
              className={`rounded-2xl border p-4 text-center shadow-sm ${item.cardClass}`}
            >
              <p className={`mb-3 text-sm font-black ${item.titleClass}`}>
                {item.title}
              </p>
              <QrGenerator
                value={item.url}
                size={160}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor={item.qrColor}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
