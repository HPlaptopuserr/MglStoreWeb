"use client";

import { useEffect, useState } from "react";
import {
    Tag,
    Plus,
    Pencil,
    ToggleLeft,
    ToggleRight,
    X,
    Check,
    Loader2,
    Hash,
    GripVertical,
    RefreshCw,
    ImagePlus,
} from "lucide-react";

const API = "http://localhost:4000/api";

type Category = {
    id: string;
    slug: string;
    name: string;
    icon: string | null;
    sortOrder: number;
    isActive: boolean;
};

type FormState = {
    slug: string;
    name: string;
    icon: string;
    sortOrder: number;
};

const empty: FormState = { slug: "", name: "", icon: "", sortOrder: 0 };

function slugify(val: string) {
    return val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Category | null>(null);
    const [form, setForm] = useState<FormState>(empty);
    const [error, setError] = useState("");

    const fetchAll = async () => {
        try {
            const res = await fetch(`${API}/admin/business-categories-all`);
            if (!res.ok) throw new Error("fetch failed");
            setCategories(await res.json());
        } catch {
            // fallback: use public endpoint
            const res = await fetch(`${API}/business-categories`);
            if (res.ok) setCategories(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const openCreate = () => {
        setEditTarget(null);
        setForm(empty);
        setError("");
        setShowModal(true);
    };

    const openEdit = (cat: Category) => {
        setEditTarget(cat);
        setForm({ slug: cat.slug, name: cat.name, icon: cat.icon ?? "", sortOrder: cat.sortOrder });
        setError("");
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.slug.trim()) {
            setError("Нэр болон slug заавал шаардлагатай");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const endpoint = editTarget
                ? `${API}/admin/business-categories/${editTarget.id}`
                : `${API}/admin/business-categories`;
            const method = editTarget ? "PATCH" : "POST";
            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    slug: form.slug,
                    name: form.name,
                    icon: form.icon || null,
                    sortOrder: form.sortOrder,
                }),
            });
            if (!res.ok) {
                const d = await res.json();
                setError(d.message || "Алдаа гарлаа");
                return;
            }
            setShowModal(false);
            fetchAll();
        } catch {
            setError("Сервертэй холбогдоход алдаа гарлаа");
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (cat: Category) => {
        try {
            await fetch(`${API}/admin/business-categories/${cat.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !cat.isActive }),
            });
            setCategories((prev) =>
                prev.map((c) => (c.id === cat.id ? { ...c, isActive: !c.isActive } : c))
            );
        } catch (e) {
            console.error(e);
        }
    };

    const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError("Зураг 2MB дотор байх ёстой");
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                setForm((f) => ({ ...f, icon: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8f9fa] font-sans">
            <div className="p-4 md:p-8 w-full max-w-5xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
                            <Tag size={26} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Бизнесийн ангиллал</h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Нийт <span className="font-bold text-slate-700">{categories.length}</span> ангилал
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setLoading(true);
                                fetchAll();
                            }}
                            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
                            disabled={loading}
                        >
                            <RefreshCw size={18} className={loading ? "animate-spin text-slate-400" : "text-slate-500"} />
                            <span className="hidden sm:inline">Шинэчлэх</span>
                        </button>
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
                        >
                            <Plus size={18} />
                            Ангилал нэмэх
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-slate-400">
                            <Loader2 size={28} className="animate-spin" />
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Tag size={48} className="mb-3 opacity-30" />
                            <p className="font-medium">Ангилал байхгүй байна</p>
                            <p className="text-sm mt-1">Дээрх товчноос шинэ ангилал нэмнэ үү</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            <div className="grid grid-cols-12 px-6 py-3 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <div className="col-span-1">#</div>
                                <div className="col-span-1">Дүрс</div>
                                <div className="col-span-3">Нэр</div>
                                <div className="col-span-3">Slug</div>
                                <div className="col-span-2">Эрэмбэ</div>
                                <div className="col-span-2 text-right">Үйлдэл</div>
                            </div>
                            {categories
                                .slice()
                                .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
                                .map((cat, idx) => (
                                    <div
                                        key={cat.id}
                                        className={`grid grid-cols-12 px-6 py-4 items-center transition-colors ${cat.isActive ? "hover:bg-slate-50" : "bg-slate-50/60 opacity-60"}`}
                                    >
                                        <div className="col-span-1 text-slate-400 text-sm font-medium">{idx + 1}</div>
                                        <div className="col-span-1 flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-slate-100 shadow-sm overflow-hidden">
                                            {cat.icon ? (
                                                cat.icon.startsWith("data:image") || cat.icon.startsWith("http") ? (
                                                    <img src={cat.icon} alt={cat.name} className="w-6 h-6 object-contain" />
                                                ) : (
                                                    <span className="text-xl">{cat.icon}</span>
                                                )
                                            ) : (
                                                <span className="text-xl text-slate-300">🏷️</span>
                                            )}
                                        </div>
                                        <div className="col-span-3">
                                            <span className="font-semibold text-slate-800 text-sm">{cat.name}</span>
                                            {!cat.isActive && (
                                                <span className="ml-2 text-xs text-slate-400 font-medium">(идэвхгүй)</span>
                                            )}
                                        </div>
                                        <div className="col-span-3">
                                            <code className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                                                {cat.slug}
                                            </code>
                                        </div>
                                        <div className="col-span-2 flex items-center gap-1 text-sm text-slate-500">
                                            <GripVertical size={14} className="text-slate-300" />
                                            {cat.sortOrder}
                                        </div>
                                        <div className="col-span-2 flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEdit(cat)}
                                                className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                                                title="Засах"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => toggleActive(cat)}
                                                className={`p-2 rounded-lg transition-colors ${cat.isActive
                                                    ? "hover:bg-amber-50 text-emerald-500 hover:text-amber-500"
                                                    : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-500"}`}
                                                title={cat.isActive ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                                            >
                                                {cat.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-900">
                                {editTarget ? "Ангилал засах" : "Шинэ ангилал нэмэх"}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Монгол нэр <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setForm((f) => ({
                                            ...f,
                                            name,
                                            slug: editTarget ? f.slug : slugify(name),
                                        }));
                                    }}
                                    placeholder="Жишээ: Хүнс, Худалдаа"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            {/* Slug */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Slug (англи) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={form.slug}
                                        onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                                        placeholder="food, retail, service..."
                                        className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Жижиг үсэг, зөвхөн a-z, 0-9, -</p>
                            </div>

                            {/* Icon */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Emoji эсвэл Дүрс (PNG/SVG)
                                </label>
                                <div className="flex gap-3 items-center">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={form.icon}
                                            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                                            placeholder="🍔 эмоджи эсвэл URL"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-ellipsis"
                                        />
                                    </div>
                                    <div className="relative shrink-0">
                                        <input
                                            type="file"
                                            accept="image/png, image/jpeg, image/svg+xml"
                                            onChange={handleIconUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            title="Зураг оруулах"
                                        />
                                        <button
                                            type="button"
                                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                                        >
                                            <ImagePlus size={16} />
                                            Зураг оруулах
                                        </button>
                                    </div>
                                </div>
                                {form.icon && (form.icon.startsWith("data:image") || form.icon.startsWith("http")) && (
                                    <div className="mt-2 flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 w-fit">
                                        <img src={form.icon} alt="Preview" className="w-8 h-8 object-contain bg-white rounded shadow-sm" />
                                        <button
                                            type="button"
                                            onClick={() => setForm((f) => ({ ...f, icon: "" }))}
                                            className="text-xs text-red-500 font-medium hover:underline"
                                        >
                                            Зургаас салгах
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Sort Order */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Эрэмбэ
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={form.sortOrder}
                                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                />
                                <p className="text-xs text-slate-400 mt-1">Жижиг тоо = эхэнд харагдана</p>
                            </div>

                            {error && (
                                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Болих
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {editTarget ? "Хадгалах" : "Нэмэх"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
