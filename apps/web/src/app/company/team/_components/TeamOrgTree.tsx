"use client";

import { useState } from "react";
import { Building2, BriefcaseBusiness, Mail, Sparkles, X, Users } from "lucide-react";
import { CARD_GRADIENTS, TeamMember } from "./team-types";

const DEPARTMENT_LABELS: Record<string, string> = {
  "Захиргаа удирдлагын хэлтэс": "Administration",
  "Бүтээгдэхүүн хөгжүүлэлтийн хэлтэс": "Product",
  "Технологийн хэлтэс": "Technology",
  "Маркетинг борлуулалтын хэлтэс": "Marketing",
  "Үйл ажиллагааны хэлтэс": "Operations",
  "Санхүүгийн хэлтэс": "Finance",
};

function getInitial(name: string) {
  return name.charAt(0).toLocaleUpperCase("mn-MN");
}

function getDepartmentLabel(department: string) {
  return DEPARTMENT_LABELS[department] ?? "Department";
}

function roleWeight(role: string) {
  const normalized = role.toLocaleLowerCase("mn-MN");

  if (normalized.includes("захирал") || normalized.includes("ceo")) return 1;
  if (normalized.includes("менежер") || normalized.includes("manager")) return 2;
  if (normalized.includes("ахлах") || normalized.includes("lead")) return 3;
  if (normalized.includes("хөгжүүлэгч") || normalized.includes("designer")) return 4;
  if (normalized.includes("мэргэжилтэн") || normalized.includes("зөвлөх")) return 5;
  return 6;
}

function sortByPosition(members: TeamMember[]) {
  return [...members].sort((a, b) => {
    const roleDiff = roleWeight(a.role) - roleWeight(b.role);
    if (roleDiff !== 0) return roleDiff;
    return (a.order || 999) - (b.order || 999);
  });
}

function EmployeeList({
  members,
  departmentIndex,
  onMemberSelect,
}: {
  members: TeamMember[];
  departmentIndex: number;
  onMemberSelect: (member: TeamMember) => void;
}) {
  return (
    <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
      {members.map((member, index) => {
        const gradient = CARD_GRADIENTS[(departmentIndex + index) % CARD_GRADIENTS.length];

        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onMemberSelect(member)}
            className="flex w-full items-center gap-2 rounded-lg text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white bg-white shadow-sm">
              {member.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
              ) : (
                <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
                  <span className="text-[10px] font-black text-white">
                    {getInitial(member.name)}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-black leading-tight text-slate-950">
                {member.name}
              </p>
              <p className="truncate text-[10px] font-semibold text-slate-500">
                {member.role || "Багийн гишүүн"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DepartmentNode({
  department,
  members,
  index,
  onMemberSelect,
}: {
  department: string;
  members: TeamMember[];
  index: number;
  onMemberSelect: (member: TeamMember) => void;
}) {
  const sortedMembers = sortByPosition(members);
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <div className="relative flex w-[160px] shrink-0 flex-col items-center pt-9">
      <span className="absolute top-0 h-9 w-px bg-slate-400" />
      <article className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.08)]">
        <div className={`h-1 bg-gradient-to-r ${gradient}`} />
        <div className="px-3 py-3 text-center">
          <h3 className="text-[12px] font-black uppercase leading-tight tracking-tight text-slate-950">
            {department}
          </h3>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            ({getDepartmentLabel(department)})
          </p>
          <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-amber-500">
            {sortedMembers.length} гишүүн
          </p>
          <EmployeeList
            members={sortedMembers}
            departmentIndex={index}
            onMemberSelect={onMemberSelect}
          />
        </div>
      </article>
    </div>
  );
}

function MobileDepartmentCard({
  department,
  members,
  index,
  onMemberSelect,
}: {
  department: string;
  members: TeamMember[];
  index: number;
  onMemberSelect: (member: TeamMember) => void;
}) {
  const sortedMembers = sortByPosition(members);
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <span className="absolute -top-4 left-1/2 h-4 w-px -translate-x-1/2 bg-slate-300" />
      <div className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${gradient}`} />

      <div className="flex items-start gap-3 pt-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
          <Users size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black uppercase text-slate-950">
                {department}
              </h3>
              <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {getDepartmentLabel(department)}
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-600">
              {sortedMembers.length}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-1.5">
            {sortedMembers.map((member, memberIndex) => {
              const memberGradient =
                CARD_GRADIENTS[(index + memberIndex) % CARD_GRADIENTS.length];

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onMemberSelect(member)}
                  className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-2 py-1.5 text-left transition active:bg-amber-50"
                >
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white bg-white shadow-sm">
                    {member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${memberGradient}`}
                      >
                        <span className="text-xs font-black text-white">
                          {getInitial(member.name)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-950">
                      {member.name}
                    </p>
                    <p className="truncate text-[10px] font-semibold text-slate-500">
                      {member.role || "Багийн гишүүн"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}

function MobileOrgMap({
  members,
  departments,
  onMemberSelect,
}: {
  members: TeamMember[];
  departments: [string, TeamMember[]][];
  onMemberSelect: (member: TeamMember) => void;
}) {
  return (
    <div className="sm:hidden">
      <RootCompanyNode
        memberCount={members.length}
        departmentCount={departments.length}
      />
      <div className="mx-auto h-7 w-px bg-slate-300" />
      <div className="space-y-4">
        {departments.map(([department, departmentMembers], index) => (
          <MobileDepartmentCard
            key={department}
            department={department}
            members={departmentMembers}
            index={index}
            onMemberSelect={onMemberSelect}
          />
        ))}
      </div>
    </div>
  );
}

function MemberProfileModal({
  member,
  onClose,
}: {
  member: TeamMember | null;
  onClose: () => void;
}) {
  if (!member) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 px-4 pb-4 pt-16 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Ажилчны мэдээлэл хаах"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <article className="relative w-full max-w-[390px] overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-2xl shadow-slate-950/30">
        <div className="relative h-32 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-800 to-amber-500">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/12" />
          <div className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100 backdrop-blur-md">
            <Sparkles size={13} />
            Team profile
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25"
          aria-label="Хаах"
        >
          <X size={18} />
        </button>

        <div className="relative px-5 pb-5 pt-[76px]">
          <div className="absolute -top-[58px] left-5 flex items-end gap-3">
            <div className="h-[120px] w-[120px] overflow-hidden rounded-[28px] border-4 border-white bg-white shadow-2xl shadow-slate-950/20">
              {member.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500">
                  <span className="text-5xl font-black text-white">
                    {getInitial(member.name)}
                  </span>
                </div>
              )}
            </div>
            {member.experience && (
              <span className="mb-3 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-600 shadow-sm">
                {member.experience}
              </span>
            )}
          </div>

          <h2 className="text-2xl font-black leading-tight tracking-tight text-slate-950">
            {member.name}
          </h2>
          <p className="mt-1 break-words text-xs font-black uppercase tracking-wide text-amber-500">
            {member.role || "Багийн гишүүн"}
          </p>
          {member.department && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-600">
              <BriefcaseBusiness size={15} className="shrink-0 text-slate-400" />
              <span>{member.department}</span>
            </div>
          )}

          {member.bio && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-medium leading-6 text-slate-600">
                {member.bio}
              </p>
            </div>
          )}

          {member.skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {member.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white shadow-xl shadow-slate-950/15 transition hover:bg-slate-800"
            >
              <Mail size={16} />
              И-мэйл илгээх
            </a>
          )}
        </div>
      </article>
    </div>
  );
}

function RootCompanyNode({
  memberCount,
  departmentCount,
}: {
  memberCount: number;
  departmentCount: number;
}) {
  return (
    <div className="relative z-10 mx-auto w-full max-w-[236px] rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center shadow-xl shadow-slate-950/10">
      <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
        <Building2 size={22} />
      </div>
      <h2 className="text-lg font-black uppercase leading-tight text-slate-950">
        MGL Store ХХК
      </h2>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        (MGL Store LLC)
      </p>
      <div className="mt-3 grid grid-cols-2 divide-x divide-slate-200 rounded-xl bg-slate-50 py-2">
        <div>
          <div className="text-lg font-black text-slate-950">{departmentCount}</div>
          <div className="text-[10px] font-bold text-slate-400">Хэлтэс</div>
        </div>
        <div>
          <div className="text-lg font-black text-slate-950">{memberCount}</div>
          <div className="text-[10px] font-bold text-slate-400">Гишүүн</div>
        </div>
      </div>
    </div>
  );
}

export function TeamOrgTree({ members }: { members: TeamMember[] }) {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const grouped = members.reduce<Record<string, TeamMember[]>>((acc, member) => {
    const department = member.department || "Ерөнхий баг";
    acc[department] = acc[department] ? [...acc[department], member] : [member];
    return acc;
  }, {});

  const departments = Object.entries(grouped).sort(([, a], [, b]) => {
    const firstA = sortByPosition(a)[0]?.order ?? 999;
    const firstB = sortByPosition(b)[0]?.order ?? 999;
    return firstA - firstB;
  });

  const chartWidth = Math.max(departments.length * 166, 996);

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
        <h2 className="text-xl font-black text-slate-950">Байгууллагын бүтэц</h2>
        <p className="text-xs font-semibold text-slate-400">
          Company node-оос хэлтэсүүд рүү салаалсан org chart.
        </p>
        </div>
      </div>

      <MobileOrgMap
        members={members}
        departments={departments}
        onMemberSelect={setSelectedMember}
      />

      <div className="hidden overflow-x-auto pb-3 sm:block">
        <div
          className="relative mx-auto min-h-[520px]"
          style={{ width: chartWidth }}
        >
          <RootCompanyNode
            memberCount={members.length}
            departmentCount={departments.length}
          />

          <div className="absolute left-1/2 top-[164px] h-[62px] w-px -translate-x-1/2 bg-slate-400" />
          <div className="absolute left-20 right-20 top-[226px] h-px bg-slate-400" />

          <div className="absolute left-0 right-0 top-[226px] flex justify-between px-0">
            {departments.map(([department, departmentMembers], index) => (
              <DepartmentNode
                key={department}
                department={department}
                members={departmentMembers}
                index={index}
                onMemberSelect={setSelectedMember}
              />
            ))}
          </div>
        </div>
      </div>

      <MemberProfileModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </section>
  );
}
