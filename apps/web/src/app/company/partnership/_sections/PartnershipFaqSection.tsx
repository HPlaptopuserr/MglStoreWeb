"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronDown,
  HelpCircle,
  MessageSquare,
  CreditCard,
  FileText,
  Truck,
  ShieldCheck,
  Headphones,
  BarChart3,
  X,
  Send,
  CheckCircle,
  Phone,
  Mail,
  User,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FAQData {
  id: number;
  title: string;
  answer: string;
  icon: LucideIcon;
  category: string;
}

const FAQ_DATA: FAQData[] = [
  {
    id: 1,
    title: "Маркетингийн боломжууд юу вэ?",
    answer:
      "Бид хамтрагч байгууллагуудад сошиал сурталчилгаа, баннер байршуулах, хамтарсан кампанит ажил зэрэг маркетингийн боломжуудыг санал болгодог. Мөн тусгай урамшуулал, хөнгөлөлтийн кампанит ажлуудыг зохион байгуулахад бүрэн дэмжлэг үзүүлнэ.",
    icon: MessageSquare,
    category: "Маркетинг",
  },
  {
    id: 2,
    title: "Захиалга яаж хянах вэ?",
    answer:
      "Та манай мерчант аппликейшн ашиглан захиалгын төлөвийг цаг алдалгүй хянах боломжтой. Захиалга ирэх, бэлтгэгдэх, хүргэгдэх зэрэг бүх үе шатыг бодит цагийн горимд харах боломжтой.",
    icon: BarChart3,
    category: "Удирдлага",
  },
  {
    id: 3,
    title: "Тооцоо хэрхэн нийлэх вэ?",
    answer:
      "Тооцоог сар бүрийн тогтсон өдрүүдэд автоматаар нийлж, таны бүртгэлтэй данс руу шилжүүлнэ. Тайланг системээс татаж авах боломжтой. QPay, SocialPay болон бүх банкны картаар тооцоо нийлнэ.",
    icon: CreditCard,
    category: "Санхүү",
  },
  {
    id: 4,
    title: "Шаардлагатай бичиг баримтууд юу вэ?",
    answer:
      "Байгууллагын албан ёсны бичиг баримт бүрэн байх, бүтээгдэхүүний чанарын стандартыг хангасан байх шаардлагатай. Үйл ажиллагааны тусгай зөвшөөрөл, НӨАТ-ын бүртгэлийн гэрчилгээ зэрэг баримтуудыг бэлтгэнэ.",
    icon: FileText,
    category: "Бүртгэл",
  },
  {
    id: 5,
    title: "Хүргэлтийн үйлчилгээ хэрхэн ажилладаг вэ?",
    answer:
      "Манай хүргэлтийн баг Улаанбаатар хот даяар үйлчилнэ. Захиалга баталгаажсанаас хойш дундажаар 30-60 минутын дотор хүргэлт хийгдэнэ. Хүргэлтийн төлөвийг бодит цагаар хянах боломжтой.",
    icon: Truck,
    category: "Хүргэлт",
  },
  {
    id: 6,
    title: "Мэдээллийн аюулгүй байдал хэрхэн хангагдаж байна вэ?",
    answer:
      "Бид олон улсын стандартад нийцсэн мэдээллийн хамгаалалтын системийг ашигладаг. Хэрэглэгчийн мэдээлэл шифрлэгдсэн байдлаар хадгалагдах бөгөөд гуравдагч этгээдэд дамжуулахгүй.",
    icon: ShieldCheck,
    category: "Аюулгүй байдал",
  },
  {
    id: 7,
    title: "Техникийн дэмжлэг хэрхэн авах вэ?",
    answer:
      "Тусгайлсан менежер 24/7 туслалцаа үзүүлэх бэлтэй. Утас, имэйл, чат зэрэг олон сувгаар холбогдох боломжтой. Нарийн техникийн асуудлуудад мэргэжилтэн баг шуурхай хариу өгнө.",
    icon: Headphones,
    category: "Дэмжлэг",
  },
];

export default function FAQSection() {
  const [openId, setOpenId] = useState<number | null>(1);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <section className="relative w-full py-24 px-4 md:px-6 lg:px-8 bg-linear-to-b from-gray-50 to-white overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFB700]/3 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/3 rounded-full blur-3xl pointer-events-none"></div>

      <div className="mx-auto max-w-6xl relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFB700]/10 border border-[#FFB700]/20 text-[#FFB700] text-sm font-medium mb-6">
            <HelpCircle className="w-4 h-4" />
            Түгээмэл асуултууд
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-5 leading-tight">
            Байнга асуугддаг{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FFB700] to-orange-500">
              асуултууд
            </span>
          </h2>
          <p className="text-lg text-gray-500">
            Түншлэлийн талаарх хамгийн түгээмэл асуултуудын хариулт энд байна
          </p>
        </div>

        {/* FAQ Items */}
        <div className="max-w-3xl mx-auto space-y-3">
          {FAQ_DATA.map((q) => {
            const isOpen = openId === q.id;
            const Icon = q.icon;
            return (
              <div
                key={q.id}
                className={`rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? "bg-white border-[#FFB700]/20 shadow-lg shadow-[#FFB700]/5"
                    : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
                }`}
              >
                <button
                  onClick={() => setOpenId(isOpen ? null : q.id)}
                  className="w-full flex items-center gap-4 p-5 md:p-6 text-left group focus:outline-none"
                >
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                      isOpen
                        ? "bg-[#FFB700] text-white"
                        : "bg-gray-100 text-gray-400 group-hover:bg-[#FFB700]/10 group-hover:text-[#FFB700]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Title & category */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-base md:text-lg font-semibold transition-colors ${
                        isOpen ? "text-gray-900" : "text-gray-700"
                      }`}
                    >
                      {q.title}
                    </div>
                    <span
                      className={`text-xs font-medium mt-0.5 block transition-colors ${
                        isOpen ? "text-[#FFB700]" : "text-gray-400"
                      }`}
                    >
                      {q.category}
                    </span>
                  </div>

                  {/* Chevron */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isOpen
                        ? "bg-[#FFB700]/10 text-[#FFB700] rotate-180"
                        : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Answer */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 md:px-6 pb-6 ml-14">
                        <div className="h-px bg-linear-to-r from-[#FFB700]/20 via-gray-100 to-transparent mb-4"></div>
                        <p className="text-gray-500 leading-relaxed text-sm md:text-base">
                          {q.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 sm:p-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#FFB700]/10 flex items-center justify-center shrink-0">
              <Headphones className="w-7 h-7 text-[#FFB700]" />
            </div>
            <div className="text-center sm:text-left">
              <h4 className="font-bold text-gray-900 text-lg">
                Нэмэлт асуулт байна уу?
              </h4>
              <p className="text-gray-500 text-sm mt-1">
                Манай баг танд туслахад бэлэн байна
              </p>
            </div>
            <button
              onClick={() => {
                setContactOpen(true);
                setSent(false);
                setSending(false);
              }}
              className="px-6 py-3 bg-[#FFB700] hover:bg-[#E5A500] text-gray-900 font-semibold rounded-xl transition-colors shadow-sm shadow-[#FFB700]/20 whitespace-nowrap"
            >
              Холбогдох
            </button>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      <AnimatePresence>
        {contactOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setContactOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="relative bg-linear-to-r from-[#FFB700] to-orange-500 p-6 pb-8">
                <button
                  onClick={() => setContactOpen(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                  <Headphones className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Бидэнтэй холбогдох
                </h3>
                <p className="text-white/80 text-sm mt-1">
                  Мэдээллээ үлдээвэл бид тантай эргэж холбогдоно
                </p>
              </div>

              {!sent ? (
                <div className="p-6 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Нэр
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Таны нэр"
                        value={contactForm.name}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            name: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#FFB700] focus:ring-2 focus:ring-[#FFB700]/20 outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Email & Phone row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        Имэйл
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          placeholder="email@example.com"
                          value={contactForm.email}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              email: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#FFB700] focus:ring-2 focus:ring-[#FFB700]/20 outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        Утас
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          placeholder="99XX XXXX"
                          value={contactForm.phone}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              phone: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#FFB700] focus:ring-2 focus:ring-[#FFB700]/20 outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Мессеж
                    </label>
                    <textarea
                      placeholder="Асуултаа энд бичнэ үү..."
                      rows={3}
                      value={contactForm.message}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          message: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FFB700] focus:ring-2 focus:ring-[#FFB700]/20 outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400 resize-none"
                    />
                  </div>

                  {/* Submit */}
                  <button
                    disabled={sending}
                    onClick={() => {
                      setSending(true);
                      setTimeout(() => {
                        setSending(false);
                        setSent(true);
                        setContactForm({
                          name: "",
                          email: "",
                          phone: "",
                          message: "",
                        });
                      }, 2000);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#FFB700] hover:bg-[#E5A500] disabled:opacity-70 text-gray-900 font-semibold rounded-xl transition-all shadow-sm shadow-[#FFB700]/20"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Илгээж байна...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Илгээх
                      </>
                    )}
                  </button>

                  {/* Contact info */}
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> 7700-1234
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> info@mglstore.mn
                    </span>
                  </div>
                </div>
              ) : (
                /* Success state */
                <div className="p-10 text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto"
                  >
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </motion.div>
                  <h4 className="text-xl font-bold text-gray-900">
                    Амжилттай илгээгдлээ!
                  </h4>
                  <p className="text-gray-500 text-sm max-w-xs mx-auto">
                    Таны хүсэлтийг хүлээн авлаа. Манай баг 24 цагийн дотор
                    тантай эргэж холбогдоно.
                  </p>
                  <button
                    onClick={() => setContactOpen(false)}
                    className="mt-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
                  >
                    Хаах
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
