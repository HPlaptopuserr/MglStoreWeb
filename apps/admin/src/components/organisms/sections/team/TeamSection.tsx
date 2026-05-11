"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, Loader2, X, CheckCircle2, GripVertical,
  User, Mail, Linkedin, Briefcase, Award, Building2, Eye, EyeOff,
  Upload, ImageIcon,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string | null;
  bio: string | null;
  avatarUrl: string | null;
  email: string | null;
  linkedinUrl: string | null;
  experience: string | null;
  skills: string[];
  order: number;
  isActive: boolean;
}

const EMPTY_FORM: Omit<TeamMember, "id" | "isActive"> = {
  name: "",
  role: "",
  department: "",
  bio: "",
  avatarUrl: "",
  email: "",
  linkedinUrl: "",
  experience: "",
  skills: [],
  order: 0,
};

export function TeamSection() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`${API}/admin/team`);
      if (res.ok) setMembers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSkillInput("");
    setEditing(null);
    setModal("create");
  };

  const openEdit = (m: TeamMember) => {
    setForm({
      name: m.name,
      role: m.role,
      department: m.department ?? "",
      bio: m.bio ?? "",
      avatarUrl: m.avatarUrl ?? "",
      email: m.email ?? "",
      linkedinUrl: m.linkedinUrl ?? "",
      experience: m.experience ?? "",
      skills: m.skills,
      order: m.order,
    });
    setSkillInput("");
    setEditing(m);
    setModal("edit");
  };

  const closeModal = () => { setModal(null); setEditing(null); setError(""); };

  const handleAvatarFile = async (file: File) => {
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await adminFetch(`${API}/admin/team/upload-avatar`, { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setForm((p) => ({ ...p, avatarUrl: url }));
      } else {
        setError("Зураг upload хийхэд алдаа гарлаа");
      }
    } catch {
      setError("Зураг upload хийхэд алдаа гарлаа");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm((p) => ({ ...p, skills: [...p.skills, s] }));
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setForm((p) => ({ ...p, skills: p.skills.filter((s) => s !== skill) }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.role.trim()) {
      setError("Нэр болон албан тушаал шаардлагатай");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        ...form,
        department: form.department || null,
        bio: form.bio || null,
        avatarUrl: form.avatarUrl || null,
        email: form.email || null,
        linkedinUrl: form.linkedinUrl || null,
        experience: form.experience || null,
      };

      const res = modal === "create"
        ? await adminFetch(`${API}/admin/team`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await adminFetch(`${API}/admin/team/${editing!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      if (res.ok) {
        await load();
        closeModal();
        showSuccess(modal === "create" ? "Гишүүн нэмэгдлээ" : "Мэдээлэл шинэчлэгдлээ");
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.message || "Алдаа гарлаа");
      }
    } catch {
      setError("Сервертэй холбогдоход алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Устгах уу?")) return;
    setDeletingId(id);
    try {
      const res = await adminFetch(`${API}/admin/team/${id}`, { method: "DELETE" });
      if (res.ok) { await load(); showSuccess("Устгагдлаа"); }
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (m: TeamMember) => {
    const res = await adminFetch(`${API}/admin/team/${m.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !m.isActive }),
    });
    if (res.ok) { await load(); showSuccess(m.isActive ? "Нуугдлаа" : "Харагдаж байна"); }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Баг хамт олон</h2>
          <p className="text-sm text-slate-400">Компанийн ажилчдын жагсаалтыг удирдана</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm"
        >
          <Plus size={15} /> Гишүүн нэмэх
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={15} /> {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 size={15} className="animate-spin" /> Ачааллаж байна...
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <User size={36} className="text-slate-200" />
          <p className="text-sm font-medium text-slate-400">Гишүүн байхгүй байна</p>
          <button onClick={openCreate} className="text-xs font-semibold text-violet-600 hover:underline">
            Эхний гишүүнийг нэм
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div
              key={m.id}
              className={`flex items-center gap-4 rounded-2xl border bg-white px-4 py-3 transition-all ${
                m.isActive ? "border-slate-200" : "border-dashed border-slate-200 opacity-60"
              }`}
            >
              <GripVertical size={14} className="shrink-0 text-slate-300 cursor-grab" />

              {/* Avatar */}
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
                ) : (
                  <User size={18} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-300" />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-slate-800">{m.name}</span>
                  {!m.isActive && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">Нуусан</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">{m.role}</span>
                  {m.department && (
                    <>
                      <span className="text-slate-200">·</span>
                      <span className="text-xs text-slate-400">{m.department}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Skills */}
              <div className="hidden items-center gap-1 md:flex">
                {m.skills.slice(0, 3).map((s) => (
                  <span key={s} className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                    {s}
                  </span>
                ))}
                {m.skills.length > 3 && (
                  <span className="text-[10px] text-slate-400">+{m.skills.length - 3}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleActive(m)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title={m.isActive ? "Нуух" : "Харуулах"}
                >
                  {m.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  onClick={() => openEdit(m)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  disabled={deletingId === m.id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {deletingId === m.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-bold text-slate-800">
                {modal === "create" ? "Шинэ гишүүн нэмэх" : "Мэдээлэл засах"}
              </h3>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-4">
                {/* Name + Role */}
                <div className="grid grid-cols-2 gap-3">
                  <Field icon={<User size={14} />} label="Нэр *">
                    <input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Болд Батаар"
                      className={inputCls}
                    />
                  </Field>
                  <Field icon={<Briefcase size={14} />} label="Албан тушаал *">
                    <input
                      value={form.role}
                      onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                      placeholder="Frontend Developer"
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* Department + Experience */}
                <div className="grid grid-cols-2 gap-3">
                  <Field icon={<Building2 size={14} />} label="Хэлтэс">
                    <input
                      value={form.department ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                      placeholder="Технологийн баг"
                      className={inputCls}
                    />
                  </Field>
                  <Field icon={<Award size={14} />} label="Туршлага">
                    <input
                      value={form.experience ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, experience: e.target.value }))}
                      placeholder="5+ жил"
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* Avatar upload */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <ImageIcon size={14} /> Профайл зураг
                  </label>
                  <div className="flex items-center gap-3">
                    {/* Preview */}
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {form.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                      ) : (
                        <User size={20} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-300" />
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                          <Loader2 size={16} className="animate-spin text-violet-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-1.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60 transition-colors"
                      >
                        <Upload size={13} />
                        {uploadingAvatar ? "Байршуулж байна..." : "Зураг сонгох"}
                      </button>
                      <p className="text-[10px] text-slate-400">JPG, PNG, WebP · Дээд тал 3MB</p>
                    </div>

                    {form.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, avatarUrl: "" }))}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                        title="Зураг устгах"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Email + LinkedIn */}
                <div className="grid grid-cols-2 gap-3">
                  <Field icon={<Mail size={14} />} label="Email">
                    <input
                      value={form.email ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="bold@mglstore.mn"
                      className={inputCls}
                    />
                  </Field>
                  <Field icon={<Linkedin size={14} />} label="LinkedIn URL">
                    <input
                      value={form.linkedinUrl ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, linkedinUrl: e.target.value }))}
                      placeholder="https://linkedin.com/in/..."
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* Bio */}
                <Field icon={<User size={14} />} label="Товч намтар">
                  <textarea
                    value={form.bio ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="Хэдэн үгэнд өөрийн тухай..."
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </Field>

                {/* Skills */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Award size={14} /> Чадварууд
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                      placeholder="React, TypeScript..."
                      className={`${inputCls} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Нэм
                    </button>
                  </div>
                  {form.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {form.skills.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                          {s}
                          <button onClick={() => removeSkill(s)} className="ml-0.5 text-violet-400 hover:text-violet-700">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order */}
                <Field icon={<GripVertical size={14} />} label="Дараалал (жижиг = эхэнд)">
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Болих
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {modal === "create" ? "Нэмэх" : "Хадгалах"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 transition-all";

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}
