import type { Metadata } from "next";
import {
  ExternalLink,
  Fingerprint,
  LocateFixed,
  Mail,
  MessageSquareMore,
  ShieldCheck,
  Smartphone,
  WalletCards,
  CheckCircle2,
  Clock3,
  Database,
  UserRoundCheck,
} from "lucide-react";
import { PolicySection } from "./_components/PolicySection";
import { PrivacyPolicyNav } from "./_components/PrivacyPolicyNav";
import { AccountDeletionForm } from "./_components/AccountDeletionForm";

const POLICY_URL = "https://mglstore.mn/privacy-policy";
const CONTACT_EMAIL = "bigservice1316@gmail.com";


export const metadata: Metadata = {
  title: "Нууцлалын бодлого | MGL Business",
  description:
    "MGL Business апп болон MGL Store платформын мэдээлэл цуглуулах, ашиглах, хамгаалах, хадгалах болон устгах бодлого.",
  alternates: { canonical: POLICY_URL },
  openGraph: {
    title: "MGL Business — Нууцлалын бодлого",
    description:
      "MGL Business апп хэрэглэгчийн мэдээллийг хэрхэн цуглуулж, ашиглаж, хамгаалдаг тухай.",
    url: POLICY_URL,
  },
};

const tableOfContents = [
  { number: "01", label: "Хамрах хүрээ", id: "scope" },
  { number: "02", label: "Цуглуулах мэдээлэл", id: "collected-information" },
  { number: "03", label: "Мэдээлэл ашиглах зорилго", id: "use-of-information" },
  { number: "04", label: "Төхөөрөмжийн зөвшөөрөл", id: "device-permissions" },
  { number: "05", label: "Мэдээлэл дамжуулах", id: "information-sharing" },
  { number: "06", label: "Хадгалалт ба хамгаалалт", id: "retention-and-security" },
  { number: "07", label: "Таны эрх", id: "your-rights" },
  { number: "08", label: "Бүртгэл, мэдээлэл устгах", id: "account-deletion" },
  { number: "09", label: "Хүүхдийн нууцлал", id: "children" },
  { number: "10", label: "Өөрчлөлт ба холбоо барих", id: "changes-and-contact" },
] as const;

const dataGroups = [
  {
    icon: Fingerprint,
    title: "Бүртгэл ба таних мэдээлэл",
    items:
      "Нэр, и-мэйл, утасны дугаар, хэрэглэгчийн ID, байгууллага ба албан үүрэг, шаардлагатай тохиолдолд регистрийн дугаар, төрсөн огноо, хүйс, профайлын зураг.",
  },
  {
    icon: LocateFixed,
    title: "Байршил ба хүргэлт",
    items:
      "Нарийвчилсан болон ойролцоо байршил, ирц бүртгэлийн бүс ба цаг, хүргэлтийн явцын байршил, хүргэлтийн хаяг, хот, дүүрэг, хороо, орц болон тоот.",
  },
  {
    icon: MessageSquareMore,
    title: "Хэрэглэгчийн үүсгэсэн агуулга",
    items:
      "Чат, дуут мессеж, дуудлагын техникийн мэдээлэл, нийтлэл, сэтгэгдэл, илгээсэн зураг, даалгаврын нотлох баримт болон дэмжлэгийн хүсэлт.",
  },
  {
    icon: WalletCards,
    title: "Арилжаа ба бизнесийн мэдээлэл",
    items:
      "Захиалга, бүтээгдэхүүн, агуулах, борлуулалт, төлбөрийн арга ба төлөв, QPay нэхэмжлэлийн лавлагаа, буцаалт, байгууллага болон ажилтны үйл ажиллагааны мэдээлэл.",
  },
  {
    icon: Smartphone,
    title: "Төхөөрөмж ба ашиглалтын мэдээлэл",
    items:
      "IP хаяг, user-agent, device ID, Firebase installation/push token, үйлдлийн систем, аппын хувилбар, session, login-ийн огноо, алдаа болон аюулгүй байдлын лог.",
  },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-slate-50">
      <header className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-amber-100/70 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-8 ring-amber-50">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
            MGL Business · MGL Store
          </p>
          <h1 className="relative mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Нууцлалын бодлого
          </h1>
          <p className="relative mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            MGL Business нь байгууллага, ажилтан, агуулах, борлуулалт,
            хүргэлт, ирц, даалгавар болон харилцаа холбоог нэг дор удирдах
            бизнесийн апп юм. Энэхүү бодлого нь бид таны мэдээлэлтэй хэрхэн
            харьцдагийг ил тод тайлбарлана.
          </p>
          <div className="relative mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            <span>Хүчин төгөлдөр болсон: 2026 оны 7 дугаар сарын 11</span>
            <span>Сүүлд шинэчилсэн: 2026 оны 7 дугаар сарын 11</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8 lg:py-14">
        <PrivacyPolicyNav items={tableOfContents} />

        <article className="rounded-3xl border border-slate-200 bg-white px-5 shadow-sm sm:px-8">
          <section aria-labelledby="privacy-summary" className="border-b border-slate-200 py-8 sm:py-10">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Товч бөгөөд ойлгомжтой</p>
                <h2 id="privacy-summary" className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Нууцлалын товч тойм</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-slate-500">Доорх нь хурдан ойлгоход зориулсан хураангуй. Дэлгэрэнгүй нөхцөл нь дараах бүх бүлэгт бий.</p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Database, title: "Зөвхөн хэрэгцээт мэдээлэл", text: "Үйлчилгээ ажиллуулах, хамгаалах болон хууль ёсны үүрэгт шаардлагатай мэдээллийг боловсруулна." },
                { icon: ShieldCheck, title: "Худалдахгүй", text: "Хувийн мэдээллийг гуравдагч этгээдийн сурталчилгааны зорилгоор худалдахгүй." },
                { icon: UserRoundCheck, title: "Таны хяналт", text: "Мэдээллээ засуулах, зөвшөөрлөө өөрчлөх, хуульд нийцүүлэн устгуулах хүсэлт гаргаж болно." },
                { icon: Clock3, title: "Хязгаартай хадгалалт", text: "Зорилго болон хууль ёсны хадгалалтын шаардлага дуусмагц устгах эсвэл таних боломжгүй болгоно." },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition-colors hover:border-amber-200 hover:bg-amber-50/50">
                  <Icon className="h-5 w-5 text-amber-700" aria-hidden="true" />
                  <h3 className="mt-3 font-bold text-slate-950">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
              <p>Энэхүү бодлого нь аппын бүх хувилбар, хэрэглэгчийн үүрэг болон идэвхжүүлсэн боломжуудын нийлбэр хүрээг тайлбарлана. Тухайн хэрэглэгч бүх төрлийн мэдээллийг заавал өгөхгүй.</p>
            </div>
          </section>
          <PolicySection id="scope" number="01" title="Хамрах хүрээ ба мэдээлэл хариуцагч">
            <p>
              Энэхүү бодлого нь Google Play болон бусад сувгаар түгээх
              <strong className="font-semibold text-slate-900"> MGL Business</strong> апп,
              <strong className="font-semibold text-slate-900"> MGL Store</strong> веб платформ,
              тэдгээрийн API болон холбогдох үйлчилгээний хэрэглэгчийн мэдээлэлд хамаарна.
              Мэдээллийг MGL Business / MGL Store үйлчилгээ хариуцан боловсруулна.
            </p>
            <p>
              Бид мэдээллийг таны зөвшөөрөл, тантай байгуулсан гэрээ/үйлчилгээний
              нөхцөлийг биелүүлэх хэрэгцээ, байгууллага болон системийн хууль ёсны
              ашиг сонирхол, мөн Монгол Улсын хууль тогтоомжид хүлээсэн үүрэгт
              үндэслэн боловсруулна. Зөвшөөрөл шаардсан тохиолдолд зорилго,
              мэдээллийн төрөл, ашиглах хугацааг боломжит хэмжээнд урьдчилан
              тайлбарлаж, зөвшөөрлөө буцаах боломж олгоно.
            </p>
            <p>
              Аппын зарим боломжийг байгууллагын админ идэвхжүүлж, ажилтны
              мэдээллийг байгууллагын эрх бүхий хэрэглэгч удирдаж болно. Энэ
              тохиолдолд тухайн байгууллага мөн өөрийн ажилтны мэдээллийг
              ашиглах зорилго, эрхийн талаар мэдээлэх үүрэгтэй.
            </p>
          </PolicySection>

          <PolicySection id="collected-information" number="02" title="Бидний цуглуулах мэдээлэл">
            <p>
              Таны ашигласан функц, байгууллагын тохиргоо болон өгсөн
              зөвшөөрлөөс хамааран дараах мэдээллийг цуглуулж, серверт
              дамжуулж эсвэл төхөөрөмж дээр хадгалж болно.
            </p>
            <div className="grid gap-3">
              {dataGroups.map(({ icon: Icon, title, items }) => (
                <div key={title} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-lg bg-amber-50 p-2 text-amber-700">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900">{title}</h3>
                      <p className="mt-1">{items}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p>
              Нууц үгийг ил текстээр хадгалахгүй; сервер талд hash хэлбэрээр
              боловсруулна. Банкны картын бүтэн дугаар, CVV кодыг MGL Business
              апп өөрөө хадгалах зориулалтгүй.
            </p>
          </PolicySection>

          <PolicySection id="use-of-information" number="03" title="Мэдээлэл ашиглах зорилго">
            <ul className="list-disc space-y-2 pl-5 marker:text-amber-500">
              <li>бүртгэл үүсгэх, OTP/нууц үгээр баталгаажуулах, session болон эрхийн түвшнийг удирдах;</li>
              <li>байгууллага, ажилтан, агуулах, бараа материал, захиалга, борлуулалт, төлбөр ба хүргэлтийн функцийг ажиллуулах;</li>
              <li>ажлын бүсэд ирц бүртгэх, хүргэлтийн явцыг харуулах болон байршилд суурилсан цагийн бүсийг тодорхойлох;</li>
              <li>чат, зураг, дуут мессеж, дуут дуудлага, даалгавар болон мэдэгдлийг хүргэх;</li>
              <li>хэрэглэгчийн сонголт, бүтээгдэхүүний харилцан үйлчлэлд тулгуурлан тохирох агуулга санал болгох;</li>
              <li>алдаа оношлох, гүйцэтгэл сайжруулах, шинэчлэлт шалгах, залилан болон зөвшөөрөлгүй хандалтаас хамгаалах;</li>
              <li>гэрээ, татвар, нягтлан бодох, маргаан шийдвэрлэх болон хууль ёсны үүргийг биелүүлэх.</li>
            </ul>
            <p>
              Бид хувийн мэдээллийг гуравдагч этгээдийн сурталчилгаанд худалдахгүй.
              Маркетингийн мэдээллийг зөвшөөрөлтэй тохиолдолд илгээж, зөвшөөрлөө
              цуцлах боломж олгоно.
            </p>
          </PolicySection>

          <PolicySection id="device-permissions" number="04" title="Төхөөрөмжийн зөвшөөрөл">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-900">
                    <th className="py-3 pr-4 font-bold">Зөвшөөрөл</th>
                    <th className="py-3 font-bold">Ашиглах шалтгаан</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 align-top">
                  <tr><td className="py-3 pr-4 font-semibold text-slate-800">Байршил</td><td className="py-3">Ирцийн бүс шалгах, хүргэлтийн байршил хуваалцах, газрын зураг болон цагийн бүс тодорхойлох.</td></tr>
                  <tr><td className="py-3 pr-4 font-semibold text-slate-800">Камер, зураг</td><td className="py-3">QR унших, профайл/нийтлэл/чат/даалгаварт зураг авах эсвэл сонгох.</td></tr>
                  <tr><td className="py-3 pr-4 font-semibold text-slate-800">Микрофон</td><td className="py-3">Дуут мессеж бичих болон апп доторх дуут дуудлага хийх.</td></tr>
                  <tr><td className="py-3 pr-4 font-semibold text-slate-800">Мэдэгдэл</td><td className="py-3">Чат, даалгавар, захиалга болон үйлчилгээний чухал өөрчлөлтийг push notification-оор хүргэх.</td></tr>
                  <tr><td className="py-3 pr-4 font-semibold text-slate-800">Биометр</td><td className="py-3">Төхөөрөмж дээр нэвтрэлт болон ирцийн үйлдлийг баталгаажуулах. Биометрийн загвар/өгөгдөл MGL серверт дамжихгүй.</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              Эдгээр зөвшөөрлийг функц ашиглах үед хүснэ. Та төхөөрөмжийн
              Settings хэсгээс зөвшөөрлийг өөрчилж болно; татгалзвал холбогдох
              функц ажиллахгүй байж болох ч боломжтой бусад үйлчилгээг ашиглаж болно.
            </p>
          </PolicySection>

          <PolicySection id="information-sharing" number="05" title="Мэдээлэл дамжуулах ба үйлчилгээ үзүүлэгчид">
            <p>Үйлчилгээ ажиллуулахад шаардлагатай хамгийн бага мэдээллийг дараах төрлийн үйлчилгээ үзүүлэгчидтэй дамжуулж болно:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-amber-500">
              <li><strong className="font-semibold text-slate-900">Google Firebase Cloud Messaging</strong> — төхөөрөмжийн push token, мэдэгдэл хүргэлт;</li>
              <li><strong className="font-semibold text-slate-900">QPay болон сонгосон банк/төлбөрийн үйлчилгээ</strong> — нэхэмжлэл үүсгэх, төлбөрийн төлөв баталгаажуулах;</li>
              <li><strong className="font-semibold text-slate-900">Verify.mn</strong> — хэрэглэгчийн санаачилсан утас/таних баталгаажуулалт;</li>
              <li><strong className="font-semibold text-slate-900">Supabase болон hosting/database дэд бүтэц</strong> — сервер, өгөгдлийн сан, зураг/видео хадгалалт ба хүргэлт;</li>
              <li>и-мэйл, хүргэлт болон техникийн дэмжлэгийн үйлчилгээ үзүүлэгчид — тухайн үйлчилгээг гүйцэтгэхэд шаардлагатай мэдээлэл.</li>
            </ul>
            <p>
              Мөн таны өөрийн санаачилсан үйлдэл (жишээлбэл төлбөр хийх,
              байгууллагатай чатлах), хууль ёсны шаардлага, эрх бүхий
              байгууллагын хүчин төгөлдөр хүсэлт, эсвэл хэрэглэгч ба системийн
              аюулгүй байдлыг хамгаалах үндэслэлээр мэдээлэл дамжуулж болно.
            </p>
            <p>
              Зарим үйлчилгээ үзүүлэгчийн сервер Монгол Улсаас гадна байрлаж
              болох тул мэдээлэл хил дамнан боловсруулагдаж болно. Ийм үед
              гэрээ, хандалтын хязгаарлалт болон зохистой техникийн хамгаалалтаар
              мэдээллийг зөвхөн тодорхой зорилгоор боловсруулах нөхцөлийг тавина.
            </p>
          </PolicySection>

          <PolicySection id="retention-and-security" number="06" title="Хадгалалт ба хамгаалалт">
            <p>
              Бүртгэлийн мэдээллийг таны account идэвхтэй байх хугацаанд;
              захиалга, төлбөр, гэрээ, ирц болон бизнесийн бүртгэлийг үйлчилгээ
              үзүүлэх, маргаан шийдвэрлэх, аудит, татвар/нягтлан бодох болон
              хуульд заасан хугацаанд хадгална. Push token, хүчингүй session,
              хугацаа дууссан баталгаажуулах token болон шаардлагагүй техникийн
              логийг үйл ажиллагааны хэрэгцээ дуусмагц устгах буюу таних
              боломжгүй болгоно.
            </p>
            <p>
              Мэдээлэл дамжуулахдаа HTTPS/TLS, нууц үгийн hash, access token,
              role-based access control, хандалтын хязгаарлалт болон audit/log
              зэрэг зохистой хамгаалалт ашиглана. Төхөөрөмж дээрх token болон
              нууц мэдээллийг secure storage-д хадгалахыг зорьдог. Гэвч ямар ч
              цахим систем эрсдэлгүй биш тул зөрчил илэрвэл эрсдэлийн хэмжээнд
              тохирсон арга хэмжээ авч, шаардлагатай талуудад мэдэгдэнэ.
            </p>
            <p>
              Хувийн мэдээлэлд нөлөөлөх аюулгүй байдлын зөрчил илэрвэл хүрээ,
              эрсдэлийг тогтоох, тархалтыг зогсоох, сэргээх, баримтжуулах арга
              хэмжээ авч, хуульд шаардсан тохиолдолд эрх бүхий байгууллага болон
              нөлөөлсөн хэрэглэгчид боломжит хугацаанд мэдэгдэнэ.
            </p>
          </PolicySection>

          <PolicySection id="your-rights" number="07" title="Таны эрх ба сонголт">
            <p>Холбогдох хууль болон байгууллагын хууль ёсны шаардлагын хүрээнд та:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-amber-500">
              <li>өөрийн мэдээлэлтэй танилцах, хуулбар авах, алдаатай мэдээллээ засуулах;</li>
              <li>зөвшөөрөлд үндэслэсэн боловсруулалтаас зөвшөөрлөө буцаах;</li>
              <li>маркетингийн мэдээллээс татгалзах, notification болон device permission-оо өөрчлөх;</li>
              <li>боломжтой тохиолдолд боловсруулалтыг хязгаарлуулах, мэдээлэл болон бүртгэлээ устгуулах хүсэлт гаргах эрхтэй.</li>
            </ul>
            <p>Хүсэлт гаргагчийн мэдээллийг хамгаалахын тулд бид бүртгэл эзэмшигч мөн эсэхийг OTP, бүртгэлтэй холбоо барих суваг эсвэл нэмэлт нотолгоогоор баталгаажуулж болно.</p>
            <p>
              Та хүсэлтийн шийдвэртэй санал нийлэхгүй бол эхлээд манай нууцлалын
              холбоо барих сувгаар дахин хянуулах, цаашлаад Монгол Улсын эрх бүхий
              байгууллага эсвэл шүүхэд хуульд заасан журмаар гомдол гаргах эрхтэй.
              Бид эрхээ хэрэгжүүлсний төлөө хэрэглэгчийг ялгаварлан гадуурхахгүй.
            </p>
          </PolicySection>

          <PolicySection id="account-deletion" number="08" title="Бүртгэл болон мэдээлэл устгах">
            <p>
              Apple App Store Guidelines болон хувийн мэдээлэл хамгаалах хуулийн хүрээнд
              хэрэглэгч нь өөрийн бүртгэл болон түүнд хамаарах хувийн мэдээллийг хүссэн
              үедээ системээс бүрмөсөн устгуулах бүрэн эрхтэй. Та доорх хэсэгт бүртгэлтэй
              и-мэйл эсвэл утасны дугаараа оруулж, нэг удаагийн нууц кодоор баталгаажуулан
              бүртгэлээ шууд автоматаар устгах боломжтой.
            </p>

            <div className="my-6">
              <AccountDeletionForm />
            </div>

            <h4 className="mt-6 font-bold text-slate-900">Устгах үйл явцын дараалал:</h4>
            <ol className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-slate-900">
              <li>Бүртгэл эзэмшигч нь и-мэйл эсвэл утсаар нэг удаагийн OTP кодоор эрхээ баталгаажуулна.</li>
              <li>Баталгаажсан даруйд бүртгэл идэвхгүй болж, идэвхтэй нэвтрэх сессүүд, push notification token-ууд болон хувийн мэдээллүүд устгагдана.</li>
              <li>Татвар, төлбөр тооцоо, нягтлан бодох, гэрээ болон хууль ёсны маргаан шийдвэрлэхэд заавал шаардлагатай түүхэн баримтуудыг зөвхөн хуульд заасан хугацаанд хувийн мэдээллээс нь салгаж (anonymized) хадгална.</li>
              <li>Устгагдсан бүртгэлийн и-мэйл/утасны дугаар чөлөөлөгдөх тул дараа нь хүсвэл шинээр бүртгэл үүсгэх боломж нээлттэй үлдэнэ.</li>
            </ol>
            <p>
              Account устгаснаар таны харьяалагдаж байсан байгууллагын хамтын бүртгэл болон
              бусад ажилтнуудад хамаарах бизнесийн баримт устахгүй бөгөөд таны хувийн
              таних мэдээлэл системээс бүрэн салгагдана.
            </p>
          </PolicySection>


          <PolicySection id="children" number="09" title="Хүүхдийн нууцлал">
            <p>
              MGL Business нь байгууллага болон ажил эрхлэлтийн зориулалттай,
              хүүхдэд чиглээгүй үйлчилгээ. Бид хүүхдийн хувийн мэдээллийг
              санаатай цуглуулахгүй. Хүүхдийн мэдээлэл зохих зөвшөөрөлгүй
              ирсэн гэж үзвэл нэн даруй бидэнтэй холбоо барина уу.
            </p>
          </PolicySection>

          <PolicySection id="changes-and-contact" number="10" title="Бодлогын өөрчлөлт ба холбоо барих">
            <p>
              Аппын боломж, үйлчилгээ үзүүлэгч эсвэл хууль эрх зүйн шаардлага
              өөрчлөгдвөл бодлогыг шинэчилж, “Сүүлд шинэчилсэн” огноог солино.
              Материаллаг өөрчлөлтийг боломжтой бол апп, веб эсвэл бүртгэлтэй
              холбоо барих сувгаар мэдэгдэнэ.
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <p className="font-bold text-slate-950">MGL Business / MGL Store</p>
              <p className="mt-1 text-slate-600">Нууцлалын асуудал хариуцсан холбоо</p>
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
