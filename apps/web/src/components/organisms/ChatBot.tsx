"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, Bot, Package, Truck, Handshake, Phone, Search, ArrowLeft, Loader2, Info, MapPin, CalendarDays, UserPlus, Globe } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { API } from "@/lib/api";
import { useAuth, getToken } from "@/lib/auth-context";

interface Message {
  id: string;
  text: string;
  sender: "VISITOR" | "BOT" | "ADMIN";
  time: string;
  createdAt?: string;
}

const VISITOR_ID_KEY = "mgl_chat_visitor_id";
const SESSION_ID_KEY = "mgl_chat_session_id";

const QUICK_REPLIES = [
  { key: "general", label: "Ерөнхий мэдээлэл", icon: Info },
  { key: "location", label: "Тодорхой байршил", icon: MapPin },
  { key: "meeting", label: "Уулзалт, Сургалт", icon: CalendarDays },
  { key: "member", label: "Гишүүнээр элсэх", icon: UserPlus },
  { key: "partner", label: "Хамтарч ажиллах", icon: Handshake },
  { key: "supply", label: "Бараа нийлүүлэх", icon: Package },
  { key: "phone", label: "Дугаар", icon: Phone },
  { key: "website", label: "Вебсайт", icon: Globe },
] as const;

type QuickReplyKey = (typeof QUICK_REPLIES)[number]["key"];

const QUICK_REPLY_TEXT: Record<QuickReplyKey, string> = {
  general: "Ерөнхий мэдээлэл",
  location: "Тодорхой байршил",
  meeting: "Уулзалт, Сургалт",
  member: "Гишүүнээр элсэх",
  partner: "Хамтарч ажиллах",
  supply: "Бараа бүтээгдэхүүн нийлүүлэх",
  phone: "Дугаар",
  website: "Вебсайт",
};

const QUICK_REPLY_BY_NUMBER: Record<string, QuickReplyKey> = {
  "1": "general",
  "2": "location",
  "3": "meeting",
  "4": "member",
  "5": "partner",
  "6": "supply",
  "7": "phone",
  "8": "website",
};

const BOT_RESPONSES: Record<string, string> = {
  "Ерөнхий мэдээлэл":
    "Манай үйлчилгээний ерөнхий мэдээлэл:\n\n1. Онлайн худалдаа\n2. POS болон кассын шийдэл\n3. Бизнесийн хамтын ажиллагаа\n4. Гишүүнчлэл, сургалтын хөтөлбөр\n\nСонирхсон сэдвийнхээ дугаарыг (1-8) бичиж болно.",
  "Тодорхой байршил":
    "Манай байршил:\n\nМонгол улс, Улаанбаатар хот, Хан-Уул дүүрэг\n(Салбарын байршлыг газрын зураг дээр шалгах боломжтой.)\n\n/view-source:hint\n\nИлүү тодорхой байршил хэрэгтэй бол дүүрэг/салбарын нэрээ бичээрэй.",
  "Уулзалт, Сургалт":
    "Уулзалт болон сургалтад бүртгүүлэх бол:\n\n1. Нэр, байгууллага\n2. Утас\n3. Сонирхож буй сэдэв\n4. Боломжит огноо\n\nэдгээрийг энэ чат руу явуулаарай. Манай баг эргээд холбогдоно.",
  "Гишүүнээр элсэх":
    "Гишүүнээр элсэх алхам:\n\n1. Доорх холбоосоор хүсэлт илгээх\n/apply/partnership\n\n2. Байгууллагын мэдээллээ бөглөх\n3. Баталгаажуулалтын дараа холбогдоно",
  "Хамтарч ажиллах":
    "Хамтын ажиллагааны хүсэлт илгээх:\n\n1. Доорх холбоосыг нээнэ\n/apply/partnership\n\n2. Хамтын ажиллагааны төрлөө сонгоно\n3. Бид 1–2 ажлын өдөрт холбогдоно",
  "Бараа бүтээгдэхүүн нийлүүлэх":
    "Бараа нийлүүлэх хүсэлт өгөхдөө:\n\n1. Барааны ангилал\n2. Нэгж үнэ ба бөөний үнэ\n3. Нийлүүлэх давтамж\n4. Холбоо барих мэдээлэл\n\nгэсэн мэдээллээ чат руу үлдээнэ үү.",
  "Дугаар":
    "Холбоо барих дугаар:\n\nУтас: 91601316\nАжлын цаг: Даваа–Баасан 09:00–18:00",
  "Вебсайт":
    "Манай вэбсайт:\n\nhttps://mglstore.mn\n\nМөн фэйсбүүк пэйжийн линк хэрэгтэй бол бичээрэй.",
  "Миний захиалга":
    "Захиалгын төлөв шалгахын тулд захиалгын дугаараа оруулна уу. Жишээ: ORD-20260420-123456",
  "Хүргэлт хаана явж байна?":
    "Хүргэлтийн мэдээллийг шалгахын тулд:\n\n1. Профайл хэсэг рүү орно уу\n2. Захиалгуудаа харна уу\n3. Тухайн захиалга дээр дарахад хүргэлтийн төлөв харагдана\n\nАсуулт байвал доор бичнэ үү.",
};

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Хүлээгдэж буй", color: "text-amber-600" },
  CONFIRMED: { label: "Баталгаажсан", color: "text-blue-600" },
  PREPARED: { label: "Бэлтгэгдсэн", color: "text-indigo-600" },
  SHIPPING: { label: "Хүргэлтэнд гарсан", color: "text-purple-600" },
  COMPLETED: { label: "Хүргэгдсэн", color: "text-emerald-600" },
  CANCELLED: { label: "Цуцлагдсан", color: "text-red-600" },
};

const PAYMENT_STATUS_MAP: Record<string, string> = {
  PENDING: "Төлөгдөөгүй",
  PAID: "Төлөгдсөн",
  FAILED: "Амжилтгүй",
  REFUNDED: "Буцаагдсан",
};

type TrackedOrder = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  deliveryCode: string | null;
  organizationName: string;
  createdAt: string;
  items: { name: string; qty: number; price: number; subtotal: number }[];
  delivery: { status: string; deliveredAt: string | null } | null;
};

type MyOrderSummary = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  organizationName: string;
  createdAt: string;
};

const WELCOME_TEXT =
  "Сайн байна уу!\n\nБи MGL Store-ийн туслах бот. Доорх товчнуудаас сонгох, эсвэл асуултаа бичээд илгээнэ үү.";

function getNow() {
  return new Date().toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
}

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

function getGuestDisplayName(): string {
  const id = getVisitorId();
  const num = parseInt(id.replace(/-/g, "").slice(-4), 16) % 9000 + 1000;
  return `Хэрэглэгч ${num}`;
}

function formatTime(dateStr?: string) {
  if (!dateStr) return getNow();
  return new Date(dateStr).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
}

export function ChatBot() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [activeQuickKey, setActiveQuickKey] = useState<QuickReplyKey | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgTimeRef = useRef<string | null>(null);

  // Order tracking state
  const [trackingMode, setTrackingMode] = useState(false);
  const [trackInput, setTrackInput] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [trackError, setTrackError] = useState("");

  // My orders (logged-in user)
  const [myOrders, setMyOrders] = useState<MyOrderSummary[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);

  // Prevent background scroll when chat is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Auto-dismiss greeting after 8s
  useEffect(() => {
    if (!greeting) return;
    const t = setTimeout(() => setGreeting(false), 8000);
    return () => clearTimeout(t);
  }, [greeting]);

  // Scroll to bottom on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Initialize or resume session when chat opens
  const initSession = useCallback(async () => {
    const visitorId = getVisitorId();
    try {
      const res = await fetch(`${API}/chat/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId,
          userId: user?.id || null,
          displayName: user?.fullName || getGuestDisplayName(),
        }),
      });
      if (!res.ok) return;
      const session = await res.json();
      setSessionId(session.id);
      sessionStorage.setItem(SESSION_ID_KEY, session.id);

      // Load existing messages
      if (session.messages?.length > 0) {
        setMessages(
          session.messages.map((m: any) => ({
            id: m.id,
            text: m.text,
            sender: m.sender,
            time: formatTime(m.createdAt),
            createdAt: m.createdAt,
          })),
        );
        lastMsgTimeRef.current =
          session.messages[session.messages.length - 1].createdAt;
      } else {
        // Send welcome bot message
        const welcomeRes = await fetch(`${API}/chat/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            sender: "BOT",
            text: WELCOME_TEXT,
          }),
        });
        if (welcomeRes.ok) {
          const welcomeMsg = await welcomeRes.json();
          setMessages([
            {
              id: welcomeMsg.id,
              text: welcomeMsg.text,
              sender: "BOT",
              time: formatTime(welcomeMsg.createdAt),
              createdAt: welcomeMsg.createdAt,
            },
          ]);
          lastMsgTimeRef.current = welcomeMsg.createdAt;
        }
      }
    } catch (err) {
      console.error("Chat init error:", err);
    }
  }, [user]);

  // Poll for new messages (admin replies)
  useEffect(() => {
    if (!open || !sessionId) return;

    const poll = async () => {
      try {
        const afterParam = lastMsgTimeRef.current
          ? `?after=${encodeURIComponent(lastMsgTimeRef.current)}`
          : "";
        const res = await fetch(`${API}/chat/sessions/${sessionId}/messages${afterParam}`);
        if (!res.ok) return;
        const newMsgs = await res.json();
        if (newMsgs.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = newMsgs
              .filter((m: any) => !existingIds.has(m.id))
              .map((m: any) => ({
                id: m.id,
                text: m.text,
                sender: m.sender,
                time: formatTime(m.createdAt),
                createdAt: m.createdAt,
              }));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
          lastMsgTimeRef.current = newMsgs[newMsgs.length - 1].createdAt;
        }
      } catch {
        // silent
      }
    };

    pollRef.current = setInterval(poll, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, sessionId]);

  const sendToServer = async (text: string, sender: "VISITOR" | "BOT") => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${API}/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sender,
          text,
          senderId: sender === "VISITOR" ? user?.id || null : null,
        }),
      });
      if (res.ok) {
        const msg = await res.json();
        lastMsgTimeRef.current = msg.createdAt;
        return msg;
      }
    } catch {
      // silent
    }
  };

  const fetchMyOrders = async () => {
    const token = getToken();
    if (!token) return;
    setMyOrdersLoading(true);
    try {
      const res = await fetch(`${API}/store/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyOrders(
          (data.orders || []).map((o: any) => ({
            orderNumber: o.orderNumber,
            status: o.status,
            paymentStatus: o.paymentStatus,
            total: o.total,
            organizationName: o.organizationName,
            createdAt: o.createdAt,
          })),
        );
      }
    } catch {
      // silent
    } finally {
      setMyOrdersLoading(false);
    }
  };

  const trackOrder = async (orderNumber: string) => {
    const num = orderNumber.trim().toUpperCase();
    if (!num) return;
    setTrackLoading(true);
    setTrackError("");
    setTrackedOrder(null);
    try {
      const res = await fetch(`${API}/store/orders/track?orderNumber=${encodeURIComponent(num)}`);
      if (res.ok) {
        const data: TrackedOrder = await res.json();
        setTrackedOrder(data);
      } else {
        const err = await res.json().catch(() => ({ message: "Захиалга олдсонгүй" }));
        setTrackError(err.message || "Захиалга олдсонгүй");
      }
    } catch {
      setTrackError("Сервертэй холбогдож чадсангүй");
    } finally {
      setTrackLoading(false);
    }
  };

  const exitTrackingMode = () => {
    setTrackingMode(false);
    setTrackedOrder(null);
    setTrackError("");
    setTrackInput("");
    setMyOrders([]);
  };

  const handleSend = async (text?: string) => {
    const raw = (text || input).trim();
    if (!raw || loading) return;

    const numericQuickKey = QUICK_REPLY_BY_NUMBER[raw];
    const msg = numericQuickKey ? QUICK_REPLY_TEXT[numericQuickKey] : raw;

    const clickedQuick = QUICK_REPLIES.find((q) => QUICK_REPLY_TEXT[q.key] === msg);
    setActiveQuickKey(clickedQuick?.key || numericQuickKey || null);

    // Intercept "Миний захиалга" → open tracking mode
    if (msg === "Миний захиалга") {
      setTrackingMode(true);
      setTrackedOrder(null);
      setTrackError("");
      setTrackInput("");
      setInput("");
      // Logged-in: auto-fetch orders
      if (user) {
        fetchMyOrders();
      }
      return;
    }

    setLoading(true);
    setInput("");

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    const userMessage: Message = {
      id: tempId,
      text: msg,
      sender: "VISITOR",
      time: getNow(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send to server
    const savedMsg = await sendToServer(msg, "VISITOR");
    if (savedMsg) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: savedMsg.id, createdAt: savedMsg.createdAt }
            : m,
        ),
      );
    }

    // Bot auto-reply
    const reply =
      BOT_RESPONSES[msg] ||
      "Таны хүсэлтийг хүлээн авлаа. Удахгүй холбогдох болно.";

    setBotTyping(true);
    setTimeout(async () => {
      const botSaved = await sendToServer(reply, "BOT");
      const botMessage: Message = {
        id: botSaved?.id || `bot-${Date.now()}`,
        text: reply,
        sender: "BOT",
        time: botSaved ? formatTime(botSaved.createdAt) : getNow(),
        createdAt: botSaved?.createdAt,
      };
      setMessages((prev) => [...prev, botMessage]);
      setBotTyping(false);
      setLoading(false);
    }, 600);
  };

  const handleOpen = async () => {
    setOpen(true);
    setGreeting(false);
    if (!sessionId) {
      await initSession();
    }
  };

  /** Parse /path references in bot messages into clickable links */
  const renderMessageText = (text: string, isBot: boolean) => {
    const parts = text.split(/(\/[a-zA-Z][a-zA-Z0-9/_-]*)/g);
    return parts.map((part, i) =>
      /^\/[a-zA-Z]/.test(part) ? (
        <Link
          key={i}
          href={part}
          onClick={() => setOpen(false)}
          className={`font-medium underline underline-offset-2 ${
            isBot ? "text-orange-600 hover:text-orange-700" : "text-white hover:text-white/80"
          }`}
        >
          {part}
        </Link>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    );
  };

  return (
    <>
      {/* Greeting bubble */}
      {greeting && !open && (
        <div className="fixed bottom-[140px] md:bottom-24 right-5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300 md:right-8">
          <div className="relative rounded-2xl bg-white px-4 py-3 shadow-lg ring-1 ring-gray-100 max-w-[200px]">
            <button
              type="button"
              onClick={() => setGreeting(false)}
              className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors"
            >
              <X size={10} />
            </button>
            <p className="text-[13px] font-medium text-gray-800">
              Сайн байна уу
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              Асуулт байвал энд дарна уу
            </p>
          </div>
          <div className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 ring-1 ring-gray-100 border-0 bg-white" />
        </div>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-[140px] md:bottom-24 right-4 md:right-5 z-50 w-[calc(100vw-32px)] max-w-[360px] max-h-[60vh] md:max-h-[520px] flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 md:right-8">
          {/* Header */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Bot size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">MGL Store Туслах</p>
              <p className="text-[10px] text-white/70 flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Онлайн
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content — tracking mode or chat */}
          {trackingMode ? (
            /* ── Order Tracking Panel ── */
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 380, scrollbarWidth: "thin", overscrollBehavior: "contain" }}>
              {/* Back button */}
              <div className="border-b border-gray-100 px-3 py-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={trackedOrder && user ? () => { setTrackedOrder(null); setTrackError(""); } : exitTrackingMode}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-orange-600 transition-colors"
                >
                  <ArrowLeft size={14} />
                  {trackedOrder && user ? "Жагсаалт руу" : "Чат руу буцах"}
                </button>
              </div>

              <div className="px-3 py-3 space-y-3">
                {/* My orders (logged-in) */}
                {user && !trackedOrder && (
                  <div>
                    <p className="text-[13px] font-semibold text-gray-700 mb-1.5">Миний захиалгууд</p>
                    {myOrdersLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={18} className="animate-spin text-orange-500" />
                      </div>
                    ) : myOrders.length > 0 ? (
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                        {myOrders.map((o) => (
                          <button
                            key={o.orderNumber}
                            type="button"
                            onClick={() => trackOrder(o.orderNumber)}
                            className="w-full text-left rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-100 hover:ring-orange-200 hover:bg-orange-50 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] font-bold text-gray-800">{o.orderNumber}</span>
                              <span className={`text-[10px] font-semibold ${ORDER_STATUS_MAP[o.status]?.color || "text-gray-500"}`}>
                                {ORDER_STATUS_MAP[o.status]?.label || o.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5 text-[10px] text-gray-400">
                              <span>{o.organizationName}</span>
                              <span>₮{o.total.toLocaleString()}</span>
                            </div>
                            <div className="text-[9px] text-gray-300 mt-0.5">
                              {new Date(o.createdAt).toLocaleDateString("mn-MN")}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-gray-400 text-center py-2">Захиалга байхгүй байна</p>
                    )}
                  </div>
                )}

                {/* Search bar (always for guest, secondary for logged-in) */}
                {(!user || trackedOrder) ? null : (
                  <div className="border-t border-gray-100 pt-2">
                    <p className="text-[11px] text-gray-400 mb-1">Дугаараар хайх</p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        trackOrder(trackInput);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={trackInput}
                        onChange={(e) => setTrackInput(e.target.value)}
                        placeholder="ORD-20260420-123456"
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] font-mono outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200"
                      />
                      <button
                        type="submit"
                        disabled={!trackInput.trim() || trackLoading}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-30 transition-colors"
                      >
                        {trackLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      </button>
                    </form>
                  </div>
                )}

                {/* Guest search bar */}
                {!user && (
                  <div>
                    <p className="text-[13px] font-semibold text-gray-700 mb-1.5">Захиалга шалгах</p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        trackOrder(trackInput);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={trackInput}
                        onChange={(e) => setTrackInput(e.target.value)}
                        placeholder="ORD-20260420-123456"
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] font-mono outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200"
                      />
                      <button
                        type="submit"
                        disabled={!trackInput.trim() || trackLoading}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-30 transition-colors"
                      >
                        {trackLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      </button>
                    </form>
                  </div>
                )}

                {/* Error */}
                {trackError && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600 ring-1 ring-red-100">
                    {trackError}
                  </div>
                )}

                {/* Order result */}
                {trackedOrder && (
                  <div className="space-y-2.5">
                    {/* Header card */}
                    <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white p-3 ring-1 ring-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-mono text-[12px] font-bold text-gray-800">{trackedOrder.orderNumber}</p>
                        <span className={`text-[11px] font-semibold ${ORDER_STATUS_MAP[trackedOrder.status]?.color || "text-gray-500"}`}>
                          {ORDER_STATUS_MAP[trackedOrder.status]?.label || trackedOrder.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        <div>
                          <span className="text-gray-400">Төлбөр:</span>{" "}
                          <span className="font-medium text-gray-700">{PAYMENT_STATUS_MAP[trackedOrder.paymentStatus] || trackedOrder.paymentStatus}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Дүн:</span>{" "}
                          <span className="font-bold text-gray-800">₮{trackedOrder.total.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Дэлгүүр:</span>{" "}
                          <span className="font-medium text-gray-700">{trackedOrder.organizationName}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Огноо:</span>{" "}
                          <span className="font-medium text-gray-700">
                            {new Date(trackedOrder.createdAt).toLocaleDateString("mn-MN")}
                          </span>
                        </div>
                        {trackedOrder.deliveryCode && (
                          <div className="col-span-2">
                            <span className="text-gray-400">Хүргэлтийн код:</span>{" "}
                            <span className="font-mono font-bold text-orange-600">{trackedOrder.deliveryCode}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status timeline */}
                    <div className="rounded-xl bg-white p-3 ring-1 ring-gray-100">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Төлөв</p>
                      <div className="flex items-center gap-1">
                        {["PENDING", "CONFIRMED", "PREPARED", "SHIPPING", "COMPLETED"].map((step, i) => {
                          const steps = ["PENDING", "CONFIRMED", "PREPARED", "SHIPPING", "COMPLETED"];
                          const currentIdx = steps.indexOf(trackedOrder.status);
                          const isCancelled = trackedOrder.status === "CANCELLED";
                          const isActive = !isCancelled && i <= currentIdx;
                          return (
                            <React.Fragment key={step}>
                              <div
                                className={`h-2 flex-1 rounded-full ${
                                  isCancelled
                                    ? "bg-red-200"
                                    : isActive
                                      ? "bg-orange-500"
                                      : "bg-gray-100"
                                }`}
                              />
                            </React.Fragment>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-gray-400">Хүлээгдэж</span>
                        <span className="text-[9px] text-gray-400">Хүргэгдсэн</span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="rounded-xl bg-white p-3 ring-1 ring-gray-100">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Бараанууд</p>
                      <div className="space-y-1">
                        {trackedOrder.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-[12px]">
                            <span className="text-gray-700 truncate flex-1 mr-2">{item.name}</span>
                            <span className="text-gray-400 shrink-0">{item.qty}ш</span>
                            <span className="font-medium text-gray-700 ml-2 shrink-0">₮{item.subtotal.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 border-t border-gray-100 pt-1.5 flex justify-between text-[12px]">
                        <span className="text-gray-500">Нийт:</span>
                        <span className="font-bold text-gray-800">₮{trackedOrder.total.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Delivery info */}
                    {trackedOrder.delivery && (
                      <div className="rounded-xl bg-blue-50 p-3 ring-1 ring-blue-100">
                        <p className="text-[11px] font-semibold text-blue-600 mb-1">Хүргэлт</p>
                        <p className="text-[12px] text-blue-800">
                          {trackedOrder.delivery.status === "COMPLETED"
                            ? `Хүргэгдсэн: ${new Date(trackedOrder.delivery.deliveredAt || "").toLocaleDateString("mn-MN")}`
                            : trackedOrder.delivery.status === "DELIVERING"
                              ? "Хүргэлтэнд гарсан"
                              : trackedOrder.delivery.status === "PICKING"
                                ? "Бэлтгэж байна"
                                : "Хүлээгдэж байна"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state (guest only) */}
                {!user && !trackedOrder && !trackError && !trackLoading && (
                  <div className="text-center py-4">
                    <Package size={28} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-[12px] text-gray-400">
                      Захиалгын дугаараа оруулаад хайна уу
                    </p>
                    <p className="text-[10px] text-gray-300 mt-1">
                      Жишээ: ORD-20260420-123456
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── Normal Chat ── */
            <>
              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5"
                style={{ maxHeight: 320, scrollbarWidth: "thin", overscrollBehavior: "contain" }}
              >
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`flex ${msg.sender === "VISITOR" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                          msg.sender === "ADMIN"
                            ? "rounded-2xl rounded-bl-md bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100"
                            : msg.sender === "BOT"
                              ? "rounded-2xl rounded-bl-md bg-gray-50 text-gray-700 ring-1 ring-gray-100"
                              : "rounded-2xl rounded-br-md bg-orange-500 text-white"
                        }`}
                      >
                        {msg.sender === "ADMIN" && (
                          <p className="text-[10px] font-medium text-indigo-400 mb-0.5">Оператор</p>
                        )}
                        <p className="whitespace-pre-line">
                          {renderMessageText(msg.text, msg.sender !== "VISITOR")}
                        </p>
                        <p
                          className={`mt-1 text-[9px] text-right ${
                            msg.sender === "VISITOR" ? "text-white/60" : "text-gray-400"
                          }`}
                        >
                          {msg.time}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <AnimatePresence>
                  {botTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex justify-start"
                    >
                      <div className="rounded-2xl rounded-bl-md bg-gray-50 text-gray-700 ring-1 ring-gray-100 px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <motion.span
                            className="h-1.5 w-1.5 rounded-full bg-gray-400"
                            animate={{ y: [0, -3, 0] }}
                            transition={{ repeat: Infinity, duration: 0.7, delay: 0 }}
                          />
                          <motion.span
                            className="h-1.5 w-1.5 rounded-full bg-gray-400"
                            animate={{ y: [0, -3, 0] }}
                            transition={{ repeat: Infinity, duration: 0.7, delay: 0.12 }}
                          />
                          <motion.span
                            className="h-1.5 w-1.5 rounded-full bg-gray-400"
                            animate={{ y: [0, -3, 0] }}
                            transition={{ repeat: Infinity, duration: 0.7, delay: 0.24 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
          </div>

          {/* Quick replies — compact row */}
          <div className="border-t border-gray-100 px-3 py-2 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {QUICK_REPLIES.map((q) => {
              const Icon = q.icon;
              return (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => handleSend(QUICK_REPLY_TEXT[q.key])}
                  disabled={loading}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 disabled:opacity-40 ${
                    activeQuickKey === q.key
                      ? "border-orange-300 bg-orange-50 text-orange-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                  }`}
                >
                  <Icon size={13} className="shrink-0" />
                  {q.label}
                </button>
              );
            })}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-gray-100 px-3 py-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Асуултаа бичнэ үү..."
              className="flex-1 rounded-full bg-gray-50 px-3.5 py-2 text-[13px] outline-none transition-all focus:bg-gray-100 focus:ring-1 focus:ring-orange-200"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition-all hover:bg-orange-600 disabled:opacity-30"
            >
              <Send size={14} />
            </button>
          </form>
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={open ? () => setOpen(false) : handleOpen}
        className="fixed bottom-[88px] md:bottom-6 right-5 z-50 flex h-12 w-12 md:h-13 md:w-13 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 active:scale-95 md:right-8"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}
