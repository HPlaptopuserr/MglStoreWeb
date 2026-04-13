"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Search,
  Send,
  X,
  Clock,
  User,
  ChevronLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import { useAdminAuth } from "@/lib/admin-auth";

// ─── Types ──────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  sender: "VISITOR" | "BOT" | "ADMIN";
  senderId: string | null;
  text: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  visitorId: string;
  userId: string | null;
  displayName: string | null;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    profile: { fullName: string; phoneNumber: string | null } | null;
  } | null;
  messages: ChatMessage[];
}

interface SessionListItem extends Omit<ChatSession, "messages"> {
  messages: ChatMessage[]; // only last 1 message from list endpoint
}

// ─── Helpers ────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Дөнгөж сая";
  if (mins < 60) return `${mins} мин`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} цаг`;
  const days = Math.floor(hrs / 24);
  return `${days} өдөр`;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function ChatManagementPage() {
  const { hasPermission, isFullAdmin } = useAdminAuth();
  const canManage = isFullAdmin || hasPermission("MANAGE_CHAT");

  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  const [search, setSearch] = useState("");

  // Selected session detail
  const [selected, setSelected] = useState<ChatSession | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch sessions list ──
  const fetchSessions = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await adminFetch(`${API}/admin/chat/sessions?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSessions(data.data || []);
      setTotal(data.total || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchSessions();
    // Also auto-refresh every 10s
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  // ── Fetch session detail ──
  const openSession = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await adminFetch(`${API}/admin/chat/sessions/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelected(data);
    } catch {
      // silent
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages]);

  // Poll for new messages on selected session
  useEffect(() => {
    if (!selected) return;
    const poll = async () => {
      try {
        const res = await adminFetch(`${API}/admin/chat/sessions/${selected.id}`);
        if (!res.ok) return;
        const data = await res.json();
        setSelected(data);
      } catch {
        // silent
      }
    };
    pollRef.current = setInterval(poll, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selected?.id]);

  // ── Send admin reply ──
  const sendReply = async () => {
    if (!selected || !replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await adminFetch(`${API}/admin/chat/sessions/${selected.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ text: replyText.trim() }),
      });
      if (!res.ok) throw new Error();
      const newMsg = await res.json();
      setSelected((prev) =>
        prev
          ? { ...prev, messages: [...prev.messages, newMsg] }
          : prev,
      );
      setReplyText("");
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  // ── Close session ──
  const closeSession = async (id: string) => {
    try {
      await adminFetch(`${API}/admin/chat/sessions/${id}/close`, {
        method: "PATCH",
      });
      setSelected((prev) => (prev?.id === id ? { ...prev, status: "CLOSED" } : prev));
      fetchSessions();
    } catch {
      // silent
    }
  };

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-500">Энэ хуудсанд хандах эрхгүй байна.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="text-amber-500" size={28} />
          Чат удирдлага
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Хэрэглэгчдийн чат түүх, хариу өгөх
        </p>
      </div>

      <div className="flex gap-6 min-h-[calc(100vh-240px)]">
        {/* ── Sessions list panel ── */}
        <div
          className={`w-full md:w-[380px] shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col ${
            selected ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Filters */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Нэрээр хайх..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
              />
            </div>
            <div className="flex gap-2">
              {(["ALL", "OPEN", "CLOSED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s === "ALL" ? "Бүгд" : s === "OPEN" ? "Нээлттэй" : "Хаагдсан"}
                </button>
              ))}
              <span className="ml-auto text-xs text-slate-400 self-center">
                {total} чат
              </span>
            </div>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-slate-400" size={24} />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Чат олдсонгүй
              </div>
            ) : (
              sessions.map((s) => {
                const lastMsg = s.messages?.[0];
                const name =
                  s.user?.profile?.fullName || s.user?.email || s.displayName || "Зочин";
                const isSelected = selected?.id === s.id;

                return (
                  <button
                    key={s.id}
                    onClick={() => openSession(s.id)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-50 transition-colors hover:bg-slate-50 ${
                      isSelected ? "bg-amber-50 border-l-2 border-l-amber-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            s.userId
                              ? "bg-blue-100 text-blue-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {s.userId ? (
                            <User size={14} />
                          ) : (
                            "З"
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {name}
                          </p>
                          {lastMsg && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {lastMsg.sender === "ADMIN" ? "Та: " : ""}
                              {lastMsg.text.slice(0, 50)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400">
                          {timeAgo(s.updatedAt)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            s.status === "OPEN"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              s.status === "OPEN" ? "bg-emerald-400" : "bg-slate-400"
                            }`}
                          />
                          {s.status === "OPEN" ? "Нээлттэй" : "Хаагдсан"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat detail panel ── */}
        <div
          className={`flex-1 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col ${
            selected ? "flex" : "hidden md:flex"
          }`}
        >
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Чат сонгоно уу</p>
              </div>
            </div>
          ) : loadingDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
                <button
                  onClick={() => setSelected(null)}
                  className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">
                    {selected.user?.profile?.fullName ||
                      selected.user?.email ||
                      selected.displayName ||
                      "Зочин"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    {selected.user?.email && (
                      <span>{selected.user.email}</span>
                    )}
                    {selected.user?.profile?.phoneNumber && (
                      <span>{selected.user.profile.phoneNumber}</span>
                    )}
                    {!selected.userId && (
                      <span title={selected.visitorId}>
                        ID: {selected.visitorId.slice(0, 8)}...
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(selected.createdAt)}
                    </span>
                  </div>
                </div>
                {selected.status === "OPEN" && (
                  <button
                    onClick={() => closeSession(selected.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <CheckCircle2 size={14} />
                    Хаах
                  </button>
                )}
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
                style={{ scrollbarWidth: "thin" }}
              >
                {selected.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender === "VISITOR"
                        ? "justify-start"
                        : msg.sender === "ADMIN"
                          ? "justify-end"
                          : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.sender === "VISITOR"
                          ? "bg-slate-100 text-slate-800 rounded-bl-md"
                          : msg.sender === "ADMIN"
                            ? "bg-blue-500 text-white rounded-br-md"
                            : "bg-amber-50 text-amber-900 rounded-bl-md border border-amber-200"
                      }`}
                    >
                      {msg.sender === "BOT" && (
                        <p className="text-[10px] font-medium text-amber-500 mb-1">🤖 Бот</p>
                      )}
                      {msg.sender === "ADMIN" && (
                        <p className="text-[10px] font-medium text-blue-200 mb-1">👨‍💼 Админ</p>
                      )}
                      <p className="whitespace-pre-line">{msg.text}</p>
                      <p
                        className={`mt-1 text-[10px] text-right ${
                          msg.sender === "ADMIN"
                            ? "text-blue-200"
                            : msg.sender === "BOT"
                              ? "text-amber-400"
                              : "text-slate-400"
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              {selected.status === "OPEN" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendReply();
                  }}
                  className="flex items-center gap-2 border-t border-slate-100 px-4 py-3"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Хариу бичих..."
                    className="flex-1 rounded-xl bg-slate-50 px-4 py-2.5 text-sm outline-none focus:bg-slate-100 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sending}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow transition-all hover:bg-blue-600 disabled:opacity-40"
                  >
                    {sending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                  </button>
                </form>
              )}
              {selected.status === "CLOSED" && (
                <div className="border-t border-slate-100 px-4 py-3 text-center text-xs text-slate-400">
                  Энэ чат хаагдсан байна
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
