"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, Bot, Package, Truck, Handshake, Phone, HelpCircle } from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

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
  { key: "order", label: "Захиалга", icon: Package },
  { key: "delivery", label: "Хүргэлт", icon: Truck },
  { key: "partner", label: "Хамтрах", icon: Handshake },
  { key: "contact", label: "Холбоо барих", icon: Phone },
  { key: "other", label: "Бусад", icon: HelpCircle },
] as const;

const QUICK_REPLY_TEXT: Record<string, string> = {
  order: "Миний захиалга",
  delivery: "Хүргэлт хаана явж байна?",
  partner: "Хамтран ажиллах",
  contact: "Холбоо барих",
  other: "Бусад асуулт",
};

const BOT_RESPONSES: Record<string, string> = {
  "Миний захиалга":
    "Захиалгынхаа мэдээллийг харахын тулд:\n\n1. Дэлгэцийн баруун дээд буланд байгаа хүний дүрс дээр дарна уу\n2. \"Миний профайл\" хэсэг рүү орно уу\n3. Тэндээс захиалгуудаа харах боломжтой\n\nНэвтрээгүй бол эхлээд нэвтрэх шаардлагатай.",
  "Хүргэлт хаана явж байна?":
    "Хүргэлтийн мэдээллийг шалгахын тулд:\n\n1. Профайл хэсэг рүү орно уу\n2. Захиалгуудаа харна уу\n3. Тухайн захиалга дээр дарахад хүргэлтийн төлөв харагдана\n\nАсуулт байвал доор бичнэ үү.",
  "Хамтран ажиллах":
    "Бидэнтэй хамтран ажиллахыг хүсвэл:\n\n1. Доорх холбоос дээр дарна уу\n/apply/partnership\n\n2. Маягтыг бөглөнө үү\n3. Бид тантай 1–2 ажлын өдөрт холбогдоно",
  "Холбоо барих":
    "Бидэнтэй холбогдох:\n\nУтас: 7700-1234\nИ-мэйл: info@mglstore.mn\nАжлын цаг: Даваа–Баасан 09:00–18:00\n\nЭсвэл энэ чатаар шууд бичнэ үү.",
  "Бусад асуулт":
    "Асуултаа доорх талбарт бичээд илгээнэ үү. Бид аль болох хурдан хариулна.",
};

const WELCOME_TEXT =
  "Сайн байна уу!\n\nБи MGL Store-ийн туслах бот. Доорх товчнуудаас сонгох, эсвэл асуултаа бичээд илгээнэ үү.";

function getNow() {
  return new Date().toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
}

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgTimeRef = useRef<string | null>(null);

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
          displayName: user?.fullName || null,
        }),
      });
      if (!res.ok) return;
      const session = await res.json();
      setSessionId(session.id);
      localStorage.setItem(SESSION_ID_KEY, session.id);

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

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

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
        <div className="fixed bottom-24 right-5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300 md:right-8">
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
        <div className="fixed bottom-24 right-5 z-50 w-[360px] max-h-[520px] flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 md:right-8">
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

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5"
            style={{ maxHeight: 320, scrollbarWidth: "thin" }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
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
              </div>
            ))}
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
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 active:scale-95 disabled:opacity-40"
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
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={open ? () => setOpen(false) : handleOpen}
        className="fixed bottom-6 right-5 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 active:scale-95 md:right-8"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}
