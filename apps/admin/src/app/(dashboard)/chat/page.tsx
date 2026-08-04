"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Search,
  Send,
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
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED">(
    "ALL",
  );
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
      setLoadError("");
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await adminFetch(`${API}/admin/chat/sessions?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSessions(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setLoadError("Чатын жагсаалт ачаалж чадсангүй.");
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
        const res = await adminFetch(
          `${API}/admin/chat/sessions/${selected.id}`,
        );
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
      const res = await adminFetch(
        `${API}/admin/chat/sessions/${selected.id}/reply`,
        {
          method: "POST",
          body: JSON.stringify({ text: replyText.trim() }),
        },
      );
      if (!res.ok) throw new Error();
      const newMsg = await res.json();
      setSelected((prev) =>
        prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev,
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
      setSelected((prev) =>
        prev?.id === id ? { ...prev, status: "CLOSED" } : prev,
      );
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

  const openCount = sessions.filter(
    (session) => session.status === "OPEN",
  ).length;
  const closedCount = sessions.filter(
    (session) => session.status === "CLOSED",
  ).length;

  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-slate-50 p-4 sm:-m-6 sm:p-4">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <MessageSquare size={19} />
          </span>
          <div>
            <h1 className="text-lg font-black text-slate-950">Чат удирдлага</h1>
            <p className="text-xs font-semibold text-slate-500">
              Хэрэглэгчийн хүсэлтэд хариу өгч, яриаг хянана
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
            {openCount} нээлттэй
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-500">
            {closedCount} хаагдсан
          </span>
        </div>
      </div>

      <div className="grid h-[calc(100vh-9.5rem)] min-h-[560px] gap-3 md:grid-cols-[360px_minmax(0,1fr)]">
        {/* ── Sessions list panel ── */}
        <div
          className={`min-h-0 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex-col ${
            selected ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Filters */}
          <div className="space-y-2.5 border-b border-slate-100 p-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Нэрээр хайх..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div className="flex gap-2">
              {(["ALL", "OPEN", "CLOSED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s === "ALL"
                    ? "Бүгд"
                    : s === "OPEN"
                      ? "Нээлттэй"
                      : "Хаагдсан"}
                </button>
              ))}
              <span className="ml-auto text-xs text-slate-400 self-center">
                {total} чат
              </span>
            </div>
          </div>

          {/* Session list */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-slate-400" size={24} />
              </div>
            ) : loadError ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-bold text-rose-600">{loadError}</p>
                <button
                  type="button"
                  onClick={() => fetchSessions()}
                  className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
                >
                  Дахин ачаалах
                </button>
              </div>
            ) : sessions.length === 0 ? (
              <div className="px-5 py-12 text-center text-slate-400">
                <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold text-slate-500">
                  Чат олдсонгүй
                </p>
                <p className="mt-1 text-xs">
                  Хайлт эсвэл төлвийн filter-ээ өөрчилнө үү.
                </p>
              </div>
            ) : (
              sessions.map((s) => {
                const lastMsg = s.messages?.[0];
                const name =
                  s.user?.profile?.fullName ||
                  s.user?.email ||
                  s.displayName ||
                  "Зочин";
                const isSelected = selected?.id === s.id;

                return (
                  <button
                    key={s.id}
                    onClick={() => openSession(s.id)}
                    className={`w-full border-b border-slate-100 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                      isSelected
                        ? "bg-violet-50 shadow-[inset_3px_0_0_#7c3aed]"
                        : ""
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
                          {s.userId ? <User size={14} /> : "З"}
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
                              s.status === "OPEN"
                                ? "bg-emerald-400"
                                : "bg-slate-400"
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
          className={`min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex-col ${
            selected ? "flex" : "hidden md:flex"
          }`}
        >
          {loadingDetail ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <Loader2
                  className="mx-auto animate-spin text-violet-500"
                  size={26}
                />
                <p className="mt-3 text-xs font-semibold text-slate-400">
                  Чат ачаалж байна...
                </p>
              </div>
            </div>
          ) : !selected ? (
            <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_center,_#f8fafc_0,_#ffffff_65%)] p-8">
              <div className="max-w-sm text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-500 ring-8 ring-violet-50/50">
                  <MessageSquare size={28} />
                </span>
                <h2 className="mt-5 text-base font-black text-slate-800">
                  Яриагаа сонгоно уу
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Зүүн талын жагсаалтаас хэрэглэгч сонгоход чат түүх болон хариу
                  бичих хэсэг энд нээгдэнэ.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2 text-left text-xs font-semibold text-slate-500">
                  <span className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    1. Чат сонгох
                  </span>
                  <span className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    2. Хариу өгөх
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3">
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
                    {selected.user?.email && <span>{selected.user.email}</span>}
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
                className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 px-5 py-4"
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
                          ? "rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm"
                          : msg.sender === "ADMIN"
                            ? "rounded-br-md bg-violet-600 text-white shadow-sm"
                            : "bg-amber-50 text-amber-900 rounded-bl-md border border-amber-200"
                      }`}
                    >
                      {msg.sender === "BOT" && (
                        <p className="text-[10px] font-medium text-amber-500 mb-1">
                          🤖 Бот
                        </p>
                      )}
                      {msg.sender === "ADMIN" && (
                        <p className="mb-1 text-[10px] font-medium text-violet-200">
                          Админ
                        </p>
                      )}
                      <p className="whitespace-pre-line">{msg.text}</p>
                      <p
                        className={`mt-1 text-[10px] text-right ${
                          msg.sender === "ADMIN"
                            ? "text-violet-200"
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
                  className="flex items-center gap-2 border-t border-slate-100 bg-white px-4 py-3"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Хариу бичих..."
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sending}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm transition-all hover:bg-violet-700 disabled:opacity-40"
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
