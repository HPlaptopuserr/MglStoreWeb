import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Mail, ShieldCheck } from "lucide-react";
import { PolicySection } from "./_components/PolicySection";

const POLICY_URL = "https://mglstore.mn/privacy-policy";
const CONTACT_EMAIL = "bigservice1316@gmail.com";

export const metadata: Metadata = {
  title: "Нууцлалын бодлого | MGL Business",
  description:
    "MGL Business апп болон MGL Store платформын хэрэглэгчийн мэдээлэл хамгаалах нууцлалын бодлого.",
  alternates: { canonical: POLICY_URL },
  openGraph: {
    title: "MGL Business — Нууцлалын бодлого",
    description:
      "MGL Business апп хэрэглэгчийн мэдээллийг хэрхэн цуглуулж, ашиглаж, хамгаалдаг тухай.",
    url: POLICY_URL,
  },
};

const tableOfContents = [
  ["01", "Бидний цуглуулах мэдээлэл", "collected-information"],
  ["02", "Мэдээллийг ашиглах зорилго", "use-of-information"],
  ["03", "Мэдээлэл дамжуулах нөхцөл", "information-sharing"],
  ["04", "Хадгалалт ба хамгаалалт", "retention-and-security"],
  ["05", "Таны эрх ба мэдээлэл устгах", "your-rights"],
  ["06", "Хүүхдийн нууцлал", "children"],
  ["07", "Бодлогын өөрчлөлт", "changes"],
  ["08", "Холбоо барих", "contact"],
] as const;

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
            MGL Business · MGL Store
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Нууцлалын бодлого
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Энэхүү бодлого нь MGL Business мобайл апп болон MGL Store
            платформыг ашиглах үед таны мэдээллийг хэрхэн цуглуулж, ашиглаж,
            хадгалж, хамгаалахыг тайлбарлана.
          </p>
          <p className="mt-6 text-sm text-slate-500">
            Хүчин төгөлдөр болсон огноо: 2026 оны 7 дугаар сарын 11
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8 lg:py-14">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-36">
          <h2 className="text-sm font-bold text-slate-950">Агуулга</h2>
          <nav aria-label="Нууцлалын бодлогын агуулга" className="mt-4">
            <ol className="space-y-1">
              {tableOfContents.map(([number, label, id]) => (
                <li key={id}>
                  <Link
                    href={`#${id}`}
                    className="group flex items-start gap-3 rounded-lg px-2 py-2 text-sm leading-5 text-slate-600 transition-colors hover:bg-amber-50 hover:text-amber-800"
                  >
                    <span className="font-semibold text-slate-400 group-hover:text-amber-600">
                      {number}
                    </span>
                    {label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="rounded-2xl border border-slate-200 bg-white px-5 sm:px-8">
          <PolicySection id="collected-information" number="01" title="Бидний цуглуулах мэдээлэл">
            <p>Үйлчилгээний онцлогоос хамааран дараах мэдээллийг цуглуулж болно:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-amber-500">
              <li>нэр, утасны дугаар, и-мэйл хаяг болон бүртгэлийн мэдээлэл;</li>
              <li>байгууллага, дэлгүүр, бүтээгдэхүүн, захиалга, төлбөр болон хүргэлттэй холбоотой мэдээлэл;</li>
              <li>төхөөрөмжийн төрөл, үйлдлийн систем, IP хаяг, аппын хувилбар, алдаа болон ашиглалтын техникийн мэдээлэл;</li>
              <li>таны зөвшөөрлөөр сонгосон зураг, камер, файл эсвэл байршлын мэдээлэл.</li>
            </ul>
            <p>Бид үйлчилгээ үзүүлэхэд шаардлагатай хэмжээнээс илүү мэдээлэл цуглуулахыг зорьдоггүй.</p>
          </PolicySection>

          <PolicySection id="use-of-information" number="02" title="Мэдээллийг ашиглах зорилго">
            <ul className="list-disc space-y-2 pl-5 marker:text-amber-500">
              <li>бүртгэл үүсгэх, хэрэглэгчийг таних болон нэвтрэлтийг хамгаалах;</li>
              <li>захиалга, төлбөр, хүргэлт болон байгууллагын үйл ажиллагааг гүйцэтгэх;</li>
              <li>үйлчилгээний мэдэгдэл, дэмжлэг болон хүсэлтийн хариу хүргэх;</li>
              <li>аппын ажиллагаа, аюулгүй байдал, чанар болон хэрэглэгчийн туршлагыг сайжруулах;</li>
              <li>хууль, зохицуулалт болон залилангаас урьдчилан сэргийлэх шаардлагыг биелүүлэх.</li>
            </ul>
          </PolicySection>

          <PolicySection id="information-sharing" number="03" title="Мэдээлэл дамжуулах нөхцөл">
            <p>Бид таны хувийн мэдээллийг худалдахгүй. Үйлчилгээг ажиллуулахад шаардлагатай үед төлбөр, хүргэлт, үүлэн дэд бүтэц, баталгаажуулалт, алдааны хяналт зэрэг үйлчилгээ үзүүлэгчидтэй зөвхөн хэрэгцээт мэдээллийг дамжуулж болно.</p>
            <p>Мөн хуульд заасан шаардлага, эрх бүхий байгууллагын хүчин төгөлдөр хүсэлт, эсвэл хэрэглэгч болон платформын аюулгүй байдлыг хамгаалах үндэслэлээр мэдээлэл гаргаж өгч болно.</p>
          </PolicySection>

          <PolicySection id="retention-and-security" number="04" title="Хадгалалт ба хамгаалалт">
            <p>Мэдээллийг үйлчилгээ үзүүлэх, гэрээний болон хуульд заасан үүргийг биелүүлэхэд шаардагдах хугацаанд хадгална. Шаардлага дуусмагц мэдээллийг устгах эсвэл таних боломжгүй хэлбэрт шилжүүлнэ.</p>
            <p>Бид зөвшөөрөлгүй хандалт, өөрчлөлт, алдагдал болон задралаас хамгаалах зохистой техникийн болон зохион байгуулалтын арга хэмжээ авна. Гэхдээ интернэтээр дамжих аливаа мэдээллийн хамгаалалтыг абсолют байдлаар баталгаажуулах боломжгүй.</p>
          </PolicySection>

          <PolicySection id="your-rights" number="05" title="Таны эрх ба мэдээлэл устгах">
            <p>Та өөрийн мэдээлэлтэй танилцах, засах, хуулбар авах, боловсруулахыг хязгаарлуулах болон хуульд зөвшөөрсөн хүрээнд устгуулах хүсэлт гаргах эрхтэй.</p>
            <p>
              Бүртгэл болон холбогдох мэдээллээ устгуулах бол апп доторх тохиргоог ашиглах эсвэл
              {" "}<a className="font-semibold text-amber-700 underline decoration-amber-300 underline-offset-4 hover:text-amber-800" href={`mailto:${CONTACT_EMAIL}?subject=MGL%20Business%20-%20Мэдээлэл%20устгах%20хүсэлт`}>{CONTACT_EMAIL}</a>-д
              бүртгэлтэй утас/и-мэйл болон хүсэлтийн тайлбараа илгээнэ үү. Бид таны эрхийг баталгаажуулсны дараа хуульд хадгалах шаардлагатай мэдээллээс бусдыг устгана.
            </p>
          </PolicySection>

          <PolicySection id="children" number="06" title="Хүүхдийн нууцлал">
            <p>MGL Business нь бизнесийн зориулалттай үйлчилгээ бөгөөд хүүхдэд зориулагдаагүй. Бид хүүхдийн хувийн мэдээллийг санаатайгаар цуглуулахгүй. Хүүхдийн мэдээлэл зөвшөөрөлгүй ирсэн гэж үзвэл бидэнтэй холбоо барина уу.</p>
          </PolicySection>

          <PolicySection id="changes" number="07" title="Бодлогын өөрчлөлт">
            <p>Үйлчилгээ, хууль эрх зүйн шаардлага өөрчлөгдөхөд энэхүү бодлогыг шинэчилж болно. Материаллаг өөрчлөлтийн талаар апп, вебсайт эсвэл бүртгэлтэй холбоо барих сувгаар мэдэгдэж, шинэчилсэн огноог энэ хуудсанд байршуулна.</p>
          </PolicySection>

          <PolicySection id="contact" number="08" title="Холбоо барих">
            <p>Энэхүү бодлого болон таны мэдээлэлтэй холбоотой хүсэлт, асуултыг дараах сувгаар хүлээн авна:</p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <p className="font-bold text-slate-950">MGL Store / MGL Business</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="mt-3 flex w-fit items-center gap-2 font-semibold text-amber-700 hover:text-amber-800">
                <Mail className="h-4 w-4" aria-hidden="true" />
                {CONTACT_EMAIL}
              </a>
              <a href="https://mglstore.mn" className="mt-2 flex w-fit items-center gap-2 text-slate-600 hover:text-slate-950">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                mglstore.mn
              </a>
              <p className="mt-2 text-slate-600">Улаанбаатар, Монгол Улс</p>
            </div>
          </PolicySection>
        </article>
      </div>
    </div>
  );
}
