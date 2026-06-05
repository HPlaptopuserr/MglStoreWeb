"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  ArrowLeftRight,
  Building2,
  GripVertical,
  Link2,
  Loader2,
  Move,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export interface TeamLayoutMember {
  id: string;
  name: string;
  role: string;
  department: string | null;
  avatarUrl: string | null;
  order: number;
  isActive: boolean;
}

export interface TeamLayoutDepartment {
  name: string;
  count: number;
}

export interface TeamLayoutCompanyNode {
  id: string;
  name: string;
  subtitle: string;
  order: number;
}

export interface TeamOrgLayoutSettings {
  rootCardWidth: number;
  departmentCardWidth: number;
  companyGap: number;
  departmentGap: number;
  verticalGap: number;
  lineColor: string;
}

export const DEFAULT_TEAM_ORG_LAYOUT: TeamOrgLayoutSettings = {
  rootCardWidth: 236,
  departmentCardWidth: 160,
  companyGap: 24,
  departmentGap: 22,
  verticalGap: 62,
  lineColor: "#94a3b8",
};

type DragPayload =
  | { type: "company"; id: string }
  | { type: "department"; department: string }
  | { type: "member"; id: string };

const CARD_COLORS = [
  "from-amber-400 to-orange-500",
  "from-violet-400 to-fuchsia-600",
  "from-emerald-400 to-cyan-500",
  "from-blue-400 to-indigo-600",
  "from-rose-400 to-red-500",
  "from-lime-400 to-emerald-600",
];
const DISCONNECTED_COMPANY_ID = "__none__";

function getInitial(name: string) {
  return name.charAt(0).toLocaleUpperCase("mn-MN");
}

function getDragPayload(event: DragEvent, type: DragPayload["type"]) {
  try {
    const raw = event.dataTransfer.getData("application/json");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DragPayload>;
    return parsed.type === type ? parsed : null;
  } catch {
    return null;
  }
}

function groupMembersByDepartment(
  members: TeamLayoutMember[],
  departments: TeamLayoutDepartment[],
) {
  const grouped = new Map<string, TeamLayoutMember[]>();
  for (const department of departments) {
    grouped.set(department.name, []);
  }

  for (const member of members) {
    const department = member.department || "Ерөнхий баг";
    grouped.set(department, [...(grouped.get(department) ?? []), member]);
  }

  return Array.from(grouped.entries())
    .map(([department, items]) => ({
      department,
      members: [...items].sort((a, b) => a.order - b.order),
    }))
    .filter(
      (group) =>
        group.members.length > 0 ||
        departments.some((department) => department.name === group.department),
    );
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

export function TeamOrgLayoutEditor({
  departments,
  members,
  companyName = "MGL STORE ХХК",
  companySubtitle = "MGL STORE LLC",
  companyNodes,
  departmentConnections = {},
  layout = DEFAULT_TEAM_ORG_LAYOUT,
  saving,
  companySaving = false,
  layoutSaving = false,
  onEditMember,
  onCompanyInfoSave,
  onCompanyNodesSave,
  onDepartmentConnectionChange,
  onLayoutChange,
  onMoveDepartment,
  onMoveMember,
}: {
  departments: TeamLayoutDepartment[];
  members: TeamLayoutMember[];
  companyName?: string;
  companySubtitle?: string;
  companyNodes?: TeamLayoutCompanyNode[];
  departmentConnections?: Record<string, string>;
  layout?: TeamOrgLayoutSettings;
  saving: boolean;
  companySaving?: boolean;
  layoutSaving?: boolean;
  onEditMember: (memberId: string) => void;
  onCompanyInfoSave?: (next: { name: string; subtitle: string }) => void;
  onCompanyNodesSave?: (nodes: TeamLayoutCompanyNode[], connections?: Record<string, string>) => void;
  onDepartmentConnectionChange?: (department: string, companyId: string) => void;
  onLayoutChange?: (layout: TeamOrgLayoutSettings) => void;
  onMoveDepartment: (from: string, to: string) => void;
  onMoveMember: (memberId: string, targetDepartment: string, targetMemberId?: string) => void;
}) {
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const chartFrameRef = useRef<HTMLDivElement>(null);
  const [chartFrameWidth, setChartFrameWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const nodes = useMemo(
    () =>
      (companyNodes?.length
        ? companyNodes
        : [{ id: "root-company", name: companyName, subtitle: companySubtitle, order: 0 }]
      )
        .map((node, index) => ({ ...node, order: index }))
        .sort((a, b) => a.order - b.order),
    [companyName, companyNodes, companySubtitle],
  );
  const activeMembers = useMemo(
    () => members.filter((member) => member.isActive),
    [members],
  );
  const groups = useMemo(
    () => groupMembersByDepartment(activeMembers, departments),
    [activeMembers, departments],
  );
  const normalizedLayout = { ...DEFAULT_TEAM_ORG_LAYOUT, ...layout };
  const rootTop = 0;
  const rootHeight = 205;
  const connectorTop = rootTop + rootHeight + normalizedLayout.verticalGap;
  const departmentTop = connectorTop;
  const departmentAnchorY = departmentTop + 36;
  const maxDepartmentMembers = Math.max(
    1,
    ...groups.map((group) => group.members.length),
  );
  const estimatedDepartmentCardHeight = 160 + maxDepartmentMembers * 44;
  const chartHeight = departmentTop + 36 + estimatedDepartmentCardHeight + 36;
  const chartWidth = Math.max(
    groups.length * (normalizedLayout.departmentCardWidth + normalizedLayout.departmentGap),
    nodes.length * (normalizedLayout.rootCardWidth + normalizedLayout.companyGap),
    1040,
  );
  const fitScale = chartFrameWidth > 0
    ? Math.min(1, Math.max(0.32, (chartFrameWidth - 24) / chartWidth))
    : 1;
  const chartScale = Math.min(1.7, Math.max(0.25, fitScale * zoom));
  const companyCenters = getCenteredRowPoints(
    nodes.length,
    normalizedLayout.rootCardWidth,
    normalizedLayout.companyGap,
    chartWidth,
  );
  const departmentCenters = getCenteredRowPoints(
    groups.length,
    normalizedLayout.departmentCardWidth,
    normalizedLayout.departmentGap,
    chartWidth,
  );
  const connectionPaths = groups.flatMap((group, departmentIndex) => {
    const connectedCompanyId = departmentConnections[group.department] ?? nodes[0]?.id;
    if (connectedCompanyId === DISCONNECTED_COMPANY_ID) return [];
    const companyIndex = Math.max(0, nodes.findIndex((node) => node.id === connectedCompanyId));
    const startX = companyCenters[companyIndex] ?? chartWidth / 2;
    const endX = departmentCenters[departmentIndex] ?? chartWidth / 2;
    const midY = rootHeight + (departmentAnchorY - rootHeight) / 2;

    return [{
      department: group.department,
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

  const clearDragState = () => {
    setDragging(null);
    setDropTarget(null);
  };

  const saveNodes = (nextNodes: TeamLayoutCompanyNode[], nextConnections = departmentConnections) => {
    const normalized = nextNodes.map((node, index) => ({ ...node, order: index }));
    onCompanyNodesSave?.(normalized, nextConnections);
  };

  const addCompanyNode = () => {
    saveNodes([
      ...nodes,
      {
        id: `company-${Date.now()}`,
        name: "Шинэ компани",
        subtitle: "Company LLC",
        order: nodes.length,
      },
    ]);
  };

  const updateCompanyNode = (id: string, next: { name: string; subtitle: string }) => {
    if (!onCompanyNodesSave) {
      onCompanyInfoSave?.(next);
      return;
    }
    saveNodes(
      nodes.map((node) =>
        node.id === id ? { ...node, name: next.name, subtitle: next.subtitle } : node,
      ),
    );
  };

  const removeCompanyNode = (id: string) => {
    if (nodes.length <= 1) return;
    const nextNodes = nodes.filter((node) => node.id !== id);
    const nextConnections = Object.fromEntries(
      Object.entries(departmentConnections).filter(([, companyId]) => companyId !== id),
    );
    saveNodes(nextNodes, nextConnections);
  };

  const moveCompanyNode = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIndex = nodes.findIndex((node) => node.id === fromId);
    const toIndex = nodes.findIndex((node) => node.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const nextNodes = [...nodes];
    const [item] = nextNodes.splice(fromIndex, 1);
    nextNodes.splice(toIndex, 0, item);
    saveNodes(nextNodes);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-violet-950 px-5 py-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">
              <Move size={13} />
              Layout editor
            </div>
            <h3 className="mt-3 text-xl font-black tracking-tight">
              Байгууллагын бүтцийн preview
            </h3>
            <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-300">
              Company card, хэлтэс, ажилчны мөрийг чирж дараалал солино. Хэлтэс бүрийн
              холболтыг selector-оор сонгоод public preview-ийн бүтцийг admin-аас удирдана.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/10 p-2 text-center">
            <div className="rounded-xl bg-white/10 px-3 py-2">
              <div className="text-lg font-black">{nodes.length}</div>
              <div className="text-[10px] font-bold uppercase text-white/50">company</div>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2">
              <div className="text-lg font-black">{departments.length}</div>
              <div className="text-[10px] font-bold uppercase text-white/50">хэлтэс</div>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2">
              <div className="text-lg font-black">{activeMembers.length}</div>
              <div className="text-[10px] font-bold uppercase text-white/50">гишүүн</div>
            </div>
          </div>
        </div>

        {dragging && (
          <div className="mt-4 rounded-2xl border border-amber-200/20 bg-amber-300/10 px-4 py-3 text-xs font-bold text-amber-100">
            {dragging.type === "company"
              ? "Company card-ыг хүссэн байрлал дээр тавина."
              : dragging.type === "department"
              ? `"${dragging.department}" хэлтсийг шинэ байрлал руу тавина.`
              : "Ажилчныг хүссэн хэлтэс эсвэл мөр дээр тавина."}
          </div>
        )}
      </div>

      <div className="overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.08),transparent_32%),linear-gradient(#f8fafc,#fff)] p-5">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <div>
            <div className="text-sm font-black text-slate-950">Company cards</div>
            <div className="text-xs font-semibold text-slate-400">
              Нэмэх, устгах, чирж дараалал солих боломжтой.
            </div>
          </div>
          <button
            type="button"
            onClick={addCompanyNode}
            disabled={!onCompanyNodesSave || companySaving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={15} />
            Company card нэмэх
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <Link2 size={15} />
                Line холболтууд
              </div>
              <div className="text-xs font-semibold text-slate-400">
                Department бүрийн line хаанаас хаашаа очихыг эндээс шууд удирдана.
              </div>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => {
              const selectedCompanyId = departmentConnections[group.department] ?? nodes[0]?.id ?? DISCONNECTED_COMPANY_ID;
              const selectedCompany =
                selectedCompanyId === DISCONNECTED_COMPANY_ID
                  ? null
                  : nodes.find((node) => node.id === selectedCompanyId) ?? nodes[0];

              return (
                <div
                  key={group.department}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black uppercase text-slate-950">
                        {group.department}
                      </p>
                      <p className="truncate text-[10px] font-bold uppercase text-slate-400">
                        {selectedCompany?.name ?? "Холбоосгүй"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDepartmentConnectionChange?.(group.department, DISCONNECTED_COMPANY_ID)}
                      disabled={saving || !onDepartmentConnectionChange || selectedCompanyId === DISCONNECTED_COMPANY_ID}
                      className="shrink-0 rounded-lg bg-white px-2 py-1 text-[10px] font-black text-red-500 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Line устгах
                    </button>
                  </div>
                  <select
                    value={selectedCompanyId}
                    onChange={(event) => onDepartmentConnectionChange?.(group.department, event.target.value)}
                    disabled={saving || !onDepartmentConnectionChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
                  >
                    <option value={DISCONNECTED_COMPANY_ID}>Холбоосгүй</option>
                    {nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <SlidersHorizontal size={15} />
                Card size ба холбоос
              </div>
              <div className="text-xs font-semibold text-slate-400">
                Public org chart дээр яг энэ хэмжээ, зайгаар харагдана.
              </div>
            </div>
            {layoutSaving && (
              <span className="inline-flex items-center gap-2 text-xs font-bold text-violet-600">
                <Loader2 size={14} className="animate-spin" />
                хадгалж байна
              </span>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <LayoutNumberControl
              label="Company card"
              value={normalizedLayout.rootCardWidth}
              min={190}
              max={340}
              step={2}
              suffix="px"
              onChange={(rootCardWidth) => onLayoutChange?.({ ...normalizedLayout, rootCardWidth })}
            />
            <LayoutNumberControl
              label="Хэлтэс card"
              value={normalizedLayout.departmentCardWidth}
              min={130}
              max={260}
              step={2}
              suffix="px"
              onChange={(departmentCardWidth) => onLayoutChange?.({ ...normalizedLayout, departmentCardWidth })}
            />
            <LayoutNumberControl
              label="Company зай"
              value={normalizedLayout.companyGap}
              min={8}
              max={64}
              step={2}
              suffix="px"
              onChange={(companyGap) => onLayoutChange?.({ ...normalizedLayout, companyGap })}
            />
            <LayoutNumberControl
              label="Хэлтэс зай"
              value={normalizedLayout.departmentGap}
              min={8}
              max={72}
              step={2}
              suffix="px"
              onChange={(departmentGap) => onLayoutChange?.({ ...normalizedLayout, departmentGap })}
            />
            <LayoutNumberControl
              label="Холбоос өндөр"
              value={normalizedLayout.verticalGap}
              min={32}
              max={110}
              step={2}
              suffix="px"
              onChange={(verticalGap) => onLayoutChange?.({ ...normalizedLayout, verticalGap })}
            />
            <label className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="block text-[10px] font-black uppercase text-slate-400">Line color</span>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={normalizedLayout.lineColor}
                  onChange={(event) => onLayoutChange?.({ ...normalizedLayout, lineColor: event.target.value })}
                  className="h-8 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                />
                <span className="truncate text-xs font-black text-slate-600">
                  {normalizedLayout.lineColor}
                </span>
              </div>
            </label>
          </div>
        </div>

        <div
          ref={chartFrameRef}
          className="min-w-0 overflow-auto rounded-2xl border border-slate-200/70 bg-white/50 p-3"
          style={{ height: chartHeight * chartScale }}
        >
          <div className="sticky left-3 top-3 z-20 mb-3 inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.12).toFixed(2))))}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
              aria-label="Zoom out"
            >
              <ZoomOut size={15} />
            </button>
            <div className="min-w-12 text-center text-[11px] font-black text-slate-600">
              {Math.round(chartScale * 100)}%
            </div>
            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(1.9, Number((value + 0.12).toFixed(2))))}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
              aria-label="Zoom in"
            >
              <ZoomIn size={15} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-950"
              aria-label="Reset zoom"
            >
              <RotateCcw size={14} />
            </button>
          </div>
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
            {nodes.map((node, nodeIndex) => (
              <RootNode
                key={node.id}
                node={node}
                departments={departments.length}
                members={members.length}
                saving={companySaving}
                canDelete={nodes.length > 1}
                dragTarget={dropTarget === `company:${node.id}`}
                onSave={(next) => updateCompanyNode(node.id, next)}
                onDelete={() => removeCompanyNode(node.id)}
                onDragStart={(event) => {
                  const payload: DragPayload = { type: "company", id: node.id };
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("application/json", JSON.stringify(payload));
                  setDragging(payload);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTarget(`company:${node.id}`);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const payload = getDragPayload(event, "company");
                  if (payload && "id" in payload && payload.id) {
                    moveCompanyNode(payload.id, node.id);
                  }
                  clearDragState();
                }}
                onDragEnd={clearDragState}
                index={nodeIndex}
                width={normalizedLayout.rootCardWidth}
              />
            ))}
          </div>

          <div
            className="absolute left-0 right-0 z-10 flex justify-center"
            style={{ top: departmentTop, gap: normalizedLayout.departmentGap }}
          >
            {groups.map((group, departmentIndex) => (
              <DepartmentPreviewCard
                key={group.department}
                department={group.department}
                members={group.members}
                index={departmentIndex}
                companyNodes={nodes}
                connectedCompanyId={departmentConnections[group.department] ?? nodes[0]?.id}
                saving={saving}
                dragging={dragging}
                dropTarget={dropTarget}
                onDragState={setDragging}
                onDropTarget={setDropTarget}
                onClearDrag={clearDragState}
                onEditMember={onEditMember}
                onDepartmentConnectionChange={onDepartmentConnectionChange}
                onMoveDepartment={onMoveDepartment}
                onMoveMember={onMoveMember}
                width={normalizedLayout.departmentCardWidth}
              />
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function RootNode({
  node,
  departments,
  members,
  saving,
  canDelete,
  dragTarget,
  onSave,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  index,
  width,
}: {
  node: TeamLayoutCompanyNode;
  departments: number;
  members: number;
  saving: boolean;
  canDelete: boolean;
  dragTarget: boolean;
  onSave?: (next: { name: string; subtitle: string }) => void;
  onDelete?: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  index: number;
  width: number;
}) {
  const [nameDraft, setNameDraft] = useState(node.name);
  const [subtitleDraft, setSubtitleDraft] = useState(node.subtitle);

  useEffect(() => {
    setNameDraft(node.name);
    setSubtitleDraft(node.subtitle);
  }, [node.name, node.subtitle]);

  const save = () => {
    const name = nameDraft.trim() || "MGL STORE ХХК";
    const subtitle = subtitleDraft.trim() || "MGL STORE LLC";
    setNameDraft(name);
    setSubtitleDraft(subtitle);
    onSave?.({ name, subtitle });
  };

  return (
    <div
      draggable={!saving}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{ width }}
      className={`rounded-3xl border bg-white p-4 text-center shadow-xl shadow-slate-950/10 transition ${
        dragTarget
          ? "border-violet-300 ring-4 ring-violet-100"
          : "border-slate-200 hover:-translate-y-1 hover:shadow-2xl"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex cursor-grab items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-black uppercase text-slate-400 active:cursor-grabbing">
          <GripVertical size={13} />
          {index + 1}
        </div>
        <div className="flex items-center gap-1">
          {saving && <Loader2 size={14} className="animate-spin text-violet-500" />}
          <button
            type="button"
            onClick={onDelete}
            disabled={!canDelete || saving}
            className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Company card устгах"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <Building2 size={22} />
      </div>
      {onSave ? (
        <div className="mt-3 space-y-2">
          <input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={save}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="w-full rounded-xl border border-transparent bg-violet-50 px-3 py-2 text-center text-lg font-black uppercase leading-tight text-slate-950 outline-none transition focus:border-violet-200 focus:bg-white focus:ring-2 focus:ring-violet-100"
            aria-label="Company name"
          />
          <input
            value={subtitleDraft}
            onChange={(event) => setSubtitleDraft(event.target.value)}
            onBlur={save}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="w-full rounded-lg border border-transparent bg-slate-50 px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-slate-500 outline-none transition focus:border-violet-200 focus:bg-white focus:ring-2 focus:ring-violet-100"
            aria-label="Company subtitle"
          />
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {saving ? "Хадгалж байна..." : "Enter эсвэл blur хийхэд хадгална"}
          </p>
        </div>
      ) : (
        <>
          <h4 className="mt-3 text-lg font-black uppercase text-slate-950">{node.name}</h4>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">({node.subtitle})</p>
        </>
      )}
      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl bg-slate-50 text-center">
        <div className="border-r border-slate-200 px-4 py-3">
          <div className="text-xl font-black text-slate-950">{departments}</div>
          <div className="text-[10px] font-bold uppercase text-slate-400">Хэлтэс</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xl font-black text-slate-950">{members}</div>
          <div className="text-[10px] font-bold uppercase text-slate-400">Гишүүн</div>
        </div>
      </div>
    </div>
  );
}

function DepartmentPreviewCard({
  department,
  members,
  index,
  companyNodes,
  connectedCompanyId,
  saving,
  dragging,
  dropTarget,
  onDragState,
  onDropTarget,
  onClearDrag,
  onEditMember,
  onDepartmentConnectionChange,
  onMoveDepartment,
  onMoveMember,
  width,
}: {
  department: string;
  members: TeamLayoutMember[];
  index: number;
  companyNodes: TeamLayoutCompanyNode[];
  connectedCompanyId?: string;
  saving: boolean;
  dragging: DragPayload | null;
  dropTarget: string | null;
  onDragState: (payload: DragPayload | null) => void;
  onDropTarget: (target: string | null) => void;
  onClearDrag: () => void;
  onEditMember: (memberId: string) => void;
  onDepartmentConnectionChange?: (department: string, companyId: string) => void;
  onMoveDepartment: (from: string, to: string) => void;
  onMoveMember: (memberId: string, targetDepartment: string, targetMemberId?: string) => void;
  width: number;
}) {
  const gradient = CARD_COLORS[index % CARD_COLORS.length];
  const isDepartmentTarget = dropTarget === `department:${department}`;
  const connectedCompany =
    connectedCompanyId === DISCONNECTED_COMPANY_ID
      ? null
      : companyNodes.find((node) => node.id === connectedCompanyId) ?? companyNodes[0];

  const handleDepartmentDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const departmentPayload = getDragPayload(event, "department");
    if (departmentPayload && "department" in departmentPayload && departmentPayload.department) {
      onMoveDepartment(departmentPayload.department, department);
      onClearDrag();
      return;
    }

    const memberPayload = getDragPayload(event, "member");
    if (memberPayload && "id" in memberPayload && memberPayload.id) {
      onMoveMember(memberPayload.id, department);
      onClearDrag();
    }
  };

  return (
    <div
      draggable={!saving}
      onDragStart={(event) => {
        const payload: DragPayload = { type: "department", department };
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/json", JSON.stringify(payload));
        onDragState(payload);
      }}
      onDragEnd={onClearDrag}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDropTarget(`department:${department}`);
      }}
      onDragLeave={() => onDropTarget(null)}
      onDrop={handleDepartmentDrop}
      style={{ width }}
      className="relative flex shrink-0 flex-col items-center pt-9"
    >
      <article
        className={`w-full overflow-hidden rounded-3xl border bg-white shadow-[0_14px_35px_rgba(15,23,42,0.10)] transition ${
          isDepartmentTarget
            ? "border-violet-300 ring-4 ring-violet-100"
            : "border-slate-200 hover:-translate-y-1 hover:shadow-xl"
        }`}
      >
        <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
        <div className="px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="inline-flex cursor-grab items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-black uppercase text-slate-400 active:cursor-grabbing">
              <GripVertical size={13} />
              move
            </div>
            <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-600">
              {members.length} гишүүн
            </span>
          </div>
          <h4 className="min-h-10 text-center text-[13px] font-black uppercase leading-tight text-slate-950">
            {department}
          </h4>
          <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Department drop zone
          </p>

          <label className="mt-3 block rounded-2xl border border-slate-200 bg-slate-50 p-2 text-left">
            <span className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
              <Link2 size={12} />
              Холболт
            </span>
            <select
              value={connectedCompanyId ?? companyNodes[0]?.id ?? DISCONNECTED_COMPANY_ID}
              onChange={(event) => onDepartmentConnectionChange?.(department, event.target.value)}
              disabled={saving || !onDepartmentConnectionChange}
              className="w-full rounded-xl border border-transparent bg-white px-2 py-2 text-xs font-black text-slate-700 outline-none transition focus:border-violet-200 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
            >
              <option value={DISCONNECTED_COMPANY_ID}>Холбоосгүй</option>
              {companyNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-2 flex items-center justify-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-600">
            <ArrowLeftRight size={11} />
            {connectedCompany?.name ?? "Холбоосгүй"}
          </div>

          <div
            className={`mt-3 rounded-2xl border border-dashed p-2 transition ${
              dragging?.type === "member" && isDepartmentTarget
                ? "border-violet-300 bg-violet-50"
                : "border-slate-200 bg-slate-50/70"
            }`}
          >
            {members.length === 0 ? (
              <div className="rounded-xl bg-white px-3 py-5 text-center text-[11px] font-bold text-slate-400">
                Ажилчин энд тавина
              </div>
            ) : (
              <div className="space-y-1.5">
                {members.map((member) => (
                  <MemberPreviewRow
                    key={member.id}
                    member={member}
                    department={department}
                    saving={saving}
                    dropTarget={dropTarget}
                    onDragState={onDragState}
                    onDropTarget={onDropTarget}
                    onClearDrag={onClearDrag}
                    onEditMember={onEditMember}
                    onMoveMember={onMoveMember}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

function LayoutNumberControl({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="block text-[10px] font-black uppercase text-slate-400">{label}</span>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-w-0 flex-1 accent-violet-600"
        />
        <span className="w-12 text-right text-xs font-black text-slate-700">
          {value}
          {suffix}
        </span>
      </div>
    </label>
  );
}

function MemberPreviewRow({
  member,
  department,
  saving,
  dropTarget,
  onDragState,
  onDropTarget,
  onClearDrag,
  onEditMember,
  onMoveMember,
}: {
  member: TeamLayoutMember;
  department: string;
  saving: boolean;
  dropTarget: string | null;
  onDragState: (payload: DragPayload | null) => void;
  onDropTarget: (target: string | null) => void;
  onClearDrag: () => void;
  onEditMember: (memberId: string) => void;
  onMoveMember: (memberId: string, targetDepartment: string, targetMemberId?: string) => void;
}) {
  const targetId = `member:${member.id}`;
  const isTarget = dropTarget === targetId;

  return (
    <div
      draggable={!saving}
      onDragStart={(event) => {
        const payload: DragPayload = { type: "member", id: member.id };
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/json", JSON.stringify(payload));
        onDragState(payload);
      }}
      onDragEnd={onClearDrag}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDropTarget(targetId);
      }}
      onDragLeave={() => onDropTarget(null)}
      onDrop={(event) => {
        event.preventDefault();
        const payload = getDragPayload(event, "member");
        if (payload && "id" in payload && payload.id && payload.id !== member.id) {
          onMoveMember(payload.id, department, member.id);
        }
        onClearDrag();
      }}
      className={`group flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 text-left transition ${
        isTarget ? "bg-violet-100 ring-2 ring-violet-300" : "bg-white hover:bg-violet-50"
      }`}
    >
      <GripVertical size={12} className="shrink-0 cursor-grab text-slate-300 active:cursor-grabbing" />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-black text-white shadow-sm">
        {member.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
        ) : (
          getInitial(member.name)
        )}
      </div>
      <button
        type="button"
        onClick={() => onEditMember(member.id)}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-xs font-black text-slate-900">{member.name}</p>
        <p className="truncate text-[10px] font-semibold text-slate-500">{member.role}</p>
      </button>
      <Pencil size={12} className="shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />
    </div>
  );
}
