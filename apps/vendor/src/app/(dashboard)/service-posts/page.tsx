"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  Search,
  X,
  ImageIcon,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Megaphone,
  Tag,
  Eye,
  DollarSign,
  ClipboardList,
  Clock,
  Check,
  XCircle,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";

/* ─── Types ──────────────────────────────────────────────────────────── */
interface ServicePostImage {
  id: string;
  url: string;
}

interface ServicePost {
  id: string;
  title: string;
  description: string | null;
  priceText: string | null;
  tags: string[];
  isActive: boolean;
  viewCount: number;
  images: ServicePostImage[];
  createdAt: string;
}

type ServiceRequestStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface ServiceRequest {
  id: string;
  servicePostId: string | null;
  title: string;
  description: string | null;
  status: ServiceRequestStatus;
  statusLabel?: string;
  createdAt: string;
  updatedAt: string;
  requestedBy: {
    id: string;
    email: string | null;
    profile: {
      fullName: string | null;
      phoneNumber: string | null;
    } | null;
  };
}

type FormState = {
  title: string;
  description: string;
  priceText: string;
  tags: string;
  images: string[];
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  priceText: "",
  tags: "",
  images: [],
  isActive: true,
};

const MAX_IMAGES = 5;

const REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  PENDING: "Хүлээгдэж буй",
  IN_PROGRESS: "Хийгдэж буй",
  COMPLETED: "Дууссан",
  CANCELLED: "Цуцлагдсан",
};

const REQUEST_STATUS_CLASS: Record<ServiceRequestStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

/* ─── Image Upload Grid ──────────────────────────────────────────────── */
function ImageUploadGrid({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    let current = [...images];
    for (const file of files) {
      if (current.length >= MAX_IMAGES) break;
      const reader = new FileReader();
      reader.onloadend = () => {
        current = [...current, reader.result as string];
        onChange(current.slice(0, MAX_IMAGES));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const moveImage = (from: number, to: number) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const slots = Array.from({ length: MAX_IMAGES });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Зурагнууд ({images.length}/{MAX_IMAGES})
        </label>
        {images.length > 0 && (
          <span className="text-[10px] text-slate-400">Үндсэн зураг: эхний зураг</span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {slots.map((_, idx) => {
          const img = images[idx];
          const isFirst = idx === 0;

          if (img) {
            return (
              <div
                key={idx}
                draggable
                onDragStart={() => setDragging(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragging !== null && dragging !== idx) moveImage(dragging, idx);
                  setDragging(null);
                }}
                className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
                  isFirst ? "border-amber-400" : "border-slate-200"
                } ${dragging === idx ? "opacity-50 scale-95" : ""}`}
              >
                <img src={img} alt={`Зураг ${idx + 1}`} className="w-full h-full object-cover" />
                {isFirst && (
                  <div className="absolute top-1 left-1 bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                    Үндсэн
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X size={11} />
                </button>
              </div>
            );
          }

          const canAdd = idx === images.length;
          return (
            <label
              key={idx}
              className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors ${
                canAdd
                  ? "border-slate-300 hover:border-amber-400 hover:bg-amber-50 cursor-pointer"
                  : "border-slate-100 bg-slate-50/50 cursor-not-allowed"
              }`}
            >
              {canAdd ? (
                <>
                  <ImageIcon size={18} className="text-slate-300 mb-1" />
                  <span className="text-[10px] font-bold text-slate-400">Нэмэх</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleInputChange}
                  />
                </>
              ) : (
                <span className="text-[10px] text-slate-200">{idx + 1}</span>
              )}
            </label>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 mt-2">
        Зурагнуудыг чирэх замаар дахин эрэмбэлж болно. Эхний зураг үндсэн зураг болно.
      </p>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function ServicePostsPage() {
  const [posts, setPosts] = useState<ServicePost[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<ServicePost | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const getOrgId = () => {
    try {
      const user = JSON.parse(localStorage.getItem("vendor_user") || "{}");
      return user.organizationId as string | undefined;
    } catch {
      return undefined;
    }
  };

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPosts = useCallback(async () => {
    const orgId = getOrgId();
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await authFetch(`${API}/service-posts?organizationId=${orgId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);

      const requestRes = await authFetch(`${API}/service-requests/organization/${orgId}`);
      if (requestRes.ok) {
        const requestData = await requestRes.json();
        setServiceRequests(Array.isArray(requestData) ? requestData : []);
      }
    } catch {
      showToast("error", "Постуудыг ачаалахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (p: ServicePost) => {
    setForm({
      title: p.title,
      description: p.description || "",
      priceText: p.priceText || "",
      tags: p.tags.join(", "),
      images: p.images.map((img) => img.url),
      isActive: p.isActive,
    });
    setEditingId(p.id);
    setFormOpen(true);
    setSelectedPost(null);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast("error", "Гарчиг оруулна уу");
      return;
    }

    const orgId = getOrgId();
    if (!orgId) {
      showToast("error", "Байгууллагын мэдээлэл олдсонгүй");
      return;
    }

    const parsedTags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      organizationId: orgId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      priceText: form.priceText.trim() || null,
      tags: parsedTags,
      images: form.images,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      const url = editingId ? `${API}/service-posts/${editingId}` : `${API}/service-posts`;
      const method = editingId ? "PATCH" : "POST";
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Алдаа");
      }
      showToast("success", editingId ? "Пост шинэчлэгдлээ" : "Пост нэмэгдлээ");
      closeForm();
      fetchPosts();
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Энэ постыг устгах уу?")) return;
    setDeletingId(id);
    try {
      const res = await authFetch(`${API}/service-posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("success", "Пост устгагдлаа");
      setPosts((prev) => prev.filter((p) => p.id !== id));
      if (selectedPost?.id === id) setSelectedPost(null);
    } catch {
      showToast("error", "Устгахад алдаа гарлаа");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (post: ServicePost) => {
    try {
      const res = await authFetch(`${API}/service-posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !post.isActive }),
      });
      if (!res.ok) throw new Error();
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, isActive: !p.isActive } : p)));
      if (selectedPost?.id === post.id) setSelectedPost((prev) => prev && { ...prev, isActive: !prev.isActive });
    } catch {
      showToast("error", "Төлөв шинэчлэхэд алдаа гарлаа");
    }
  };

  const updateRequestStatus = async (requestId: string, status: ServiceRequestStatus) => {
    setRequestActionLoading(requestId);
    try {
      const res = await authFetch(`${API}/service-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Төлөв шинэчлэхэд алдаа гарлаа");
      }
      const updated = await res.json();
      setServiceRequests((prev) => prev.map((item) => (item.id === requestId ? { ...item, ...updated } : item)));
      showToast("success", "Хүсэлтийн төлөв шинэчлэгдлээ");
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Төлөв шинэчлэхэд алдаа гарлаа");
    } finally {
      setRequestActionLoading(null);
    }
  };

  const deleteCompletedRequest = async (requestId: string) => {
    if (!confirm("Дууссан хүсэлтийг устгах уу?")) return;

    setRequestActionLoading(requestId);
    try {
      const res = await authFetch(`${API}/service-requests/${requestId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Хүсэлт устгахад алдаа гарлаа");
      }
      setServiceRequests((prev) => prev.filter((item) => item.id !== requestId));
      showToast("success", "Хүсэлт устгагдлаа");
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Хүсэлт устгахад алдаа гарлаа");
    } finally {
      setRequestActionLoading(null);
    }
  };

  const filteredPosts = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const activePosts = posts.filter((p) => p.isActive).length;
  const requestsByPostId = useMemo(() => {
    const map = new Map<string, ServiceRequest[]>();
    for (const request of serviceRequests) {
      if (!request.servicePostId) continue;
      const list = map.get(request.servicePostId) || [];
      list.push(request);
      map.set(request.servicePostId, list);
    }
    return map;
  }, [serviceRequests]);
  const selectedPostRequests = selectedPost ? requestsByPostId.get(selectedPost.id) || [] : [];
  const pendingRequests = serviceRequests.filter((request) => request.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white transition-all ${
            toast.type === "success" ? "bg-amber-500" : "bg-red-500"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-8 py-6 flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Үйлчилгээний постууд</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Байгууллагынхаа үзүүлэх үйлчилгээнүүдийг энд бүртгэж, харуулна
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Шинэ пост нэмэх
        </button>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-slate-100 px-8 py-3 flex items-center gap-8">
        <div className="flex items-center gap-2">
          <Megaphone size={15} className="text-amber-500" />
          <span className="text-sm text-slate-600">
            Нийт: <strong className="text-slate-900">{posts.length}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-sm text-slate-500">
            Идэвхтэй: <strong className="text-slate-900">{activePosts}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-300" />
          <span className="text-sm text-slate-500">
            Нуусан: <strong className="text-slate-900">{posts.length - activePosts}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ClipboardList size={15} className="text-blue-500" />
          <span className="text-sm text-slate-500">
            Хүсэлт: <strong className="text-slate-900">{serviceRequests.length}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-amber-500" />
          <span className="text-sm text-slate-500">
            Хүлээгдэж буй: <strong className="text-slate-900">{pendingRequests}</strong>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: list */}
        <div
          className={`flex flex-col transition-all duration-300 ${selectedPost ? "w-[420px] border-r border-slate-200" : "flex-1"}`}
        >
          {/* Search bar */}
          <div className="px-6 py-4 bg-white border-b border-slate-100">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Post list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-3" />
                <span className="text-sm">Ачааллаж байна...</span>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <Megaphone size={40} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  {searchQuery ? "Хайлтад тохирох пост олдсонгүй" : "Үйлчилгээний пост байхгүй байна"}
                </p>
                {!searchQuery && (
                  <button
                    onClick={openAdd}
                    className="mt-4 text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1"
                  >
                    <Plus size={13} />
                    Эхний постоо нэмэх
                  </button>
                )}
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)}
                  className={`group bg-white rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                    selectedPost?.id === post.id
                      ? "border-amber-400 shadow-md ring-2 ring-amber-100"
                      : "border-slate-200 hover:border-amber-200"
                  }`}
                >
                  <div className="flex items-start gap-3 p-4">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      {post.images[0] ? (
                        <img
                          src={post.images[0].url}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Megaphone size={20} className="text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
                          {post.title}
                        </p>
                        <span
                          className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            post.isActive
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {post.isActive ? "Идэвхтэй" : "Нуусан"}
                        </span>
                      </div>
                      {post.priceText && (
                        <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                          <DollarSign size={11} />
                          {post.priceText}
                        </p>
                      )}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {post.tags.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{post.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Eye size={11} /> {post.viewCount}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <ClipboardList size={11} /> {requestsByPostId.get(post.id)?.length || 0}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(post.createdAt).toLocaleDateString("mn-MN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="border-t border-slate-100 px-4 py-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(post); }}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-amber-600 transition-colors"
                    >
                      {post.isActive ? (
                        <ToggleRight size={16} className="text-amber-500" />
                      ) : (
                        <ToggleLeft size={16} />
                      )}
                      {post.isActive ? "Нуух" : "Идэвхжүүлэх"}
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEdit(post); }}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-600 transition-colors px-2 py-1 rounded-lg hover:bg-amber-50"
                    >
                      <Pencil size={13} />
                      Засах
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                      disabled={deletingId === post.id}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === post.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                      Устгах
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel: post detail preview */}
        {selectedPost && (
          <div className="flex-1 overflow-y-auto bg-white p-8">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 leading-snug max-w-lg">
                {selectedPost.title}
              </h2>
              <button
                onClick={() => setSelectedPost(null)}
                className="text-slate-400 hover:text-slate-600 ml-4 shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {selectedPost.images.length > 0 && (
              <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                {selectedPost.images.map((img, i) => (
                  <img
                    key={img.id}
                    src={img.url}
                    alt={`Зураг ${i + 1}`}
                    className={`rounded-2xl object-cover shrink-0 ${i === 0 ? "w-56 h-56" : "w-28 h-28"}`}
                  />
                ))}
              </div>
            )}

            {selectedPost.priceText && (
              <div className="flex items-center gap-2 mb-4 text-amber-700 font-semibold text-base">
                <DollarSign size={16} />
                {selectedPost.priceText}
              </div>
            )}

            {selectedPost.description && (
              <p className="text-sm text-slate-700 leading-relaxed mb-5 whitespace-pre-wrap">
                {selectedPost.description}
              </p>
            )}

            {selectedPost.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedPost.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 font-medium px-3 py-1 rounded-full"
                  >
                    <Tag size={11} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mb-6 border-t border-slate-100 pt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <ClipboardList size={16} className="text-amber-500" />
                  Постын хүсэлтүүд
                </h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {selectedPostRequests.length}
                </span>
              </div>

              {selectedPostRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Энэ пост дээр одоогоор web-ээс ирсэн хүсэлт алга.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedPostRequests.map((request) => {
                    const requesterName =
                      request.requestedBy?.profile?.fullName ||
                      request.requestedBy?.email ||
                      "Нэр бүртгэгдээгүй";
                    const isUpdating = requestActionLoading === request.id;

                    return (
                      <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 line-clamp-1">{request.title}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <User size={12} />
                              {requesterName}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${REQUEST_STATUS_CLASS[request.status]}`}>
                            {request.statusLabel || REQUEST_STATUS_LABELS[request.status]}
                          </span>
                        </div>

                        {request.description && (
                          <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-3 text-xs leading-relaxed text-slate-600">
                            {request.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {request.requestedBy?.email && (
                            <span className="flex items-center gap-1">
                              <Mail size={12} />
                              {request.requestedBy.email}
                            </span>
                          )}
                          {request.requestedBy?.profile?.phoneNumber && (
                            <span className="flex items-center gap-1">
                              <Phone size={12} />
                              {request.requestedBy.profile.phoneNumber}
                            </span>
                          )}
                          <span>{new Date(request.createdAt).toLocaleDateString("mn-MN")}</span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {request.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateRequestStatus(request.id, "IN_PROGRESS")}
                                disabled={isUpdating}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                              >
                                {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
                                Эхлүүлэх
                              </button>
                              <button
                                type="button"
                                onClick={() => updateRequestStatus(request.id, "CANCELLED")}
                                disabled={isUpdating}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                              >
                                <XCircle size={13} />
                                Цуцлах
                              </button>
                            </>
                          )}
                          {request.status === "IN_PROGRESS" && (
                            <button
                              type="button"
                              onClick={() => updateRequestStatus(request.id, "COMPLETED")}
                              disabled={isUpdating}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                              Дуусгах
                            </button>
                          )}
                          {request.status === "COMPLETED" && (
                            <button
                              type="button"
                              onClick={() => deleteCompletedRequest(request.id)}
                              disabled={isUpdating}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                            >
                              {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                              Устгах
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => openEdit(selectedPost)}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 transition-colors"
              >
                <Pencil size={14} />
                Засах
              </button>
              <button
                onClick={() => handleDelete(selectedPost.id)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-red-500 border border-red-200 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                Устгах
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sliding Drawer for Add/Edit */}
      {formOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={closeForm}
          />
          <div
            ref={drawerRef}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId ? "Пост засах" : "Шинэ пост нэмэх"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingId ? "Постын мэдээллийг шинэчил" : "Үйлчилгээгээ танилцуулах постоо үүсгэ"}
                </p>
              </div>
              <button
                onClick={closeForm}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer form */}
            <form className="flex-1 overflow-y-auto px-6 py-6 space-y-5" onSubmit={handleSave}>
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Гарчиг <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Жишээ: Нягтлан бодох үйлчилгээ"
                  maxLength={200}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Дэлгэрэнгүй тайлбар
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Үйлчилгээний дэлгэрэнгүй тайлбар, онцлог, хамрах хүрээ..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all resize-none"
                />
              </div>

              {/* Price text */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Үнийн мэдэгдэл
                </label>
                <div className="relative">
                  <DollarSign
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={form.priceText}
                    onChange={(e) => setForm((f) => ({ ...f, priceText: e.target.value }))}
                    placeholder="Жишээ: 150,000₮-аас эхлэн, Тохиролцооны..."
                    maxLength={100}
                    className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Тодорхой үнэ байхгүй бол "Тохиролцооны" гэх мэт текст оруулна уу
                </p>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Түлхүүр үгс
                </label>
                <div className="relative">
                  <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="нягтлан, татвар, санхүү (таслалаар тусгаарлана)"
                    className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Хамааралтай түлхүүр үгсийг таслалаар тусгаарлан оруулна уу
                </p>
              </div>

              {/* Images */}
              <ImageUploadGrid
                images={form.images}
                onChange={(images) => setForm((f) => ({ ...f, images }))}
              />

              {/* Active toggle */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Нийтлэх</p>
                  <p className="text-xs text-slate-400">
                    {form.isActive ? "Зочдод харагдана" : "Нуугдсан байна"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className="transition-colors"
                >
                  {form.isActive ? (
                    <ToggleRight size={32} className="text-amber-500" />
                  ) : (
                    <ToggleLeft size={32} className="text-slate-400" />
                  )}
                </button>
              </div>
            </form>

            {/* Drawer footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3 shrink-0 bg-white">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Цуцлах
              </button>
              <button
                type="submit"
                form=""
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-11 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {saving ? "Хадгалж байна..." : editingId ? "Шинэчлэх" : "Нийтлэх"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
