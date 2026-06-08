import { Crown, Gem, Handshake, Mail, Sparkles } from "lucide-react";
import {
  CARD_GRADIENTS,
  getLeadershipGroup,
  TeamMember,
} from "./team-types";
import { resolveApiAssetUrl } from "@/lib/api";

const LEADERSHIP_SECTIONS = [
  {
    id: "founders",
    title: "Үүсгэн байгуулагчид",
    description: "Алсын хараа, стратеги, бүтээгдэхүүний чиглэлийг тодорхойлдог баг.",
    icon: Crown,
  },
  {
    id: "investors",
    title: "Хөрөнгө оруулагчид",
    description: "Өсөлт, санхүүжилт, бизнесийн өргөжилтийг дэмждэг түншүүд.",
    icon: Gem,
  },
  {
    id: "advisors",
    title: "Зөвлөхүүд",
    description: "Стратеги, үйл ажиллагаа, түншлэлийн чиглэлээр зөвлөдөг хүмүүс.",
    icon: Handshake,
  },
] as const;

function getInitial(name: string) {
  return name.charAt(0).toLocaleUpperCase("mn-MN");
}

function LeadershipCard({
  member,
  index,
}: {
  member: TeamMember;
  index: number;
}) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <article className="relative overflow-hidden rounded-3xl border border-white/70 bg-white p-5 shadow-xl shadow-slate-950/[0.06]">
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${gradient}`} />
      <div className="absolute right-5 top-5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black text-white backdrop-blur-md">
        {member.experience || "MGL"}
      </div>

      <div className="relative pt-12">
        <div className="h-24 w-24 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-2xl shadow-slate-950/20">
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveApiAssetUrl(member.avatarUrl)} alt={member.name} className="h-full w-full object-cover" />
          ) : (
            <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
              <span className="text-4xl font-black text-white">{getInitial(member.name)}</span>
            </div>
          )}
        </div>

        <h3 className="mt-5 text-xl font-black leading-tight text-slate-950">
          {member.name}
        </h3>
        <p className="mt-1 text-xs font-black uppercase tracking-wide text-amber-500">
          {member.role}
        </p>

        {member.bio && (
          <p className="mt-4 line-clamp-3 text-sm font-medium leading-6 text-slate-500">
            {member.bio}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {member.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-500"
            >
              {skill}
            </span>
          ))}
        </div>

        {member.email && (
          <a
            href={`mailto:${member.email}`}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800"
          >
            <Mail size={14} />
            Холбогдох
          </a>
        )}
      </div>
    </article>
  );
}

export function TeamLeadershipSections({ members }: { members: TeamMember[] }) {
  const grouped = LEADERSHIP_SECTIONS.map((section) => ({
    ...section,
    members: members.filter((member) => getLeadershipGroup(member) === section.id),
  })).filter((section) => section.members.length > 0);

  if (grouped.length === 0) {
    return null;
  }

  return (
    <div className="mb-10 space-y-8">
      <div className="rounded-[32px] border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-600 shadow-sm">
              <Sparkles size={13} />
              Leadership
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Удирдлага, хөрөнгө оруулагчид
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              MGL Store-ийн стратеги, өсөлт, урт хугацааны чиглэлийг дэмждэг
              гол хүмүүсийг тусад нь харууллаа.
            </p>
          </div>
        </div>
      </div>

      {grouped.map((section, sectionIndex) => {
        const Icon = section.icon;

        return (
          <section key={section.id}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
                <Icon size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950">{section.title}</h3>
                <p className="text-xs font-semibold text-slate-400">{section.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {section.members.map((member, index) => (
                <LeadershipCard
                  key={member.id}
                  member={member}
                  index={sectionIndex + index}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
