import { useState } from "react";
import {
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  ChevronDown,
  Linkedin,
  Mail,
} from "lucide-react";
import { ProfileCardCover } from "@/components/molecules/ProfileCardCover";
import { resolveApiAssetUrl } from "@/lib/api";
import { CARD_GRADIENTS, TeamMember } from "./team-types";

export function MemberCard({
  member,
  index,
}: {
  member: TeamMember;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const hasContact = Boolean(member.email || member.linkedinUrl);
  const visibleSkills = member.skills.slice(0, 3);

  return (
    <article className="group flex min-h-[390px] flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-sm shadow-slate-950/[0.03] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-2xl hover:shadow-slate-950/10">
      <ProfileCardCover
        name={member.name}
        gradient={gradient}
        avatarUrl={
          member.avatarUrl ? resolveApiAssetUrl(member.avatarUrl) : undefined
        }
        label={`#${String(member.order || index + 1).padStart(2, "0")}`}
        badge={
          member.experience ? (
            <>
              <Award size={12} />
              {member.experience}
            </>
          ) : undefined
        }
      />

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
              <BriefcaseBusiness
                size={13}
                className="shrink-0 text-slate-400"
              />
              <span className="truncate">{member.department}</span>
            </div>
          )}
        </div>

        <div className="my-4 h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />

        {member.bio ? (
          <div className="flex-1">
            <p
              className={`text-sm font-medium leading-6 text-slate-500 ${expanded ? "" : "line-clamp-4"}`}
            >
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
