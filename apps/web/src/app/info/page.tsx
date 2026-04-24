import type { Metadata } from "next";

type PriceItem = {
  title: string;
  price: string;
  description?: string;
  points?: string[];
};

type PackageItem = {
  title: string;
  price: string;
  items: string[];
};

const consultationPrices: PriceItem[] = [
  {
    title: "Анхан шатны зөвлөгөө",
    price: "50,000 төгрөг",
    description:
      "Иргэнд хууль зүйн суурь ойлголт өгөх, ерөнхий чиглэл заах зорилготой.",
    points: [
      "Хууль зүйн энгийн асуултад хариулах",
      "Холбогдох хууль, эрх зүйн зохицуулалтыг тайлбарлах",
      "Иргэний эрх, үүргийг танилцуулах",
      "Цаашид авах арга хэмжээний талаар зөвлөмж өгөх",
    ],
  },
  {
    title: "Илүү нарийвчилсан зөвлөгөө",
    price: "70,000 төгрөг",
    description:
      "Тодорхой нөхцөл байдалд тулгуурлан гүнзгийрүүлсэн зөвлөгөө өгөх үйлчилгээ.",
    points: [
      "Гэрээ, бичиг баримтад дүн шинжилгээ хийх",
      "Тухайн асуудалд хууль зүйн дүгнэлт гаргах",
      "Эрсдэл, боломжийг тодорхойлох",
      "Боломжит шийдлүүдийг санал болгох",
    ],
  },
  {
    title: "Цагийн хөлсөөр",
    price: "100,000 төгрөг",
    description:
      "Хуульчийн ажилласан хугацаанд үндэслэн тооцох үйлчилгээ.",
    points: [
      "Бичиг баримт боловсруулах: өргөдөл, нэхэмжлэл, гомдол",
      "Шүүхийн бэлтгэл хийх",
      "Судалгаа, хууль шалгах",
    ],
  },
  {
    title: "Кейс",
    price: "120,000 төгрөг",
  },
];

const smallBusinessServices = [
  "Гэрээ хянах, боловсруулах",
  "Хууль зүйн асуултад хариулах",
  "Эрсдэлээс урьдчилан сэргийлэх",
  "Шаардлагатай бичиг баримт бэлтгэх",
];

const packages: PackageItem[] = [
  {
    title: "Багц 1",
    price: "250,000 төгрөг",
    items: [
      "5 удаагийн биечилсэн зөвлөгөө",
      "Цахимаар зөвлөгөө авах",
      "Гэрээ хянах, гэрээний драфт боловсруулах",
      "Тушаал, дотоод журам",
      "Өргөдөл, гомдол, хүсэлт, нэхэмжлэл гаргах",
      "Тусгай зөвшөөрөл",
    ],
  },
  {
    title: "Багц 2",
    price: "500,000 төгрөг",
    items: [
      "5 удаагийн биечилсэн зөвлөгөө",
      "Цахимаар зөвлөгөө авах",
      "Гэрээ хянах, гэрээний драфт боловсруулах",
      "Тушаал, дотоод журам",
      "Өргөдөл, гомдол, хүсэлт, нэхэмжлэл гаргах",
      "Тусгай зөвшөөрөл",
      "Иргэний хэрэг: нэхэмжлэлийн шаардлагаас хамаарна",
      "Эрүүгийн хэрэг",
    ],
  },
  {
    title: "Салбарын төлөөлөн удирдах зөвлөлийн гишүүнд үзүүлэх багц",
    price: "500,000 төгрөг",
    items: [
      "Бүрэн эрхийн хугацаанд биечилж зөвлөгөө авах",
      "Гэрээ хянах, гэрээний драфт боловсруулах",
      "Тушаал, дотоод журам",
      "Цахимаар зөвлөгөө авах",
    ],
  },
  {
    title: "Төлөөлөх зөвлөлийн гишүүнд үзүүлэх багц",
    price: "500,000 төгрөг",
    items: [
      "Бүрэн эрхийн хугацаанд биечилж зөвлөгөө авах",
      "Гэрээ хянах, гэрээний драфт боловсруулах",
      "Тушаал, дотоод журам",
      "Цахимаар зөвлөгөө авах",
      "Иргэний эрх зүйн хэрэг маргаанд үнийн дүнгээс хамааран оролцох",
    ],
  },
];

export const metadata: Metadata = {
  title: "Хуулийн зөвлөгөөний үнийн хөлс | MGL Store",
  description:
    "Хувийн хуульчийн хуулийн зөвлөгөөний үйлчилгээ, үнийн хөлс болон багцын мэдээлэл.",
};

export default function InfoPage() {
  return (
    <div className="min-h-screen bg-[#f8f4ec] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-amber-100 bg-white shadow-[0_24px_80px_rgba(92,64,32,0.12)]">
        <div className="relative isolate overflow-hidden bg-slate-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-amber-400/25 blur-3xl" />
          <div className="absolute -bottom-24 left-8 h-60 w-60 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-amber-300">
              Хувийн хуульч
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
              Хуулийн зөвлөгөөний үнийн хөлс болон задаргаа
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              QR код уншуулсан хэрэглэгчдэд хуулийн зөвлөгөөний үйлчилгээний
              үнэ, багц, хамрах ажлын мэдээллийг нэг дор харуулах хуудас.
            </p>
          </div>
        </div>

        <div className="space-y-10 p-5 sm:p-8 lg:p-10">
          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-600">
                  Үнийн мэдээлэл
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Зөвлөгөөний төрөл
                </h2>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {consultationPrices.map((item) => (
                <article
                  key={item.title}
                  className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-lg font-black text-slate-950">
                      {item.title}
                    </h3>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800">
                      {item.price}
                    </span>
                  </div>
                  {item.description && (
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {item.description}
                    </p>
                  )}
                  {item.points && (
                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      {item.points.map((point) => (
                        <li key={point} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-amber-50 p-5 sm:p-6">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-700">
              ЖДБ үйлчилгээ
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Жижиг, дунд бизнесүүд ихэвчлэн авдаг үйлчилгээ
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {smallBusinessServices.map((service) => (
                <div
                  key={service}
                  className="rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  {service}
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-600">
              Багц үйлчилгээ
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Багц болон 1 сараар авах задаргаа
            </h2>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {packages.map((pack) => (
                <article
                  key={pack.title}
                  className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-lg font-black text-slate-950">
                      {pack.title}
                    </h3>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-black text-white">
                      {pack.price}
                    </span>
                  </div>
                  <ol className="mt-4 space-y-3 text-sm text-slate-700">
                    {pack.items.map((item, index) => (
                      <li key={item} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-black text-amber-800">
                          {index + 1}
                        </span>
                        <span className="leading-6">{item}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
