"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { CheckCircle2, PenTool, Eraser, Loader2, QrCode, Smartphone, Download } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
const API = `${API_BASE}/api`;

// Reuse the default text for mockup purposes
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

export default function ContractSignPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const isPrintMode = searchParams?.get("print") === "1";
  const contractId = (params?.id as string) || "";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [today, setToday] = useState("");

  const [step, setStep] = useState<"fill" | "qpay" | "success">("fill");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contractInfo, setContractInfo] = useState<{
    isPaid: boolean; feePlan: string | null;
    adminSignature?: string; adminName?: string; adminTitle?: string; adminStamp?: string;
    isTemplate?: boolean; memberSignature?: string;
  } | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [memberPosition, setMemberPosition] = useState("");
  const [memberStamp, setMemberStamp] = useState<string | null>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  // QPay
  const [qpayData, setQpayData] = useState<{ invoiceId: string; qrImage: string; qrText: string; urls: any[]; amount: number } | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [selectedFeePlan, setSelectedFeePlan] = useState("6m");

  const FEE_PLANS = [
    { key: "6m", label: "6 сар", price: 1_800_000 },
    { key: "12m", label: "12 сар", price: 3_000_000 },
  ];

  const [memberData, setMemberData] = useState({
    name: "", register: "", field: "", address: "", phone: "", email: "", website: "", director: ""
  });

  useEffect(() => {
    setToday(new Date().toLocaleDateString("mn-MN"));
    fetch(`${API}/contracts/${contractId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setContractInfo({
            isPaid: d.contract.isPaid,
            feePlan: d.contract.feePlan,
            adminSignature: d.contract.adminSignature,
            adminName: d.contract.adminName,
            adminTitle: d.contract.adminTitle,
            adminStamp: d.contract.adminStamp,
            isTemplate: d.contract.isTemplate,
            memberSignature: d.contract.memberSignature,
          });
          // In print mode: pre-fill memberData from stored JSON
          if (isPrintMode && d.contract.memberData) {
            const md = d.contract.memberData as any;
            setMemberData({
              name: md.name || "",
              register: md.register || "",
              field: md.field || "",
              address: md.address || "",
              phone: md.phone || "",
              email: md.email || "",
              website: md.website || "",
              director: md.director || "",
            });
            if (md.position) setMemberPosition(md.position);
          }
          // auto-print after data is ready
          if (isPrintMode) {
            setTimeout(() => window.print(), 1200);
          }
        }
      })
      .catch(() => { });
  }, [contractId, isPrintMode]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e3a5f";
    const { x, y } = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.closePath();
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const signature = canvasRef.current?.toDataURL("image/png") || "";
      const payload = {
        memberData: { ...memberData, position: memberPosition, stamp: memberStamp },
        memberSignature: signature,
        feePlan: selectedFeePlan,
      };

      // Template → POST /submit (creates a new submission record)
      // Legacy contract → POST /sign (updates existing record)
      const endpoint = contractInfo?.isTemplate
        ? `${API}/contracts/${contractId}/submit`
        : `${API}/contracts/${contractId}/sign`;

      const signRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const signData = await signRes.json();
      if (!signData.success) throw new Error(signData.error);

      // For template submissions: use the new submissionId for QPay
      const activeId = signData.submissionId || contractId;
      setSubmissionId(activeId);

      if (contractInfo?.isPaid) {
        // Create QPay invoice for the active ID (submission or legacy contract)
        const res = await fetch(`${API}/contracts/${activeId}/qpay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (data.success) {
          setQpayData({ invoiceId: data.invoiceId, qrImage: data.qrImage, qrText: data.qrText, urls: data.urls || [], amount: data.amount });
          setStep("qpay");
        } else {
          alert("QPay invoice үүсгэхэд алдаа: " + (data.error || ""));
        }
      } else {
        setStep("success");
      }
    } catch { alert("Алдаа гарлаа. Дахин оролдоно уу."); }
    finally { setIsSubmitting(false); }
  };

  const [pollCountdown, setPollCountdown] = useState(5);

  // Auto-poll payment status every 5 seconds while on QPay step
  useEffect(() => {
    if (step !== "qpay" || !qpayData) return;

    let countdown = 5;
    setPollCountdown(5);

    const tick = setInterval(() => {
      countdown -= 1;
      setPollCountdown(countdown);

      if (countdown <= 0) {
        countdown = 5;
        setPollCountdown(5);
        // silently check payment
        fetch(`${API}/contracts/${submissionId || contractId}/qpay/check`)
          .then(r => r.json())
          .then(data => {
            if (data.isPaid) {
              clearInterval(tick);
              setStep("success");
            }
          })
          .catch(() => { });
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [step, qpayData, contractId]);

  const checkPayment = useCallback(async () => {
    if (!qpayData || checkingPayment) return;
    setCheckingPayment(true);
    try {
      const res = await fetch(`${API}/contracts/${submissionId || contractId}/qpay/check`);
      const data = await res.json();
      if (data.isPaid) setStep("success");
      else alert("Төлбөр бүртгэгдэх хүртэл түр хүлээнэ үү.");
    } catch { alert("Алдаа гарлаа."); }
    finally { setCheckingPayment(false); }
  }, [qpayData, checkingPayment, contractId]);

  if (step === "success") {
    const base = process.env.NEXT_PUBLIC_WEB_URL || window.location.origin;
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-neutral-100 p-10 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Гэрээ баталгаажлаа</h2>
          <p className="text-neutral-500 mb-8">
            Таны гэрээ албан ёсоор баталгаажлаа. Доорх товчийг дарж PDF хэлбэрээр татаж авна уу.
          </p>
          <button
            onClick={() => window.open(`${base}/contract/sign/${submissionId || contractId}?print=1`, "_blank")}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 mb-3"
          >
            <Download className="w-5 h-5" /> Гэрээ PDF татах
          </button>
          <button
            onClick={() => window.location.href = "/"}
            className="w-full px-6 py-3 bg-[#1e4e8c] text-white rounded-xl font-medium hover:bg-blue-800 transition-colors"
          >
            Нүүр хуудас руу буцах
          </button>
        </div>
      </div>
    );
  }

  if (step === "qpay" && qpayData) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden">
          <div className="bg-[#1e4e8c] p-6 text-white text-center">
            <QrCode className="w-12 h-12 mx-auto mb-3 opacity-90" />
            <h2 className="text-xl font-bold">Хураамж төлөх</h2>
            <p className="text-blue-200 text-sm mt-1">Төлбөр төлөгдсөнөөр гэрээ хүчин төгөлдөр болно.</p>
          </div>

          <div className="p-6 flex flex-col items-center gap-5">
            {qpayData.qrImage ? (
              <img src={`data:image/png;base64,${qpayData.qrImage}`} alt="QPay QR" className="w-52 h-52 rounded-xl border-2 border-neutral-200 shadow-sm" />
            ) : (
              <div className="w-52 h-52 bg-neutral-100 rounded-xl border-2 border-neutral-200 flex items-center justify-center text-neutral-400 text-sm">QR код ачааллаж байна...</div>
            )}

            <div className="text-center">
              <div className="text-sm text-neutral-500">Төлөх дүн</div>
              <div className="text-3xl font-bold text-neutral-900">{qpayData.amount.toLocaleString()} ₮</div>
            </div>

            {/* Auto-polling status indicator */}
            <div className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
              <div className="text-sm text-blue-700">
                Төлбөр автоматаар шалгагдаж байна...
                <span className="ml-1 font-semibold text-blue-900">{pollCountdown}с</span>
              </div>
            </div>

            {/* Deep links for mobile apps */}
            {qpayData.urls.length > 0 && (
              <div className="w-full">
                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2"><Smartphone className="w-3.5 h-3.5" /> Банкны аппаар нэвтрэх:</div>
                <div className="grid grid-cols-2 gap-2">
                  {qpayData.urls.slice(0, 6).map((u: any) => (
                    <a key={u.name} href={u.link} className="flex items-center gap-2 px-3 py-2 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors truncate">
                      {u.logo && <img src={u.logo} alt={u.name} className="w-5 h-5 rounded flex-shrink-0" />}
                      {u.description || u.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <button onClick={checkPayment} disabled={checkingPayment}
              className="w-full px-6 py-3.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm">
              {checkingPayment ? <><Loader2 className="w-5 h-5 animate-spin" /> Шалгаж байна...</> : <><CheckCircle2 className="w-5 h-5" /> Төлбөр төлсөн</>}
            </button>
          </div>
        </div>
      </div>
    );
  }


  // Step = "fill"
  return (
    <div className="min-h-screen bg-neutral-100/50 py-10 px-4 sm:px-6">

      <div className="max-w-[850px] mx-auto mb-6 flex justify-between items-end no-print">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Гэрээ баталгаажуулах</h1>
          <p className="text-neutral-500 mt-1">Доорх мэдээллийг бөглөж гэрээг цахимаар байгуулна уу.</p>
        </div>
      </div>

      <form onSubmit={handleProceedToPayment} className="max-w-[850px] mx-auto">
        {/* A4 Paper container */}
        <div className="contract-paper bg-white rounded-sm shadow-xl border border-neutral-300 overflow-hidden mb-6 relative">

          <div className="px-8 sm:px-16 py-12 sm:py-20 text-sm leading-relaxed text-black font-serif">

            {/* HEADER RECREATION FROM MOCKUP */}
            <div className="text-center font-bold text-lg mb-1 leading-snug text-[#1e4e8c]">
              МОНГОЛ ЭЗЭНТЭЙ ЖИЖИГ ДУНД БИЗНЕС<br />
              ЭРХЛЭГЧДИЙН НЭГДСЭН ХОЛБОО<br />
              <span className="font-normal text-sm italic text-neutral-600">Mongolian SME United Association</span>
            </div>

            <div className="border-b-2 border-[#1e4e8c] my-4 max-w-4xl mx-auto"></div>

            <div className="text-center font-bold text-[#1e4e8c] mb-4 text-base">
              УДИРДАХ ЗӨВЛӨЛИЙН ГИШҮҮНЧЛЭЛИЙН ГЭРЭЭ
            </div>

            <table className="w-full text-sm border-collapse border border-[#b4c6e7] mb-6 font-sans">
              <tbody>
                <tr>
                  <td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c] w-[150px]">Гэрээний дугаар:</td>
                  <td className="border border-[#b4c6e7] p-2 font-mono font-medium text-neutral-600 bg-amber-50/50">MGL-{contractId.slice(0, 8).toUpperCase()}</td>
                  <td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c] w-[100px]">Огноо:</td>
                  <td className="border border-[#b4c6e7] p-2">{today}</td>
                </tr>
                <tr>
                  <td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c]">Байршил:</td>
                  <td className="border border-[#b4c6e7] p-2">Улаанбаатар хот</td>
                  <td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c]">Гэрээний хугацаа:</td>
                  <td className="border border-[#b4c6e7] p-2">{FEE_PLANS.find(p => p.key === selectedFeePlan)?.label ?? "—"}</td>
                </tr>
              </tbody>
            </table>

            <div className="text-center font-bold text-[#1e4e8c] mb-2">
              НЭГ. ТАЛУУДЫН МЭДЭЭЛЭЛ
            </div>
            <div className="border-b-2 border-[#1e4e8c] w-full max-w-xs mx-auto mb-4"></div>

            <p className="text-sm mb-4 text-justify font-serif">
              Энэхүү гэрээг нэг талаас Монгол эзэнтэй жижиг дунд бизнес эрхлэгчдийн нэгдсэн холбоо (цаашид "Холбоо" гэх) болон нөгөө талаас доор дурдсан байгууллага (цаашид "Гишүүн" гэх) хооронд байгуулав.
            </p>

            <div className="font-medium mb-2 text-[#c00000]">1.1 Холбооны мэдээлэл</div>
            <table className="w-full text-sm border-collapse border border-[#b4c6e7] mb-6 font-sans">
              <tbody>
                <tr><td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c] w-1/3">Байгууллагын нэр:</td><td className="border border-[#b4c6e7] p-2 text-[#c00000]">Монгол эзэнтэй ЖДБ эрхлэгчдийн нэгдсэн холбоо</td></tr>
                <tr><td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c]">Байгууллагын регистр</td><td className="border border-[#b4c6e7] p-2">7236841</td></tr>
                <tr><td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c]">Хаяг:</td><td className="border border-[#b4c6e7] p-2 text-[#c00000]">Улаанбаатар хот, БГД дүүрэг, 21 хороо, Горький 14-330</td></tr>
                <tr><td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c]">Утас:</td><td className="border border-[#b4c6e7] p-2">91601316, 95606060</td></tr>
                <tr><td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c]">И-мэйл:</td><td className="border border-[#b4c6e7] p-2">Bigservice1316@gmail.com</td></tr>
                <tr><td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c]">Вэбсайт:</td><td className="border border-[#b4c6e7] p-2 text-[#c00000] underline">MGLSTORE.MN</td></tr>
                <tr><td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c]">Дансны мэдээлэл:</td><td className="border border-[#b4c6e7] p-2 flex gap-4 text-[#c00000]"><span className="underline">Банк:Төрийн банк</span> <span className="underline">Дансны дугаар: 9999 9999 6996</span></td></tr>
              </tbody>
            </table>

            <div className="font-medium mb-2 text-[#c00000]">1.2 Гишүүн байгууллагын мэдээлэл</div>
            <table className="w-full text-sm border-collapse border border-[#b4c6e7] mb-8 font-sans">
              <tbody>
                {([
                  ["Байгууллагын нэр:", "name", true],
                  ["Байгууллагын регистр", "register", true],
                  ["Үйл ажиллагааны чиглэл:", "field", false],
                  ["Хаяг:", "address", false],
                  ["Утас:", "phone", true],
                  ["И-мэйл:", "email", false],
                  ["Вэбсайт:", "website", false],
                  ["Нэр:", "director", true],
                ] as [string, keyof typeof memberData, boolean][]).map(([label, key, required]) => (
                  <tr key={key}>
                    <td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c] w-1/3">{label}</td>
                    <td className="border border-[#b4c6e7] p-0">
                      {isPrintMode ? (
                        <div className="w-full p-2 text-blue-900 min-h-[36px]">{memberData[key]}</div>
                      ) : (
                        <input
                          required={required}
                          type="text"
                          value={memberData[key]}
                          onChange={e => setMemberData({ ...memberData, [key]: e.target.value })}
                          className="w-full p-2 border-0 outline-none bg-blue-50/30 focus:bg-white text-blue-900 placeholder:text-blue-300"
                          placeholder="Бичих..."
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="whitespace-pre-wrap mb-12">
              {DEFAULT_CONTRACT_TEXT}
            </div>

            {/* TABLE BASED SIGNATURE BLOCK JUST LIKE IN THE MOCKUP */}
            <div className="overflow-hidden page-break-inside-avoid">
              <table className="w-full border-collapse border border-[#b4c6e7] text-sm">
                <thead>
                  <tr>
                    <th className="border border-[#b4c6e7] bg-[#f8f9fc] p-4 text-center w-1/2 align-top">
                      <div className="text-[#1e4e8c] font-bold text-base mb-1">ХОЛБОО</div>
                      <div className="text-[#c00000] font-normal">Монгол эзэнтэй ЖДБ эрхлэгчдийн<br />нэгдсэн холбоо</div>
                    </th>
                    <th className="border border-[#b4c6e7] bg-[#f8f9fc] p-4 text-center w-1/2 align-top">
                      <div className="text-[#1e4e8c] font-bold text-base mb-1">ГИШҮҮН</div>
                      <div className="text-[#1e4e8c] font-normal">Байгууллагын нэр:</div>
                      <div className="border-b border-[#1e4e8c] w-3/4 mx-auto mt-2 h-4 text-neutral-800">{memberData.name}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#b4c6e7] p-4 bg-[#f8f9fc] align-top relative">
                      <div className="border-b-2 border-[#1e4e8c] h-16 mb-1 relative flex items-end justify-center">
                        {contractInfo?.adminSignature
                          ? <img src={contractInfo.adminSignature} alt="Гарын үсэг" className="h-14 max-w-full object-contain mix-blend-multiply" />
                          : <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Signature_of_John_Hancock.svg" alt="" className="h-12 opacity-30 mix-blend-multiply" />
                        }
                      </div>
                      <span className="text-[#c00000] font-normal text-xs">Гарын үсэг / Албан тушаал</span>

                      <div className="border-b-2 border-[#1e4e8c] h-8 mb-1 mt-4 relative flex items-end justify-center">
                        <span className="text-sm font-medium text-neutral-800">{contractInfo?.adminName || ""}</span>
                      </div>
                      <span className="text-neutral-500 font-normal text-xs">Овог нэр</span>

                      <div className="border-b-2 border-[#1e4e8c] h-8 mb-1 mt-4 relative flex items-end justify-center">
                        <span className="text-sm font-medium text-[#c00000]">{contractInfo?.adminTitle || ""}</span>
                      </div>
                      <span className="text-neutral-500 font-normal text-xs">Албан тушаал</span>

                      <div className="border-b-2 border-[#1e4e8c] h-16 mb-1 mt-4 flex items-end justify-center">
                        {contractInfo?.adminStamp && (
                          <img src={contractInfo.adminStamp} alt="Тамга" className="h-14 max-w-full object-contain mix-blend-multiply" />
                        )}
                      </div>
                      <span className="text-[#c00000] font-normal text-xs">Тамга</span>

                      <div className="border-b-2 border-[#1e4e8c] h-8 mb-1 mt-4 relative flex items-end justify-center">
                        <span className="text-sm font-medium text-neutral-800">{today}</span>
                      </div>
                      <span className="text-[#c00000] font-normal text-xs">Огноо (он/сар/өдөр)</span>
                    </td>

                    <td className="border border-[#b4c6e7] p-4 bg-[#f8f9fc] align-top relative group">
                      <div className="relative mb-1">
                        {isPrintMode ? (
                          <div className="border-b-2 border-[#1e4e8c] h-[140px] flex items-end justify-center">
                            {contractInfo?.memberSignature && (
                              <img src={contractInfo.memberSignature} alt="Гарын үсэг" className="h-[130px] max-w-full object-contain mix-blend-multiply" />
                            )}
                          </div>
                        ) : (
                        <div className="border-2 border-dashed border-[#1e4e8c]/40 rounded-lg bg-blue-50/30 relative" style={{ height: 140 }}>
                          <canvas
                            ref={canvasRef}
                            width={600}
                            height={140}
                            className="absolute inset-0 w-full h-full touch-none"
                            style={{ cursor: "crosshair" }}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={endDrawing}
                            onMouseLeave={endDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={endDrawing}
                          />
                          {!isDrawing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-blue-300/70 pointer-events-none select-none">
                              <PenTool className="w-6 h-6" />
                              <span className="text-xs">Энд гарын үсэг зурна уу</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={clearSignature}
                            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-500 hover:text-red-500 hover:border-red-200 transition-colors z-10 shadow-sm"
                          >
                            <Eraser className="w-3 h-3" /> Арилгах
                          </button>
                        </div>
                        )}
                      </div>
                      <span className="text-[#c00000] font-normal text-xs">Гарын үсэг / Албан тушаал</span>

                      <div className="border-b-2 border-[#1e4e8c] h-8 mb-1 mt-4 flex items-end">
                        <div className="w-full text-center text-neutral-800 font-medium text-sm">{memberData.director}</div>
                      </div>
                      <span className="text-neutral-500 font-normal text-xs">Овог нэр</span>

                      <div className="border-b-2 border-[#1e4e8c] h-8 mb-1 mt-4 flex items-end justify-center">
                        {isPrintMode ? (
                          <span className="text-sm font-medium text-neutral-800">{memberPosition}</span>
                        ) : (
                          <input
                            type="text"
                            value={memberPosition}
                            onChange={e => setMemberPosition(e.target.value)}
                            placeholder="Албан тушаал бичих..."
                            className="w-full h-full bg-transparent border-none focus:ring-0 text-center text-sm text-neutral-800 p-0"
                          />
                        )}
                      </div>
                      <span className="text-neutral-500 font-normal text-xs">Албан тушаал</span>

                      {/* Member stamp upload — TEMPORARILY DISABLED
                      <div className="mt-4">
                        <input
                          ref={stampInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => setMemberStamp(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }}
                        />
                        <div
                          onClick={() => stampInputRef.current?.click()}
                          className="border-2 border-dashed border-[#1e4e8c]/30 rounded-lg bg-neutral-50 h-16 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/30 transition-colors relative"
                        >
                          {memberStamp ? (
                            <>
                              <img src={memberStamp} alt="Тамга" className="h-14 max-w-full object-contain mix-blend-multiply" />
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setMemberStamp(null); }}
                                className="absolute top-1 right-1 text-xs px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-neutral-400 hover:text-red-400"
                              >✕</button>
                            </>
                          ) : (
                            <span className="text-xs text-neutral-400">Тамга зургийг upload хийх</span>
                          )}
                        </div>
                      </div>
                      */}
                      <div className="border-b-2 border-[#1e4e8c] h-8 mb-1 mt-4"></div>
                      <span className="text-[#c00000] font-normal text-xs">Тамга</span>

                      <div className="border-b-2 border-[#1e4e8c] h-8 mb-1 mt-4 relative flex items-end justify-center">
                        <span className="text-sm font-medium text-neutral-800">{today}</span>
                      </div>
                      <span className="text-[#c00000] font-normal text-xs">Огноо (он/сар/өдөр)</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-center text-sm mt-6 text-[#c00000] italic font-medium">
              Энэхүү гэрээг 2 хувь үйлдэж, тус бүр нэг хувийг тал бүр хадгална.
            </div>

          </div>
        </div>

        {/* Fee plan selector (shown only when contract is paid) */}
        {contractInfo?.isPaid && (
          <div className="no-print bg-white rounded-xl shadow-lg border border-neutral-200 p-5 mb-3">
            <div className="font-semibold text-neutral-800 mb-3">Хураамжийн сонголт <span className="text-red-500">*</span></div>
            <div className="grid grid-cols-2 gap-3">
              {FEE_PLANS.map(p => (
                <button key={p.key} type="button" onClick={() => setSelectedFeePlan(p.key)}
                  className={`flex flex-col items-center p-4 border-2 rounded-xl text-sm transition-colors ${selectedFeePlan === p.key ? "border-blue-500 bg-blue-50 text-blue-700" : "border-neutral-200 hover:border-neutral-300"}`}>
                  <span className="font-bold text-base">{p.label}</span>
                  <span className="font-semibold mt-1">{p.price.toLocaleString()}₮</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="no-print bg-white rounded-xl shadow-lg border border-neutral-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6 sticky bottom-6 z-50">
          <label className="flex items-start gap-3 cursor-pointer group flex-1">
            <div className="flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>
            <div className="text-sm text-neutral-600 group-hover:text-neutral-900 transition-colors leading-relaxed">
              Би дээрх гэрээний нөхцөлүүдийг уншиж танилцсан бөгөөд бүрэн хүлээн зөвшөөрч цахим гарын үсэг зурж баталгаажуулж байна.
            </div>
          </label>

          <button
            type="submit"
            disabled={!agreed || isSubmitting || !memberData.name || !memberData.register}
            className="w-full md:w-auto px-8 py-3.5 bg-[#1e4e8c] text-white rounded-xl font-medium hover:bg-blue-800 focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Уншиж байна...</>
            ) : (
              <><CheckCircle2 className="w-5 h-5" /> Дараагийн</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
