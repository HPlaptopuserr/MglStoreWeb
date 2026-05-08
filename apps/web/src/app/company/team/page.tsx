"use client";

import { useEffect, useMemo, useState } from "react";
import { API } from "@/lib/api";
import {
  Linkedin, Mail, Award, Users, User, ChevronDown, Check,
} from "lucide-react";

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
}

function useTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/team`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { members, loading };
}

// ────────────────────────────────────────────────────────────
// Department dropdown
// ────────────────────────────────────────────────────────────
function DeptDropdown({
  departments,
  value,
  onChange,
}: {
  departments: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = ["Бүгд", ...departments];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
      >
        <span className="h-2 w-2 rounded-full bg-[#FFAD02]" />
        {value === "Бүгд" ? "Бүх хэлтэс" : value}
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors ${
                  value === opt
                    ? "bg-amber-50 text-[#FFAD02]"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {opt === "Бүгд" ? "Бүх хэлтэс" : opt}
                {value === opt && <Check size={13} className="text-[#FFAD02]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Member card — premium design
// ────────────────────────────────────────────────────────────
function MemberCard({ m, index }: { m: TeamMember; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const gradients = [
    "from-amber-400 to-orange-500",
    "from-violet-400 to-purple-600",
    "from-emerald-400 to-teal-500",
    "from-sky-400 to-blue-600",
    "from-rose-400 to-pink-600",
    "from-indigo-400 to-blue-500",
  ];
  const grad = gradients[index % gradients.length];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)] ring-1 ring-gray-900/6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)]">

      {/* Header band with avatar */}
      <div className={`relative h-24 bg-gradient-to-br ${grad} sm:h-28`}>
        {/* Decorative circles */}
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-3 -left-3 h-16 w-16 rounded-full bg-white/10" />

        {/* Experience badge */}
        {m.experience && (
          <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 backdrop-blur-sm">
            <Award size={10} className="text-white/80" />
            <span className="text-[10px] font-bold text-white/90">{m.experience}</span>
          </div>
        )}

        {/* Avatar — sits on the border */}
        <div className="absolute -bottom-7 left-5 sm:-bottom-8 sm:left-6">
          <div className="relative">
            {/* Glow ring */}
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${grad} blur-[6px] opacity-40 scale-110`} />
            <div className="relative h-14 w-14 overflow-hidden rounded-full border-[3px] border-white bg-white shadow-lg sm:h-16 sm:w-16">
              {m.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
              ) : (
                <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${grad}`}>
                  <span className="text-lg font-black text-white">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-10 sm:px-6 sm:pb-6 sm:pt-11">

        {/* Name + role */}
        <div className="mb-3">
          <h3 className="text-base font-black leading-tight text-gray-900 sm:text-[17px]">
            {m.name}
          </h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#FFAD02] sm:text-[11px]">
            {m.role}
          </p>
          {m.department && (
            <p className="mt-1 text-[11px] text-gray-400">{m.department}</p>
          )}
        </div>

        {/* Divider */}
        <div className="mb-3 h-px w-full bg-gradient-to-r from-gray-100 to-transparent" />

        {/* Bio */}
        {m.bio ? (
          <div className="mb-3 flex-1">
            <p className={`text-[13px] leading-relaxed text-gray-500 ${!expanded ? "line-clamp-3" : ""}`}>
              {m.bio}
            </p>
            {m.bio.length > 100 && (
              <button
                onClick={() => setExpanded((p) => !p)}
                className="mt-1.5 text-[11px] font-bold text-[#FFAD02] hover:text-amber-600 transition-colors"
              >
                {expanded ? "Хураах ↑" : "Дэлгэрэнгүй ↓"}
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Skills */}
        {m.skills.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {m.skills.slice(0, 5).map((s) => (
              <span
                key={s}
                className="rounded-full border border-gray-100 bg-gray-50 px-2.5 py-0.5 text-[10px] font-bold text-gray-600"
              >
                {s}
              </span>
            ))}
            {m.skills.length > 5 && (
              <span className="rounded-full border border-gray-100 bg-gray-50 px-2.5 py-0.5 text-[10px] font-bold text-gray-400">
                +{m.skills.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        {(m.email || m.linkedinUrl) && (
          <div className="flex items-center gap-2 border-t border-gray-100 pt-3.5">
            {m.email && (
              <a
                href={`mailto:${m.email}`}
                title={m.email}
                className="group/btn flex h-8 w-8 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-all hover:border-amber-200 hover:bg-amber-50 hover:text-[#FFAD02]"
              >
                <Mail size={13} />
              </a>
            )}
            {m.linkedinUrl && (
              <a
                href={m.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="LinkedIn"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              >
                <Linkedin size={13} />
              </a>
            )}
            <div className="ml-auto">
              <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" title="Идэвхтэй" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Skeleton
// ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)] ring-1 ring-gray-900/6">
      <div className="h-24 bg-gray-100 sm:h-28" />
      <div className="px-5 pb-5 pt-10 sm:px-6 sm:pb-6 sm:pt-11">
        <div className="mb-1 h-4 w-1/2 rounded-full bg-gray-100" />
        <div className="mb-3 h-3 w-1/3 rounded-full bg-gray-100" />
        <div className="mb-3 h-px bg-gray-100" />
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded-full bg-gray-100" />
          <div className="h-3 w-4/5 rounded-full bg-gray-100" />
          <div className="h-3 w-3/5 rounded-full bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function TeamPage() {
  const { members, loading } = useTeam();
  const [activeDept, setActiveDept] = useState("Бүгд");

  const departments = useMemo(
    () => Array.from(new Set(members.map((m) => m.department).filter(Boolean))) as string[],
    [members],
  );

  const filtered = useMemo(
    () => activeDept === "Бүгд" ? members : members.filter((m) => m.department === activeDept),
    [members, activeDept],
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]">

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden bg-[#0A0A0A]"
        style={{ marginTop: "-160px", paddingTop: "160px" }}
      >
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#FFAD02]/7 blur-[120px]" />
          <div className="absolute -right-20 top-20 h-48 w-48 rounded-full bg-violet-500/8 blur-[80px]" />
        </div>
        {/* Grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,173,2,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,173,2,1) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-22 sm:pt-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#FFAD02]/20 bg-[#FFAD02]/10 px-4 py-1.5">
            <Users size={12} className="text-[#FFAD02]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FFAD02]">
              Баг хамт олон
            </span>
          </div>

          <h1 className="text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
            Манай{" "}
            <span className="relative">
              <span className="text-[#FFAD02]">Баг</span>
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFAD02]/50 to-transparent" />
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white/40 sm:text-base">
            MGL Store-ийг хөгжүүлж буй мэргэжлийн баг хамт олонтойгоо танилцаарай
          </p>

          {!loading && members.length > 0 && (
            <div className="mt-8 inline-flex items-center gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04]">
              <div className="px-6 py-3.5 text-center">
                <div className="text-xl font-black text-white sm:text-2xl">{members.length}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-white/30 sm:text-[10px]">Нийт гишүүн</div>
              </div>
              {departments.length > 0 && (
                <>
                  <div className="h-10 w-px bg-white/8" />
                  <div className="px-6 py-3.5 text-center">
                    <div className="text-xl font-black text-white sm:text-2xl">{departments.length}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-white/30 sm:text-[10px]">Хэлтэс</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#FAFAFA] to-transparent" />
      </div>

      {/* ── Filter bar ── */}
      {!loading && departments.length > 0 && (
        <div className="sticky top-0 z-20 border-b border-gray-100/80 bg-[#FAFAFA]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <DeptDropdown
              departments={departments}
              value={activeDept}
              onChange={setActiveDept}
            />
            <p className="text-xs text-gray-400">
              <span className="font-bold text-gray-700">{filtered.length}</span> гишүүн
            </p>
          </div>
        </div>
      )}

      {/* ── Grid ── */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/6">
              <Users size={28} className="text-gray-300" />
            </div>
            <p className="text-base font-bold text-gray-400">Гишүүдийн мэдээлэл удахгүй нэмэгдэнэ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m, i) => (
              <MemberCard key={m.id} m={m} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
