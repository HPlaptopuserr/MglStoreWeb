import { useState } from "react";
import {
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  ChevronDown,
  Linkedin,
  Mail,
} from "lucide-react";
import { CARD_GRADIENTS, TeamMember } from "./team-types";

function MemberAvatar({
  member,
  gradient,
}: {
  member: TeamMember;
  gradient: string;
}) {
  return (
    <div className="absolute -bottom-10 left-6">
      <div className={`absolute inset-0 scale-110 rounded-full bg-gradient-to-br ${gradient} opacity-50 blur-lg`} />
      <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-2xl shadow-slate-950/20">
        {member.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
            <span className="text-3xl font-black text-white">
              {member.name.charAt(0).toLocaleUpperCase("mn-MN")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function MemberCard({ member, index }: { member: TeamMember; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const hasContact = Boolean(member.email || member.linkedinUrl);
  const visibleSkills = member.skills.slice(0, 3);

  return (
    <article className="group flex min-h-[390px] flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-sm shadow-slate-950/[0.03] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-2xl hover:shadow-slate-950/10">
      <div className={`relative h-[150px] bg-gradient-to-br ${gradient}`}>
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/14" />
        <div className="absolute bottom-4 right-5 h-14 w-14 rounded-full bg-white/10" />
        <div className="absolute left-5 top-4 rounded-full bg-white/18 px-3 py-1 text-[11px] font-black text-white backdrop-blur-md">
          #{String(member.order || index + 1).padStart(2, "0")}
        </div>
        {member.experience && (
          <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-md">
            <Award size={12} />
            {member.experience}
          </div>
        )}
        <MemberAvatar member={member} gradient={gradient} />
      </div>

      <div className="flex flex-1 flex-col px-6 pb-6 pt-14">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black leading-tight text-slate-950">
                {member.name}
              </h2>
              <p className="mt-1 text-xs font-black uppercase tracking-wide text-amber-500">
                {member.role || "Багийн гишүүн"}
              </p>
            </div>
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
              <BadgeCheck size={17} />
            </span>
          </div>
          {member.department && (
            <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
              <BriefcaseBusiness size={13} className="shrink-0 text-slate-400" />
              <span className="truncate">{member.department}</span>
            </div>
          )}
        </div>

        <div className="my-4 h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />

        {member.bio ? (
          <div className="flex-1">
            <p className={`text-sm font-medium leading-6 text-slate-500 ${expanded ? "" : "line-clamp-4"}`}>
              {member.bio}
            </p>
            {member.bio.length > 110 && (
              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-black text-amber-500 transition hover:text-amber-600"
              >
                {expanded ? "Хураах" : "Дэлгэрэнгүй"}
                <ChevronDown
                  size={13}
                  className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {member.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {visibleSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm"
              >
                {skill}
              </span>
            ))}
            {member.skills.length > visibleSkills.length && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-400">
                +{member.skills.length - visibleSkills.length}
              </span>
            )}
          </div>
        )}

        <div className="mt-5 flex min-h-10 items-center gap-2 border-t border-slate-100 pt-4">
          {hasContact ? (
            <>
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  title={member.email}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-500"
                >
                  <Mail size={15} />
                  <span>И-мэйл</span>
                </a>
              )}
              {member.linkedinUrl && (
                <a
                  href={member.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="LinkedIn"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
                >
                  <Linkedin size={15} />
                </a>
              )}
            </>
          ) : (
            <span className="text-xs font-bold text-slate-300">
              Холбоо барих мэдээлэл нэмэгдээгүй
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
