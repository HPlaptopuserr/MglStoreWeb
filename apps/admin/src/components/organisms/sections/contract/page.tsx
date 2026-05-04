"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  CheckCircle2, PenTool, Eraser, Loader2, History, Edit,
  Check, Link as LinkIcon, Eye, Plus, Download,
  Upload, ToggleLeft, ToggleRight, Users, ClipboardList, XCircle, FileText, Building, Phone, Mail, Globe, X
} from "lucide-react";
import { adminFetch, API } from "@/lib/api";

const DEFAULT_CONTRACT_TEXT = `ХОЁР. ГЭРЭЕНИЙ ЗОРИЛГО
2.1. Энэхүү гэрээний зорилго нь Гишүүн байгууллагыг Холбооны бүрэлдэхүүнд элсүүлэх, гишүүнчлэлийн эрх, үүрэг, хариуцлагыг тодорхойлж, талуудын харилцааг зохицуулахад оршино.
2.2. Монгол эзэнтэй жижиг дунд бизнес эрхлэгчдийн нэгдсэн холбоо нь Монгол иргэний эзэмшилд байдаг жижиг, дунд бизнес эрхлэгчдийг нэгтгэж, тэдний эрх ашгийг хамгаалах, бизнесийн орчин бүрдүүлэх, хамтын хөгжлийг дэмжих зорилготой байгууллага мөн.
2.3. Гишүүн байгууллага нь Холбооны дүрэм, журам болон энэхүү гэрээний нөхцөлийг дагаж мөрдөхийг зөвшөөрч, гишүүнчлэлд элсэхийг хүссэн тул тохиролцоонд хүрч гэрээ байгуулж байна.

ГУРАВ. ГИШҮҮНЧЛЭЛИЙН ХУРААМЖ
3.1. Гишүүн нь доорх хураамжийн нэг сонголтыг сонгон гэрээ байгуулснаас хойш 5 /тав/ ажлын өдрийн дотор Холбооны дансанд шилжүүлэх үүрэгтэй.
☐ 6 сар (Хагас жилийн хураамж) 1,800,000₮
☐ 12 сар (Бүтэн жилийн хураамж) 3,000,000₮
3.2. Гишүүнчлэлийн хугацаа дуусахаас өмнө Гишүүн байгууллага дараагийн хугацааны хураамжийг төлсөн тохиолдолд гишүүнчлэл тасралтгүй үргэлжилнэ.
3.3. Хугацааг дуусгавар болгохоос 14 /арван дөрөв/ хоногийн өмнө сунгаагүй тохиолдолд гишүүнчлэл автоматаар дуусгавар болно.
3.4. Хураамжийг банкны шилжүүлгээр төлөх бөгөөд гүйлгээний утгад байгууллагын нэр болон гэрээний дугаарыг заавал бичнэ.
3.5. Аль нэг шалтгаанаар гэрээ цуцлагдсан тохиолдолд төлсөн хураамж буцаан олгогдохгүй.
3.6. Хураамжийн дүнд нэмэгдсэн өртгийн татвар (НӨАТ) орохгүй бөгөөд Гишүүн нь холбогдох татварыг өөрөө хариуцна.

ДӨРӨВ. ГИШҮҮНИЙ ЭРХ, ҮҮРЭГ
4.1. Гишүүн байгууллага нь гишүүнчлэлийн хураамжийг хугацаанд нь бүрэн төлсний үндсэн дээр дараах эрх эдэлнэ:
4.1.1. Салбар төлөөлөн удирдах гишүүний бүх эрхийг ижил эдлэх
4.1.2. Холбоонд төсөл хөтөлбөр санаачлах
4.1.3. Холбооноос санаачилсан төсөл удирдах
4.1.4. Холбооноос зарласан тендерт оролцох
4.1.5. MGL store вэбсайтад 20 хүртэлх төрлийн бараа бүтээгдэхүүн байршуулах мөн байгууллагын танилцуулага тавих
4.1.6. MGL-ын гишүүн байгууллага 20 хүртэлх бүтээгдэхүүн борлуулах
4.1.7. Үйлдвэрүүдийн нэгж хувьцаанд 2 дахин их хөрөнгө оруулах
4.1.8. Хүний нөөцийн болон хууль зүйн чиглэлээр үйлчилгээ авах
4.2. Дээрх эрхүүд нь гишүүнчлэлийн хугацаанд л хүчинтэй бөгөөд гэрээ дуусгавар болсноор автоматаар зогсоно.
4.3. Гишүүн байгууллага нь эрхээ бусдад шилжүүлэх, дамжуулах эрхгүй.
4.4. Гишүүн нь дараах үүргийг хүлээнэ:
4.4.1. ТУЗ-аас баталсан бодлогыг манлайлах
4.4.2. Салбаруудын хоорондын үйл ажиллагааг уялдуулах
4.4.3. Холбооны гишүүд дунд тендер зарлаж сонгон шалгаруулах
4.4.4. Холбооны гишүүдийн ашгийг хамгаалах төлөөлөх зөвлөлийн эрх үйл ажиллагаанд идэвхтэй оролцох
4.4.5. Гишүүнчлэлийн хураамжийг энэхүү гэрээнд заасан хугацаа болон нөхцөлийн дагуу бүрэн, цаг тухайд нь төлөх
4.4.6. Холбооны дүрэм, журам, шийдвэр болон энэхүү гэрээний нөхцөлийг бүрэн дагаж мөрдөх
4.4.7. MGL Store платформд байршуулсан бараа бүтээгдэхүүний мэдээллийг үнэн зөв, дутуу орхигдуулалгүй байршуулах
4.4.8. Холбооны нэр, брэнд, лого, бусад оюуны өмчийг зөвшөөрлийн хүрээнд ашиглах
4.4.9. Холбооны дотоод мэдээлэл, гишүүдийн хувийн болон байгууллагын мэдээллийг нууцлах
4.4.10. Бусад гишүүдтэй харилцан хүндэтгэлтэй, шударга, ёс зүйтэй харилцах.
4.4.11. Холбооны үйл ажиллагаа, зорилгын эсрэг чиглэсэн аливаа үйлдлээс татгалзах
4.4.12. Гэрээ байгуулахад ашигласан мэдээлэл (хаяг, холбогдох этгээд гэх мэт) өөрчлөгдсөн тохиолдолд 14 хоногийн дотор Холбоонд мэдэгдэх

ТАВ. ХОЛБООНЫ ЭРХ, ҮҮРЭГ
5.1. Холбооны эрх
5.1.1. Гишүүнчлэлийн хураамжийн нөхцөлийг жил бүр тогтоох буюу өөрчлөх тохиолдолд 30 хоногийн өмнө мэдэгдэнэ.
5.1.2. Гишүүн байгууллагын гэрээний үүргийн биелэлтийг хянах, шаардлагатай бол баримт бичиг, мэдээлэл хүсэх эрхтэй.
5.1.3. Дүрэм, журмыг зөрчсөн гишүүнд анхааруулга өгөх, тодорхой хугацаанд эрхийг нь түдгэлзүүлэх буюу гишүүнчлэлийг цуцлах эрхтэй.
5.1.4. MGL Store платформд байршуулсан стандарт хангаагүй, хуурамч мэдээлэл бүхий бараа бүтээгдэхүүнийг мэдэгдэлгүйгээр буулгах эрхтэй.
5.2. Холбооны үүрэг
5.2.1. Гишүүн байгууллагад энэхүү гэрээнд заасан бүх эрхийг бүрэн эдлүүлэх нөхцөлийг бүрдүүлэх.
5.2.2. Гишүүний мэдээллийг нууцлах, гуравдагч этгээдэд дамжуулахгүй байх.
5.2.3. Холбооны үйл ажиллагаа, шийдвэр, санхүүгийн байдлын талаар гишүүдэд ил тод мэдэгдэх.
5.2.4. Гишүүдийн санал, гомдлыг хүлээн авч, 14 ажлын өдрийн дотор хариу өгөх.
5.2.5. Гишүүнчлэлийн хураамж өөрчлөгдөх тохиолдолд 30 хоногийн өмнө бичгээр мэдэгдэх
5.2.6. MGL Store платформыг жилийн 97%-иас дээш ажиллагаатай байхаар хангах

ЗУРГАА. НУУЦЛАЛ
6.1. Талууд нь энэхүү гэрээтэй холбоотой болон гэрээний хэрэгжилтийн явцад олж авсан бизнесийн нууц, гишүүдийн мэдээлэл болон бусад нууцлалын мэдээллийг гуравдагч этгээдэд задруулахгүй байх үүрэгтэй.
6.2. Нууцлалын үүрэг нь гэрээ дуусгавар болсноос хойш 3 (гурван) жилийн турш хүчин төгөлдөр байна.
6.3. Монгол Улсын хууль тогтоомжоор шаардагдсан тохиолдолд мэдээлэл гаргаж өгөхийг нууцлалын зөрчил гэж үзэхгүй, гэвч нөгөө талд урьдчилан мэдэгдэх үүрэгтэй.
6.4. Нууцлалыг зөрчсөн тал нь учирсан хохирлыг бүрэн хариуцах бөгөөд нэмж Холбоо нь нааш цааш тийш арга хэмжээ авах эрхтэй.

ДОЛОО. ГЭРЭЭ ЦУЦЛАХ БОЛОН ГИШҮҮНЧЛЭЛ ЗОГСООХ
7.1. Дараах тохиолдолд Холбоо нь Гишүүний эрхийг түр зогсоож болно:
7.1.1. Хураамж төлөгдөөгүй буюу хугацаа хэтэрсэн тохиолдолд хугацааг дуусгавар болтол.
7.1.2. Гэрээний үүргийг зөрчсөн тохиолдолд зөрчил арилах хүртэл.
7.1.3. Холбооны нэр хүндэд хохирол учруулсан буюу учруулж болзошгүй нөхцөл үүссэн тохиолдолд.
7.2. Дараах тохиолдолд гэрээ дуусгавар болно:
7.2.1. Гишүүнчлэлийн хугацаа дуусч, цаг тухайд нь сунгагдаагүй тохиолдолд.
7.2.2. Гишүүн байгууллага 30 (гуч) хоногийн өмнө бичгээр мэдэгдэн гэрээг цуцласан тохиолдолд.
7.2.3. Холбоо нь дараах тохиолдолд гишүүнчлэлийг цуцлах эрхтэй: хураамжийн өрийг 30 хоног давсан; дүрэм журмыг давтан зөрчсөн; байгууллага татан буугдсан; хууль бус үйл ажиллагаа явуулсан нь тогтоогдсон.
7.2.4. Харилцан тохиролцсоны үндсэн дээр.
7.2.5. Гэрээ дуусгавар болсон тохиолдолд Гишүүн нь Холбооны бүх эрхийн хэрэглэлт, платформ хандах эрхийг нэн даруй зогсоох үүрэгтэй.
7.2.6. Гэрээ дуусгавар болсон тохиолдолд төлсөн хураамж буцаан олгогдохгүй.

НАЙМ. МАРГААН ШИЙДВЭРЛЭХ
8.1. Энэхүү гэрээтэй холбоотой аливаа маргааныг талууд эхлээд харилцан яриа, хэлэлцээрийн замаар шийдвэрлэхийг эрмэлзэнэ.
8.2. Маргааны тухай нэг тал нөгөөд бичгээр мэдэгдснээс хойш 30 (гуч) хоногийн дотор харилцан тохиролцоонд хүрч чадаагүй тохиолдолд маргааныг Монгол Улсын Арбитрийн хуульд заасны дагуу арбитрын журмаар шийдвэрлэнэ.
8.3. Арбитрын шийдвэр нь эцэслэн шийдэгдсэн, хоёр талд тус адил заавал биелүүлэх шинжтэй байна.
8.4. Арбитрын ажиллагааны хугацаанд гэрээний хэрэгжилт тасалдахгүй үргэлжилнэ.

ЕС. БУСАД НӨХЦӨЛ
9.1. Энэхүү гэрээ нь Монгол Улсын хуулийн дагуу зохицуулагдана.
9.2. Гэрээнд нэмэлт өөрчлөлт оруулах бол талуудын бичгэн тохиролцоогоор хийх бөгөөд нэмэлт, өөрчлөлт нь гэрээний салшгүй хэсэг болно.
9.3. Гэрээний аль нэг заалт хүчингүй болсон нь бусад заалтуудын хүчин төгөлдөр байдалд нөлөөлөхгүй.
9.4. Энэхүү гэрээг 2 (хоёр) хувь үйлдэж, тал бүр нэг хувийг хадгална. Хоёр хувь нь тус адил хүчинтэй.
9.5. Гэрээтэй холбоотой бүх мэдэгдэл, захидал харилцааг гэрээнд заасан хаяг болон и-мэйлээр явуулна. Мэдэгдэл нь и-мэйлээр явуулсан өдрөөс, бичгээр илгээсэн бол хүлээн авсан өдрөөс эхлэн хүчинтэй тооцогдоно.
9.6. Монгол хэл дээр үйлдэгдсэн гэрээний хувь нь эх хувь байна.`;

const DEFAULT_FEE_PLANS = [
  { key: "6m", label: "6 сар", sublabel: "Хагас жил", price: 1_800_000 },
  { key: "12m", label: "12 сар", sublabel: "Бүтэн жил", price: 3_000_000 },
];

// ─── Signature canvas hook ───────────────────────────────────────────────────
function useSignatureCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = ref.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
  };

  const initCtx = () => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) { ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1e3a5f"; }
    return ctx;
  };

  const start = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = initCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath(); ctx.moveTo(x, y);
    drawing.current = true;
  };

  const move = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y); ctx.stroke();
    setHasSignature(true);
  };

  const end = () => { drawing.current = false; };

  const clear = () => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const getDataUrl = () => ref.current?.toDataURL("image/png") || "";

  return { ref, start, move, end, clear, hasSignature, getDataUrl };
}

// ─── Root component ──────────────────────────────────────────────────────────
export function Contract() {
  const [activeTab, setActiveTab] = useState<"history" | "editor" | "preview">("history");
  const [settings, setSettings] = useState({
    presidentName: "Батбаяр Хишигжаргал",
    presidentTitle: "Хуулийн зөвлөх",
    orgName: "Монгол эзэнтэй ЖДБ эрхлэгчдийн нэгдсэн холбоо",
    content: DEFAULT_CONTRACT_TEXT,
    isPaid: false,
    defaultFeePlan: "6m",
    feePlans: DEFAULT_FEE_PLANS as { key: string; label: string; sublabel: string; price: number }[],
  });
  const [contracts, setContracts] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, signed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminFetch(`${API}/contracts`).then(r => r.json()),
      adminFetch(`${API}/contracts/stats`).then(r => r.json()),
    ]).then(([cd, sd]) => {
      if (cd.success) setContracts(cd.contracts);
      if (sd.success) setStats({ total: sd.total, signed: sd.signed, pending: sd.pending });
    }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Цахим гэрээний удирдлага</h1>
          <p className="text-neutral-500 mt-1">Гэрээ үүсгэх, илгээх линк авах, загвар өөрчлөх.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Нийт гэрээ", value: stats.total, icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
          { label: "Баталгаажсан", value: stats.signed, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
          { label: "Хүлээгдэж буй", value: stats.pending, icon: Users, color: "text-amber-600 bg-amber-50" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-neutral-200 rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-900">{s.value}</div>
              <div className="text-sm text-neutral-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 bg-neutral-100 p-1.5 rounded-xl w-max">
        {([["history", History, "Илгээсэн гэрээнүүд"], ["editor", Edit, "Гэрээний загвар засах"], ["preview", Eye, "Урьдчилан харах"]] as const).map(([tab, Icon, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? "bg-white text-blue-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {activeTab === "history" && <ContractHistoryTab contracts={contracts} setContracts={setContracts} loading={loading} setStats={setStats} settings={settings} />}
      {activeTab === "editor" && <ContractEditorTab settings={settings} setSettings={setSettings} setContracts={setContracts} setActiveTab={setActiveTab} setStats={setStats} />}
      {activeTab === "preview" && <ContractPreviewTab settings={settings} />}
    </div>
  );
}

// ─── Contract Detail Modal ────────────────────────────────────────────────────
function ContractDetailModal({ contractId, onClose, settings }: { contractId: string; onClose: () => void; settings: any }) {
  const [detail, setDetail] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  useEffect(() => {
    adminFetch(`${API}/contracts/${contractId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setDetail(d.contract);
          // If template → fetch submissions
          if (d.contract.isTemplate) {
            setLoadingSubs(true);
            adminFetch(`${API}/contracts/${contractId}/submissions`)
              .then(r2 => r2.json())
              .then(d2 => { if (d2.success) setSubmissions(d2.submissions); })
              .catch(() => {})
              .finally(() => setLoadingSubs(false));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contractId]);

  const member = detail?.memberData as any;
  const feePlanLabel = (key: string | null) => {
    const p = settings.feePlans.find((f: any) => f.key === key);
    return p ? `${p.label} — ${p.price.toLocaleString()}₮` : "—";
  };
  const base = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3001";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-[#1e4e8c]">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-white" />
            <div>
              <h2 className="font-bold text-white text-lg">{member?.name || "Гэрээний дэлгэрэнгүй"}</h2>
              <p className="text-blue-200 text-xs">MGL-{contractId.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center text-neutral-500">Мэдээлэл олдсонгүй</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

            {/* Status + actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {detail.status === "SIGNED" && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">✓ Баталгаажсан</span>}
                {detail.status === "PENDING" && <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">⏳ Хүлээгдэж буй</span>}
                {detail.isPaid && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Төлбөртэй</span>}
              </div>
              <div className="flex gap-2">
                {detail.status === "SIGNED" && (
                  <button onClick={() => window.open(`${base}/contract/sign/${contractId}?print=1`, "_blank")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    <Download className="w-4 h-4" /> PDF татах
                  </button>
                )}
                {detail.status === "PENDING" && (
                  <button onClick={() => { navigator.clipboard.writeText(`${base}/contract/sign/${contractId}`); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
                    <LinkIcon className="w-4 h-4" /> Линк хуулах
                  </button>
                )}
              </div>
            </div>

            {/* Contract meta */}
            <div className="grid grid-cols-2 gap-3">
              {[[
                "Гэрээний дугаар", `MGL-${contractId.slice(0, 8).toUpperCase()}`
              ], [
                "Хураамж", feePlanLabel(detail.feePlan)
              ], [
                "Баталгаажсан огноо", detail.signedAt ? new Date(detail.signedAt).toLocaleString("mn-MN") : "—"
              ], [
                "Гэрээний хугацаа", settings.feePlans.find((f: any) => f.key === detail.feePlan)?.label ?? "—"
              ]].map(([label, value]) => (
                <div key={label} className="bg-neutral-50 border border-neutral-100 rounded-xl p-4">
                  <div className="text-xs text-neutral-500 mb-1">{label}</div>
                  <div className="font-semibold text-neutral-800 text-sm">{value}</div>
                </div>
              ))}
            </div>

            {/* Member info */}
            {member && (
              <div className="bg-white border border-[#b4c6e7] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#f0f4ff] border-b border-[#b4c6e7] flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#1e4e8c]" />
                  <span className="font-semibold text-[#1e4e8c] text-sm">Гишүүн байгууллагын мэдээлэл</span>
                </div>
                <div className="divide-y divide-neutral-100">
                  {([
                    ["Байгууллагын нэр", member.name],
                    ["Регистрийн дугаар", member.register],
                    ["Үйл ажиллагааны чиглэл", member.field],
                    ["Хаяг", member.address],
                    ["Утас", member.phone],
                    ["И-мэйл", member.email],
                    ["Вэбсайт", member.website],
                    ["Нэр", member.director],
                  ] as [string, string][]).filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} className="flex px-4 py-2.5 gap-4">
                      <span className="text-xs text-neutral-500 w-40 flex-shrink-0 pt-0.5">{label}</span>
                      <span className="text-sm text-neutral-800 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signatures — only for non-template submissions */}
            {!detail.isTemplate && (
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-[#b4c6e7] rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-[#f0f4ff] border-b border-[#b4c6e7]">
                    <span className="text-xs font-semibold text-[#1e4e8c]">ХОЛБООНЫ ГАРЫН ҮСЭГ</span>
                  </div>
                  <div className="p-3 bg-neutral-50 h-24 flex items-center justify-center">
                    {detail.adminSignature
                      ? <img src={detail.adminSignature} alt="Admin гарын үсэг" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                      : <span className="text-xs text-neutral-400">Байхгүй</span>}
                  </div>
                  {detail.adminTitle && <div className="px-3 py-2 text-xs text-center text-[#c00000] border-t border-[#b4c6e7]">{detail.adminTitle}</div>}
                </div>
                <div className="border border-[#b4c6e7] rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-[#f0f4ff] border-b border-[#b4c6e7]">
                    <span className="text-xs font-semibold text-[#1e4e8c]">ГИШҮҮНИЙ ГАРЫН ҮСЭГ</span>
                  </div>
                  <div className="p-3 bg-neutral-50 h-24 flex items-center justify-center">
                    {detail.memberSignature
                      ? <img src={detail.memberSignature} alt="Member гарын үсэг" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                      : <span className="text-xs text-neutral-400">{detail.status === "PENDING" ? "Гарын үсэг зураагүй" : "Байхгүй"}</span>}
                  </div>
                  {member?.director && <div className="px-3 py-2 text-xs text-center text-neutral-600 border-t border-[#b4c6e7]">{member.director}</div>}
                </div>
              </div>
            )}

            {/* Submissions list — shown when viewing a template */}
            {detail.isTemplate && (
              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                  <span className="font-semibold text-neutral-800 text-sm">Бөглөсөн гишүүд</span>
                  <div className="flex gap-3 text-xs">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      {submissions.filter(s => s.status === "SIGNED").length} баталгаажсан
                    </span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                      {submissions.filter(s => s.status === "PENDING").length} хүлээгдэж буй
                    </span>
                  </div>
                </div>
                {loadingSubs ? (
                  <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
                ) : submissions.length === 0 ? (
                  <div className="py-8 text-center text-neutral-400 text-sm">Одоогоор бөглөсөн хүн байхгүй байна.</div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {submissions.map(s => (
                      <div key={s.id}>
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
                          onClick={() => setExpandedSub(expandedSub === s.id ? null : s.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "SIGNED" ? "bg-green-500" : "bg-amber-400"}`} />
                            <div>
                              <div className="font-medium text-neutral-800 text-sm">{(s.memberData as any)?.name || "Тодорхойгүй"}</div>
                              <div className="text-xs text-neutral-400">{s.date}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {s.status === "SIGNED"
                              ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Баталгаажсан</span>
                              : <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Хүлээгдэж буй</span>}
                            <Eye className="w-3.5 h-3.5 text-neutral-400" />
                          </div>
                        </button>
                        {expandedSub === s.id && (
                          <div className="px-4 pb-3 bg-neutral-50/50 border-t border-neutral-100">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 text-xs">
                              {([
                                ["Байгууллагын нэр", (s.memberData as any)?.name],
                                ["Регистр", (s.memberData as any)?.register],
                                ["Утас", (s.memberData as any)?.phone],
                                ["И-мэйл", (s.memberData as any)?.email],
                                ["Хаяг", (s.memberData as any)?.address],
                                ["Үйл ажиллагаа", (s.memberData as any)?.field],
                              ] as [string, string][]).filter(([, v]) => v).map(([label, value]) => (
                                <div key={label}>
                                  <span className="text-neutral-400">{label}: </span>
                                  <span className="font-medium text-neutral-700">{value}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => { const base = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3001"; window.open(`${base}/contract/sign/${s.id}?print=1`, "_blank"); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" /> PDF
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}


// ─── History tab ─────────────────────────────────────────────────────────────
function ContractHistoryTab({
  contracts, setContracts, loading, setStats, settings
}: {
  contracts: any[],
  setContracts: React.Dispatch<React.SetStateAction<any[]>>,
  loading: boolean,
  setStats: React.Dispatch<React.SetStateAction<any>>,
  settings: any,
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    const base = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3001";
    navigator.clipboard.writeText(`${base}/contract/sign/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadPdf = (c: any) => {
    if (c.pdfUrl) {
      window.open(c.pdfUrl, "_blank");
    } else {
      const base = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3001";
      window.open(`${base}/contract/sign/${c.id}?print=1`, "_blank");
    }
  };

  const feePlanLabel = (key: string | null) => {
    const p = settings.feePlans.find((f: any) => f.key === key);
    return p ? `${p.label} — ${p.price.toLocaleString()}₮` : "—";
  };

  return (
    <>
      {detailId && (
        <ContractDetailModal contractId={detailId} onClose={() => setDetailId(null)} settings={settings} />
      )}

      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-neutral-200 flex justify-between items-center bg-neutral-50/50">
          <h3 className="font-bold text-lg text-neutral-800">Бүртгэлтэй гэрээнүүд</h3>
          <NewContractButton settings={settings} setContracts={setContracts} setStats={setStats} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Байгууллага</th>
                <th className="px-6 py-4 font-semibold">Төлөв</th>
                <th className="px-6 py-4 font-semibold">Хураамж</th>
                <th className="px-6 py-4 font-semibold">Үүсгэсэн хүн</th>
                <th className="px-6 py-4 font-semibold">Огноо</th>
                <th className="px-6 py-4 font-semibold text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-neutral-400" /></td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-500">Одоогоор илгээсэн гэрээ байхгүй байна.</td></tr>
              ) : contracts.map(c => (
                <tr key={c.id} className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => setDetailId(c.id)}>
                  <td className="px-6 py-4 font-medium text-neutral-900 max-w-[180px] truncate">{c.org}</td>
                  <td className="px-6 py-4">
                    {c.status === "PENDING" && <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">Хүлээгдэж буй</span>}
                    {c.status === "SIGNED" && <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Баталгаажсан</span>}
                    {c.status === "TAMPERED" && <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Алдаатай</span>}
                    {c.isPaid && <span className="ml-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Төлбөртэй</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{feePlanLabel(c.feePlan)}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{c.createdBy}</td>
                  <td className="px-6 py-4 text-sm text-neutral-500">{c.date}</td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setDetailId(c.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 transition-colors">
                        <Eye className="w-4 h-4" /> Дэлгэрэнгүй
                      </button>
                      {c.status === "SIGNED" && (
                        <button onClick={() => handleDownloadPdf(c)} title="PDF татах"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-green-200 rounded-lg text-sm text-green-700 hover:bg-green-50 transition-colors">
                          <Download className="w-4 h-4" /> PDF
                        </button>
                      )}
                      {c.status === "PENDING" && (
                        <button onClick={() => handleCopy(c.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 transition-colors">
                          {copiedId === c.id ? <Check className="w-4 h-4 text-green-600" /> : <LinkIcon className="w-4 h-4" />}
                          {copiedId === c.id ? <span className="text-green-600 font-medium">Хуулсан</span> : "Link"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── New contract button with signature modal ─────────────────────────────────
function NewContractButton({ settings, setContracts, setStats }: {
  settings: any,
  setContracts: React.Dispatch<React.SetStateAction<any[]>>,
  setStats: React.Dispatch<React.SetStateAction<any>>,
}) {
  const [open, setOpen] = useState(false);
  const [feePlan, setFeePlan] = useState(settings.defaultFeePlan || "6m");
  const [creating, setCreating] = useState(false);
  const sig = useSignatureCanvas();

  const handleCreate = async () => {
    if (!sig.hasSignature) { alert("Гарын үсэг зурна уу"); return; }
    setCreating(true);
    try {
      const res = await adminFetch(`${API}/contracts`, {
        method: "POST",
        body: JSON.stringify({ feePlan: settings.isPaid ? feePlan : null, isPaid: settings.isPaid, adminSignature: sig.getDataUrl(), adminName: settings.presidentName, adminTitle: settings.presidentTitle }),
      });
      const data = await res.json();
      if (data.success) {
        setContracts(prev => [data.contract, ...prev]);
        setStats((s: any) => ({ ...s, total: s.total + 1, pending: s.pending + 1 }));
        setOpen(false);
        sig.clear();
      } else {
        alert(data.error || "Алдаа гарлаа");
      }
    } catch { alert("Гэрээ үүсгэхэд алдаа гарлаа"); }
    finally { setCreating(false); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
        <Plus className="w-4 h-4" /> Шинэ гэрээ үүсгэх
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-neutral-900">Шинэ гэрээ үүсгэх</h3>
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-neutral-100 rounded-lg"><XCircle className="w-5 h-5 text-neutral-400" /></button>
            </div>

            {settings.isPaid && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Хураамжийн сонголт</label>
                <div className="grid grid-cols-2 gap-3">
                  {settings.feePlans.map((p: any) => (
                    <button key={p.key} type="button" onClick={() => setFeePlan(p.key)}
                      className={`flex flex-col items-center p-4 border-2 rounded-xl text-sm transition-colors ${feePlan === p.key ? "border-blue-500 bg-blue-50 text-blue-700" : "border-neutral-200 hover:border-neutral-300"}`}>
                      <span className="font-bold text-base">{p.label}</span>
                      <span className="text-xs text-neutral-500">{p.sublabel}</span>
                      <span className="font-semibold mt-1">{p.price.toLocaleString()}₮</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Гарын үсэг <span className="text-red-500">*</span>
                <span className="text-xs text-neutral-400 ml-2">(заавал шаардлагатай)</span>
              </label>
              <div className="border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 relative" style={{ height: 120 }}>
                <canvas
                  ref={sig.ref} width={600} height={120}
                  className="absolute inset-0 w-full h-full touch-none"
                  style={{ cursor: "crosshair" }}
                  onMouseDown={sig.start} onMouseMove={sig.move} onMouseUp={sig.end} onMouseLeave={sig.end}
                  onTouchStart={sig.start} onTouchMove={sig.move} onTouchEnd={sig.end}
                />
                {!sig.hasSignature && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-neutral-400 pointer-events-none select-none">
                    <PenTool className="w-5 h-5" />
                    <span className="text-xs">Энд гарын үсэг зурна уу</span>
                  </div>
                )}
                {sig.hasSignature && (
                  <button type="button" onClick={sig.clear} className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-500 hover:text-red-500 z-10 shadow-sm">
                    <Eraser className="w-3 h-3" /> Арилгах
                  </button>
                )}
              </div>
            </div>

            <button onClick={handleCreate} disabled={creating || !sig.hasSignature}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Үүсгэж байна...</> : <><Plus className="w-4 h-4" /> Гэрээ үүсгэх</>}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Editor tab ───────────────────────────────────────────────────────────────
function ContractEditorTab({
  settings, setSettings, setContracts, setActiveTab, setStats
}: {
  settings: any,
  setSettings: any,
  setContracts: React.Dispatch<React.SetStateAction<any[]>>,
  setActiveTab: React.Dispatch<React.SetStateAction<"history" | "editor" | "preview">>,
  setStats: React.Dispatch<React.SetStateAction<any>>,
}) {
  const [saving, setSaving] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [adminStamp, setAdminStamp] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);
  const sig = useSignatureCanvas();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      if (file.name.endsWith(".txt")) {
        const text = await file.text();
        setSettings((prev: any) => ({ ...prev, content: text }));
      } else if (file.name.endsWith(".docx")) {
        const buf = await file.arrayBuffer();
        // mammoth browser bundle
        const mammoth = (await import("mammoth/mammoth.browser.js" as any)) as any;
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        setSettings((prev: any) => ({ ...prev, content: result.value }));
      } else {
        alert(".txt эсвэл .docx файл сонгоно уу");
      }
    } catch (err) {
      console.error("import error", err);
      alert("Файл уншихад алдаа гарлаа. .txt эсвэл .docx файл сонгоно уу.");
    }
    finally { setImportLoading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleSave = async () => {
    if (!sig.hasSignature) { alert("Гэрээ байгуулагчийн гарын үсэг зурна уу"); return; }
    setSaving(true);
    try {
      const res = await adminFetch(`${API}/contracts`, {
        method: "POST",
        body: JSON.stringify({
          feePlan: settings.isPaid ? settings.defaultFeePlan : null,
          isPaid: settings.isPaid,
          adminSignature: sig.getDataUrl(),
          adminName: settings.presidentName || null,
          adminTitle: settings.presidentTitle || null,
          adminStamp: adminStamp || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContracts(prev => [data.contract, ...prev]);
        setStats((s: any) => ({ ...s, total: s.total + 1, pending: s.pending + 1 }));
        alert("Гэрээний тохиргоо хадгалагдаж, шинэ линк үүслээ!");
        setActiveTab("history");
      } else {
        alert(data.error || "Алдаа гарлаа");
      }
    } catch { alert("Алдаа гарлаа"); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm flex flex-col">
      <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
        <h3 className="font-bold text-neutral-800 flex items-center gap-2">
          <Edit className="w-5 h-5 text-blue-600" /> Гэрээний тохиргоо & Загвар
        </h3>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Хадгалж байна...</> : "Хадгалах & Линк үүсгэх"}
        </button>
      </div>

      <div className="p-6 border-b border-neutral-100 grid grid-cols-1 md:grid-cols-3 gap-6 bg-neutral-50/30">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Овог нэр</label>
          <input type="text" value={settings.presidentName} onChange={e => setSettings({ ...settings, presidentName: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Албан тушаал</label>
          <input type="text" value={settings.presidentTitle} onChange={e => setSettings({ ...settings, presidentTitle: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Байгууллагын нэр</label>
          <input type="text" value={settings.orgName} onChange={e => setSettings({ ...settings, orgName: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Холбооны тамга (зураг)</label>
          <input ref={stampRef} type="file" accept="image/*" className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = ev => setAdminStamp(ev.target?.result as string);
              reader.readAsDataURL(file);
            }}
          />
          <div
            onClick={() => stampRef.current?.click()}
            className="w-full border-2 border-dashed border-neutral-300 rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
          >
            {adminStamp ? (
              <>
                <img src={adminStamp} alt="Тамга" className="h-16 max-w-[160px] object-contain mix-blend-multiply" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-neutral-700">Тамга upload хийгдсэн</div>
                  <button type="button" onClick={e => { e.stopPropagation(); setAdminStamp(null); }}
                    className="text-xs text-red-400 hover:text-red-500 mt-1">Хасах</button>
                </div>
              </>
            ) : (
              <div className="text-sm text-neutral-400">Тамганы зураг енд дарна upload хийх (PNG / JPG)</div>
            )}
          </div>
        </div>
      </div>

      {/* Payment settings */}
      <div className="p-6 border-b border-neutral-100 bg-neutral-50/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-medium text-neutral-800">Хураамжийн тохиргоо</div>
            <div className="text-sm text-neutral-500 mt-0.5">Гэрээнд төлбөр шаардах эсэхийг тохируулна</div>
          </div>
          <button type="button" onClick={() => setSettings({ ...settings, isPaid: !settings.isPaid })}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${settings.isPaid ? "border-blue-500 bg-blue-50 text-blue-700" : "border-neutral-200 text-neutral-600"}`}>
            {settings.isPaid ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            {settings.isPaid ? "Төлбөртэй" : "Төлбөргүй"}
          </button>
        </div>

        {settings.isPaid && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-3">Хураамжийн төлөвлөгөө засах</label>
              <div className="flex flex-col gap-3">
                {settings.feePlans.map((p: any, idx: number) => (
                  <div key={p.key} className="flex items-center gap-3 p-3 border border-neutral-200 rounded-xl bg-neutral-50/50">
                    <div className="flex flex-col gap-1 flex-1">
                      <input
                        value={p.label}
                        onChange={e => {
                          const updated = settings.feePlans.map((fp: any, i: number) => i === idx ? { ...fp, label: e.target.value } : fp);
                          setSettings({ ...settings, feePlans: updated });
                        }}
                        placeholder="Нэр (жш: 6 сар)"
                        className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <input
                        value={p.sublabel}
                        onChange={e => {
                          const updated = settings.feePlans.map((fp: any, i: number) => i === idx ? { ...fp, sublabel: e.target.value } : fp);
                          setSettings({ ...settings, feePlans: updated });
                        }}
                        placeholder="Тайлбар (жш: Хагас жил)"
                        className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={p.price}
                          min={0}
                          step={10000}
                          onChange={e => {
                            const updated = settings.feePlans.map((fp: any, i: number) => i === idx ? { ...fp, price: Number(e.target.value) } : fp);
                            setSettings({ ...settings, feePlans: updated });
                          }}
                          className="w-32 px-3 py-1.5 border border-neutral-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                        />
                        <span className="text-sm text-neutral-500">₮</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setSettings({ ...settings, defaultFeePlan: p.key })}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${settings.defaultFeePlan === p.key ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" : "border-neutral-200 text-neutral-500 hover:border-blue-300"}`}>
                          {settings.defaultFeePlan === p.key ? "✓ Анхдагч" : "Анхдагч"}
                        </button>
                        {settings.feePlans.length > 1 && (
                          <button type="button" onClick={() => {
                            const updated = settings.feePlans.filter((_: any, i: number) => i !== idx);
                            setSettings({ ...settings, feePlans: updated, defaultFeePlan: updated[0]?.key || "" });
                          }} className="text-xs px-2 py-0.5 rounded-full border border-red-200 text-red-400 hover:bg-red-50 transition-colors">
                            Устгах
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button"
                  onClick={() => {
                    const newKey = `plan_${Date.now()}`;
                    setSettings({
                      ...settings,
                      feePlans: [...settings.feePlans, { key: newKey, label: "", sublabel: "", price: 0 }],
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-neutral-300 rounded-xl text-sm text-neutral-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                  <Plus className="w-4 h-4" /> Шинэ сонголт нэмэх
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content editor */}
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">Доорх текст шинэ гэрээнүүдэд тусгагдана.</p>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".txt,.docx" className="hidden" onChange={handleImport} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={importLoading}
              className="flex items-center gap-2 px-3 py-1.5 border border-neutral-300 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
              {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Word / TXT импорт
            </button>
          </div>
        </div>
        <textarea value={settings.content} onChange={e => setSettings({ ...settings, content: e.target.value })}
          className="w-full p-4 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-serif text-sm leading-relaxed resize-none bg-neutral-50 min-h-[400px]" />
      </div>

      {/* Admin signature */}
      <div className="p-6 border-t border-neutral-100">
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Гэрээ байгуулагчийн гарын үсэг <span className="text-red-500">*</span>
        </label>
        <div className="border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 relative max-w-sm" style={{ height: 120 }}>
          <canvas ref={sig.ref} width={600} height={120}
            className="absolute inset-0 w-full h-full touch-none" style={{ cursor: "crosshair" }}
            onMouseDown={sig.start} onMouseMove={sig.move} onMouseUp={sig.end} onMouseLeave={sig.end}
            onTouchStart={sig.start} onTouchMove={sig.move} onTouchEnd={sig.end} />
          {!sig.hasSignature && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-neutral-400 pointer-events-none select-none">
              <PenTool className="w-5 h-5" /><span className="text-xs">Энд гарын үсэг зурна уу</span>
            </div>
          )}
          {sig.hasSignature && (
            <button type="button" onClick={sig.clear} className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-500 hover:text-red-500 z-10 shadow-sm">
              <Eraser className="w-3 h-3" /> Арилгах
            </button>
          )}
        </div>
        {!sig.hasSignature && <p className="text-xs text-red-500 mt-1">Гарын үсэг зурахгүйгээр хадгалах боломжгүй</p>}
      </div>
    </div>
  );
}

// ─── Preview tab ──────────────────────────────────────────────────────────────
function ContractPreviewTab({ settings }: { settings: any }) {
  const sig = useSignatureCanvas();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-2xl shadow-sm border border-neutral-100">
        <CheckCircle2 className="w-20 h-20 text-green-500" />
        <h2 className="text-2xl font-semibold text-neutral-800">Гэрээ амжилттай баталгаажлаа</h2>
        <button onClick={() => setSubmitted(false)} className="mt-4 px-6 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 font-medium">Буцах</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden w-full max-w-4xl mx-auto">
      <div className="p-8 md:p-12 text-sm leading-relaxed text-black font-serif border-b border-neutral-200">
        <div className="text-center font-bold text-lg mb-1 leading-snug text-[#1e4e8c]">
          МОНГОЛ ЭЗЭНТЭЙ ЖИЖИГ ДУНД БИЗНЕС<br />ЭРХЛЭГЧДИЙН НЭГДСЭН ХОЛБОО<br />
          <span className="font-normal text-sm italic text-neutral-600">Mongolian SME United Association</span>
        </div>
        <div className="border-b-2 border-[#1e4e8c] my-4"></div>
        <div className="text-center font-bold text-[#1e4e8c] mb-4 text-base">УДИРДАХ ЗӨВЛӨЛИЙН ГИШҮҮНЧЛЭЛИЙН ГЭРЭЭ</div>
        <div className="whitespace-pre-wrap mt-6">{settings.content}</div>

        <div className="mt-8 overflow-hidden">
          <table className="w-full border-collapse border border-[#b4c6e7] text-sm">
            <thead>
              <tr>
                <th className="border border-[#b4c6e7] bg-[#f8f9fc] p-4 text-center w-1/2">
                  <div className="text-[#1e4e8c] font-bold text-base mb-1">ХОЛБОО</div>
                  <div className="text-[#c00000] font-normal">{settings.orgName}</div>
                </th>
                <th className="border border-[#b4c6e7] bg-[#f8f9fc] p-4 text-center w-1/2">
                  <div className="text-[#1e4e8c] font-bold text-base mb-1">ГИШҮҮН</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-[#b4c6e7] p-4 bg-[#f8f9fc] align-top">
                  <div className="border-b-2 border-[#1e4e8c] h-16 mb-1 flex items-end justify-center">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Signature_of_John_Hancock.svg" alt="" className="h-12 opacity-40 mix-blend-multiply" />
                  </div>
                  <div className="text-xs text-[#c00000] mb-1">Гарын үсэг / Албан тушаал</div>
                  <div className="border-b-2 border-[#1e4e8c] h-8 mt-3 mb-1 flex items-end justify-center">
                    <span className="text-sm font-medium">{settings.presidentName}</span>
                  </div>
                  <div className="text-xs text-neutral-500 mb-1">Овог нэр</div>
                  <div className="border-b-2 border-[#1e4e8c] h-8 mt-3 mb-1 flex items-end justify-center">
                    <span className="text-sm font-medium text-[#c00000]">{settings.presidentTitle}</span>
                  </div>
                  <div className="text-xs text-neutral-500">Албан тушаал</div>
                </td>
                <td className="border border-[#b4c6e7] p-4 bg-[#f8f9fc] align-top group relative">
                  <div className="border-2 border-dashed border-[#1e4e8c]/40 rounded-lg bg-blue-50/20 relative" style={{ height: 100 }}>
                    <canvas ref={sig.ref} width={400} height={100}
                      className="absolute inset-0 w-full h-full touch-none" style={{ cursor: "crosshair" }}
                      onMouseDown={sig.start} onMouseMove={sig.move} onMouseUp={sig.end} onMouseLeave={sig.end}
                      onTouchStart={sig.start} onTouchMove={sig.move} onTouchEnd={sig.end} />
                    {!sig.hasSignature && (
                      <div className="absolute inset-0 flex items-center justify-center gap-2 text-blue-300/70 pointer-events-none text-xs">
                        <PenTool className="w-4 h-4" /> Гарын үсэг зурна уу
                      </div>
                    )}
                    {sig.hasSignature && (
                      <button type="button" onClick={sig.clear} className="absolute top-1 right-1 px-2 py-0.5 bg-white border border-neutral-200 rounded text-xs text-neutral-400 hover:text-red-500 z-10">
                        <Eraser className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-[#c00000] mb-1">Гарын үсэг / Албан тушаал</div>
                  <div className="border-b-2 border-[#1e4e8c] h-8 mt-3 mb-1"></div>
                  <div className="text-xs text-neutral-500 mb-1">Овог нэр</div>
                  <div className="border-b-2 border-[#1e4e8c] h-8 mt-3 mb-1"></div>
                  <div className="text-xs text-neutral-500">Албан тушаал</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-6 bg-neutral-50 flex flex-col md:flex-row items-center justify-between gap-6">
        <label className="flex items-start gap-3 cursor-pointer flex-1">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-5 h-5 mt-0.5 text-blue-600 rounded border-gray-300" />
          <span className="text-sm text-neutral-600">Би дээрх гэрээний нөхцөлүүдийг уншиж танилцсан бөгөөд бүрэн хүлээн зөвшөөрч байна.</span>
        </label>
        <button disabled={!agreed || submitting} onClick={() => { setSubmitting(true); setTimeout(() => { setSubmitting(false); setSubmitted(true); }, 1500); }}
          className="w-full md:w-auto px-8 py-3.5 bg-[#1e4e8c] text-white rounded-xl font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Боловсруулж байна...</> : <><CheckCircle2 className="w-5 h-5" /> Гэрээг баталгаажуулах</>}
        </button>
      </div>
    </div>
  );
}
