"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { API } from "@/lib/api";
import {
  Linkedin, Mail, Award, Briefcase, Building2, Users,
  User, ChevronRight,
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
      .then((r) => r.ok ? r.json() : [])
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { members, loading };
}

function MemberCard({ m }: { m: TeamMember }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-gray-900/8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Top color bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#FFAD02] via-amber-300 to-orange-400" />

      <div className="flex flex-col gap-4 p-5 sm:p-6">
        {/* Avatar + basic info */}
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-gray-900/8 sm:h-20 sm:w-20">
            {m.avatarUrl ? (
              <Image src={m.avatarUrl} alt={m.name} fill className="object-cover" sizes="80px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
                <User size={28} className="text-[#FFAD02]" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-base font-black text-gray-900 sm:text-lg">{m.name}</h3>
            <p className="mt-0.5 text-sm font-semibold text-[#FFAD02]">{m.role}</p>

            {(m.department || m.experience) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {m.department && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Building2 size={11} />
                    {m.department}
                  </span>
                )}
                {m.department && m.experience && <span className="text-gray-200">·</span>}
                {m.experience && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Award size={11} />
                    {m.experience}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {m.bio && (
          <div>
            <p className={`text-sm leading-relaxed text-gray-500 ${!expanded && "line-clamp-3"}`}>
              {m.bio}
            </p>
            {m.bio.length > 120 && (
              <button
                onClick={() => setExpanded((p) => !p)}
                className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold text-[#FFAD02] hover:text-amber-600"
              >
                {expanded ? "Хураах" : "Дэлгэрэнгүй"}
                <ChevronRight size={12} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
              </button>
            )}
          </div>
        )}

        {/* Skills */}
        {m.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {m.skills.map((s) => (
              <span
                key={s}
                className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Footer links */}
        {(m.email || m.linkedinUrl) && (
          <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
            {m.email && (
              <a
                href={`mailto:${m.email}`}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition hover:bg-amber-50 hover:text-[#FFAD02]"
                title={m.email}
              >
                <Mail size={14} />
              </a>
            )}
            {m.linkedinUrl && (
              <a
                href={m.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                title="LinkedIn"
              >
                <Linkedin size={14} />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-gray-900/8 shadow-sm">
      <div className="h-1.5 w-full bg-gray-100" />
      <div className="p-5 sm:p-6">
        <div className="flex gap-4">
          <div className="h-16 w-16 shrink-0 rounded-2xl bg-gray-100 sm:h-20 sm:w-20" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-2/3 rounded-full bg-gray-100" />
            <div className="h-3 w-1/2 rounded-full bg-gray-100" />
            <div className="h-3 w-1/3 rounded-full bg-gray-100" />
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="h-3 w-full rounded-full bg-gray-100" />
          <div className="h-3 w-4/5 rounded-full bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { members, loading } = useTeam();

  const departments = Array.from(new Set(members.map((m) => m.department).filter(Boolean))) as string[];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative overflow-hidden bg-[#0A0A0A]" style={{ marginTop: "-160px", paddingTop: "160px" }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#FFAD02]/8 blur-[100px]" />
        </div>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,173,2,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,173,2,0.8) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-4xl px-4 pb-14 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-20">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#FFAD02]/20 bg-[#FFAD02]/10 px-4 py-1.5">
            <Users size={12} className="text-[#FFAD02]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#FFAD02]">
              Баг хамт олон
            </span>
          </div>

          <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">
            Манай <span className="text-[#FFAD02]">Баг</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/40 sm:text-base">
            MGL Store-ийг хөгжүүлж буй мэргэжлийн баг хамт олонтойгоо танилцаарай
          </p>

          {!loading && (
            <div className="mt-8 inline-flex items-center gap-6 rounded-2xl border border-white/8 bg-white/[0.04] px-7 py-4">
              <div className="text-center">
                <div className="text-2xl font-black text-white">{members.length}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Гишүүд</div>
              </div>
              {departments.length > 0 && (
                <>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="text-center">
                    <div className="text-2xl font-black text-white">{departments.length}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Хэлтэс</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <Users size={28} className="text-gray-300" />
            </div>
            <p className="text-base font-bold text-gray-400">Гишүүдийн мэдээлэл удахгүй нэмэгдэнэ</p>
          </div>
        ) : (
          <div>
            {departments.length > 0
              ? departments.map((dept) => {
                  const deptMembers = members.filter((m) => m.department === dept);
                  return (
                    <div key={dept} className="mb-14 last:mb-0">
                      <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
                          <Briefcase size={15} className="text-[#FFAD02]" />
                        </div>
                        <h2 className="text-lg font-black text-gray-900">{dept}</h2>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-500">
                          {deptMembers.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {deptMembers.map((m) => <MemberCard key={m.id} m={m} />)}
                      </div>
                    </div>
                  );
                })
              : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((m) => <MemberCard key={m.id} m={m} />)}
                </div>
              )
            }
          </div>
        )}
      </div>
    </div>
  );
}
