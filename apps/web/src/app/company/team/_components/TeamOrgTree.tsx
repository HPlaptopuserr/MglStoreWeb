"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  BriefcaseBusiness,
  Mail,
  RotateCcw,
  Sparkles,
  X,
  Users,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  CARD_GRADIENTS,
  DEFAULT_TEAM_ORG_LAYOUT,
  TeamCompanyInfo,
  TeamCompanyNode,
  TeamMember,
  TeamOrgLayoutSettings,
  TEAM_ORG_DISCONNECTED_COMPANY_ID,
} from "./team-types";
import { resolveApiAssetUrl } from "@/lib/api";

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

function getCenteredRowPoints(count: number, itemWidth: number, gap: number, chartWidth: number) {
  if (count <= 0) return [];
  const totalWidth = count * itemWidth + Math.max(0, count - 1) * gap;
  const start = (chartWidth - totalWidth) / 2;
  return Array.from(
    { length: count },
    (_, index) => start + index * (itemWidth + gap) + itemWidth / 2,
  );
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
                <img src={resolveApiAssetUrl(member.avatarUrl)} alt={member.name} className="h-full w-full object-cover" />
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
  connectedCompanyName,
  width,
  onMemberSelect,
}: {
  department: string;
  members: TeamMember[];
  index: number;
  connectedCompanyName: string;
  width: number;
  onMemberSelect: (member: TeamMember) => void;
}) {
  const sortedMembers = sortByPosition(members);
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <div
      className="relative flex shrink-0 flex-col items-center pt-9"
      style={{ width }}
    >
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
          <p className="mt-1 truncate rounded-full bg-slate-50 px-2 py-1 text-[9px] font-black uppercase text-slate-400">
            {connectedCompanyName}
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
  connectedCompanyName,
  onMemberSelect,
}: {
  department: string;
  members: TeamMember[];
  index: number;
  connectedCompanyName: string;
  onMemberSelect: (member: TeamMember) => void;
}) {
  const sortedMembers = sortByPosition(members);
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
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
          <p className="mt-1 truncate text-[10px] font-black uppercase text-slate-400">
            {connectedCompanyName}
          </p>

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
                        src={resolveApiAssetUrl(member.avatarUrl)}
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
  companyInfo,
  companyNodes,
  departmentConnections,
  layout,
  onMemberSelect,
}: {
  members: TeamMember[];
  departments: [string, TeamMember[]][];
  companyInfo: TeamCompanyInfo;
  companyNodes: TeamCompanyNode[];
  departmentConnections: Record<string, string>;
  layout: TeamOrgLayoutSettings;
  onMemberSelect: (member: TeamMember) => void;
}) {
  const fallbackCompany = companyNodes[0];

  return (
    <div className="sm:hidden">
      <div className="grid grid-cols-3 gap-2">
        {companyNodes.map((node) => {
          const connectedDepartments = departments.filter(
            ([department]) => (departmentConnections[department] ?? fallbackCompany.id) === node.id,
          );
          const connectedMembers = connectedDepartments.reduce(
            (total, [, items]) => total + items.length,
            0,
          );

          return (
            <RootCompanyNode
              key={node.id}
              memberCount={connectedMembers}
              departmentCount={connectedDepartments.length}
              companyInfo={{ name: node.name, subtitle: node.subtitle }}
              width="100%"
              compact
            />
          );
        })}
      </div>
      <div className="mt-4 space-y-4">
        {departments.map(([department, departmentMembers], index) => {
          const companyId = departmentConnections[department] ?? fallbackCompany.id;
          const connectedCompany =
            companyId === TEAM_ORG_DISCONNECTED_COMPANY_ID
              ? null
              : companyNodes.find((node) => node.id === companyId) ?? fallbackCompany;

          return (
            <MobileDepartmentCard
              key={department}
              department={department}
              members={departmentMembers}
              index={index}
              connectedCompanyName={connectedCompany?.name ?? "Холбоосгүй"}
              onMemberSelect={onMemberSelect}
            />
          );
        })}
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
                <img src={resolveApiAssetUrl(member.avatarUrl)} alt={member.name} className="h-full w-full object-cover" />
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
  companyInfo,
  width,
  compact = false,
}: {
  memberCount: number;
  departmentCount: number;
  companyInfo: TeamCompanyInfo;
  width: number | string;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative z-10 mx-auto rounded-2xl border border-slate-200 bg-white text-center shadow-xl shadow-slate-950/10 ${
        compact ? "px-2 py-3" : "px-4 py-4"
      }`}
      style={{ width }}
    >
      <div className={`mx-auto flex items-center justify-center rounded-xl bg-slate-950 text-white ${
        compact ? "mb-2 h-9 w-9" : "mb-2.5 h-11 w-11"
      }`}>
        <Building2 size={compact ? 18 : 22} />
      </div>
      <h2 className={`${compact ? "text-[11px]" : "text-lg"} font-black uppercase leading-tight text-slate-950`}>
        {companyInfo.name}
      </h2>
      <p className={`${compact ? "text-[8px]" : "text-[11px]"} font-bold uppercase tracking-wide text-slate-500`}>
        ({companyInfo.subtitle})
      </p>
      <div className={`grid grid-cols-2 divide-x divide-slate-200 rounded-xl bg-slate-50 ${
        compact ? "mt-2 py-1.5" : "mt-3 py-2"
      }`}>
        <div>
          <div className={`${compact ? "text-sm" : "text-lg"} font-black text-slate-950`}>{departmentCount}</div>
          <div className={`${compact ? "text-[8px]" : "text-[10px]"} font-bold text-slate-400`}>Хэлтэс</div>
        </div>
        <div>
          <div className={`${compact ? "text-sm" : "text-lg"} font-black text-slate-950`}>{memberCount}</div>
          <div className={`${compact ? "text-[8px]" : "text-[10px]"} font-bold text-slate-400`}>Гишүүн</div>
        </div>
      </div>
    </div>
  );
}

export function TeamOrgTree({
  members,
  companyInfo,
  companyNodes,
  departmentConnections,
  departmentOrder,
  layout,
}: {
  members: TeamMember[];
  companyInfo: TeamCompanyInfo;
  companyNodes?: TeamCompanyNode[];
  departmentConnections?: Record<string, string>;
  departmentOrder?: string[];
  layout?: TeamOrgLayoutSettings;
}) {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const chartFrameRef = useRef<HTMLDivElement>(null);
  const [chartFrameWidth, setChartFrameWidth] = useState(0);
  const [zoom, setZoom] = useState(1);

  const grouped = members.reduce<Record<string, TeamMember[]>>((acc, member) => {
    const department = member.department || "Ерөнхий баг";
    acc[department] = acc[department] ? [...acc[department], member] : [member];
    return acc;
  }, {});

  const departmentOrderMap = new Map((departmentOrder ?? []).map((department, index) => [department, index]));
  const departments = Object.entries(grouped).sort(([departmentA, a], [departmentB, b]) => {
    const orderA = departmentOrderMap.get(departmentA);
    const orderB = departmentOrderMap.get(departmentB);
    if (orderA !== undefined || orderB !== undefined) {
      if (orderA === undefined) return 1;
      if (orderB === undefined) return -1;
      return orderA - orderB;
    }

    const firstA = sortByPosition(a)[0]?.order ?? 999;
    const firstB = sortByPosition(b)[0]?.order ?? 999;
    return firstA - firstB;
  });

  const nodes = (companyNodes?.length
    ? companyNodes
    : [{ id: "root-company", ...companyInfo, order: 0 }]
  )
    .map((node, index) => ({ ...node, order: index }))
    .sort((a, b) => a.order - b.order);
  const connections = departmentConnections ?? {};
  const fallbackCompany = nodes[0];
  const normalizedLayout = { ...DEFAULT_TEAM_ORG_LAYOUT, ...layout };
  const rootHeight = 164;
  const connectorTop = rootHeight + normalizedLayout.verticalGap;
  const departmentAnchorY = connectorTop + 36;
  const chartWidth = Math.max(
    departments.length * (normalizedLayout.departmentCardWidth + normalizedLayout.departmentGap),
    nodes.length * (normalizedLayout.rootCardWidth + normalizedLayout.companyGap),
    996,
  );
  const maxDepartmentMembers = Math.max(
    1,
    ...departments.map(([, departmentMembers]) => departmentMembers.length),
  );
  const estimatedDepartmentCardHeight = 128 + maxDepartmentMembers * 42;
  const chartHeight = connectorTop + 36 + estimatedDepartmentCardHeight + 36;
  const fitScale = chartFrameWidth > 0
    ? Math.min(1, Math.max(0.58, (chartFrameWidth - 24) / chartWidth))
    : 1;
  const chartScale = Math.min(1.7, Math.max(0.32, fitScale * zoom));
  const companyCenters = getCenteredRowPoints(
    nodes.length,
    normalizedLayout.rootCardWidth,
    normalizedLayout.companyGap,
    chartWidth,
  );
  const departmentCenters = getCenteredRowPoints(
    departments.length,
    normalizedLayout.departmentCardWidth,
    normalizedLayout.departmentGap,
    chartWidth,
  );
  const connectionPaths = departments.flatMap(([department], departmentIndex) => {
    const companyId = connections[department] ?? fallbackCompany.id;
    if (companyId === TEAM_ORG_DISCONNECTED_COMPANY_ID) return [];
    const companyIndex = Math.max(0, nodes.findIndex((node) => node.id === companyId));
    const startX = companyCenters[companyIndex] ?? chartWidth / 2;
    const endX = departmentCenters[departmentIndex] ?? chartWidth / 2;
    const midY = rootHeight + (departmentAnchorY - rootHeight) / 2;

    return [{
      department,
      d: `M ${startX} ${rootHeight} V ${midY} H ${endX} V ${departmentAnchorY}`,
    }];
  });

  useEffect(() => {
    const node = chartFrameRef.current;
    if (!node) return;

    const update = () => setChartFrameWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="rounded-[28px] bg-gradient-to-br from-white via-slate-50 to-white p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
        <h2 className="text-xl font-black text-slate-950">Байгууллагын бүтэц</h2>
        <p className="text-xs font-semibold text-slate-400">
          Company node-оос хэлтэсүүд рүү салаалсан org chart.
        </p>
        </div>
        <div className="flex w-fit items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setZoom((value) => Math.max(0.55, Number((value - 0.12).toFixed(2))))}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
            aria-label="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <div className="min-w-14 text-center text-xs font-black text-slate-600">
            {Math.round(chartScale * 100)}%
          </div>
          <button
            type="button"
            onClick={() => setZoom((value) => Math.min(1.8, Number((value + 0.12).toFixed(2))))}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
            aria-label="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-950"
            aria-label="Reset zoom"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <MobileOrgMap
        members={members}
        departments={departments}
        companyInfo={companyInfo}
        companyNodes={nodes}
        departmentConnections={connections}
        layout={normalizedLayout}
        onMemberSelect={setSelectedMember}
      />

      <div
        ref={chartFrameRef}
        className="hidden overflow-auto pb-3 sm:block"
        style={{ height: chartHeight * chartScale }}
      >
        <div
          className="relative mx-auto"
          style={{
            width: chartWidth,
            height: chartHeight,
            transform: `scale(${chartScale})`,
            transformOrigin: "top center",
          }}
        >
          <svg
            className="pointer-events-none absolute inset-0 z-0"
            width={chartWidth}
            height={chartHeight}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            fill="none"
            aria-hidden="true"
          >
            {connectionPaths.map((path) => (
              <path
                key={path.department}
                d={path.d}
                stroke={normalizedLayout.lineColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          <div
            className="absolute left-0 right-0 top-0 z-10 flex justify-center"
            style={{ gap: normalizedLayout.companyGap }}
          >
            {nodes.map((node) => {
              const connectedDepartments = departments.filter(
                ([department]) => (connections[department] ?? fallbackCompany.id) === node.id,
              );
              const connectedMembers = connectedDepartments.reduce(
                (total, [, items]) => total + items.length,
                0,
              );

              return (
                <div
                  key={node.id}
                  className="relative"
                  style={{ width: normalizedLayout.rootCardWidth }}
                >
                  <RootCompanyNode
                    memberCount={connectedMembers}
                    departmentCount={connectedDepartments.length}
                    companyInfo={{ name: node.name, subtitle: node.subtitle }}
                    width={normalizedLayout.rootCardWidth}
                  />
                </div>
              );
            })}
          </div>

          <div
            className="absolute left-0 right-0 z-10 flex justify-center px-0"
            style={{ top: connectorTop, gap: normalizedLayout.departmentGap }}
          >
            {departments.map(([department, departmentMembers], index) => {
              const companyId = connections[department] ?? fallbackCompany.id;
              const connectedCompany =
                companyId === TEAM_ORG_DISCONNECTED_COMPANY_ID
                  ? null
                  : nodes.find((node) => node.id === companyId) ?? fallbackCompany;

              return (
                <DepartmentNode
                  key={department}
                  department={department}
                  members={departmentMembers}
                  index={index}
                  connectedCompanyName={connectedCompany?.name ?? "Холбоосгүй"}
                  width={normalizedLayout.departmentCardWidth}
                  onMemberSelect={setSelectedMember}
                />
              );
            })}
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
