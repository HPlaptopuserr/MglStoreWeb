"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  CheckCircle2,
  GripVertical,
  User,
  Mail,
  Linkedin,
  Briefcase,
  Award,
  Building2,
  Eye,
  EyeOff,
  Upload,
  ImageIcon,
  Phone,
} from "lucide-react";
import { teamApi } from "./team-api.service";
import {
  DEFAULT_TEAM_ORG_LAYOUT,
  TeamOrgLayoutEditor,
  type TeamOrgLayoutSettings,
} from "./TeamOrgLayoutEditor";
import {
  DEFAULT_DEPARTMENT_OPTIONS,
  DEFAULT_TEAM_COMPANY_NAME,
  DEFAULT_TEAM_COMPANY_SUBTITLE,
  DISCONNECTED_COMPANY_ID,
  EMPTY_FORM,
  QUICK_SKILLS,
  ROLE_OPTIONS,
  TEAM_COMPANY_NAME_SETTING_KEY,
  TEAM_COMPANY_NODES_SETTING_KEY,
  TEAM_COMPANY_SUBTITLE_SETTING_KEY,
  TEAM_DEPARTMENT_CONNECTIONS_SETTING_KEY,
  TEAM_DEPARTMENTS_SETTING_KEY,
  TEAM_ORG_LAYOUT_SETTING_KEY,
} from "./team.constants";
import type {
  NetworkPartner,
  TeamCompanyNode,
  TeamDepartment,
  TeamMember,
  TeamMemberForm,
} from "./team.types";
import {
  buildDepartments,
  getTeamSectionHint,
  groupMembersByDepartment,
  parseCompanyNodes,
  parseDepartmentConnections,
  parseStoredDepartments,
  parseTeamOrgLayout,
  reorderItems,
  uniqueDepartmentNames,
} from "./team.utils";
import {
  DepartmentManager,
  Field,
  NetworkPartnersPreview,
  SuggestionPills,
  inputCls,
} from "./TeamSupportingComponents";
export function TeamSection() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [departments, setDepartments] = useState<TeamDepartment[]>([]);
  const [networkPartners, setNetworkPartners] = useState<NetworkPartner[]>([]);
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
  const [departmentInput, setDepartmentInput] = useState("");
  const [editingDepartment, setEditingDepartment] = useState<string | null>(
    null,
  );
  const [departmentDraft, setDepartmentDraft] = useState("");
  const [departmentSaving, setDepartmentSaving] = useState(false);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [companyName, setCompanyName] = useState(DEFAULT_TEAM_COMPANY_NAME);
  const [companySubtitle, setCompanySubtitle] = useState(
    DEFAULT_TEAM_COMPANY_SUBTITLE,
  );
  const [companyNodes, setCompanyNodes] = useState<TeamCompanyNode[]>([
    {
      id: "root-company",
      name: DEFAULT_TEAM_COMPANY_NAME,
      subtitle: DEFAULT_TEAM_COMPANY_SUBTITLE,
      order: 0,
    },
  ]);
  const [departmentConnections, setDepartmentConnections] = useState<
    Record<string, string>
  >({});
  const [orgLayout, setOrgLayout] = useState<TeamOrgLayoutSettings>(
    DEFAULT_TEAM_ORG_LAYOUT,
  );
  const [orgLayoutSaving, setOrgLayoutSaving] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveDepartmentSettings = async (departmentNames: string[]) => {
    const clean = uniqueDepartmentNames(departmentNames);
    const res = await teamApi.saveSetting(
      TEAM_DEPARTMENTS_SETTING_KEY,
      JSON.stringify(clean),
    );
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.message || "Хэлтсийн жагсаалт хадгалахад алдаа гарлаа");
    }
    return clean;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, settingsRes, partnersRes] = await Promise.all([
        teamApi.members(),
        teamApi.settings(),
        teamApi.partners(),
      ]);
      const nextMembers = membersRes.ok ? await membersRes.json() : [];
      const settings = settingsRes.ok ? await settingsRes.json() : {};
      const partnerData = partnersRes.ok ? await partnersRes.json() : null;
      const partnerItems = Array.isArray(partnerData?.data)
        ? partnerData.data
        : Array.isArray(partnerData?.partners)
          ? partnerData.partners
          : [];
      const storedDepartments = parseStoredDepartments(
        settings[TEAM_DEPARTMENTS_SETTING_KEY],
      );
      const nextCompanyName =
        settings[TEAM_COMPANY_NAME_SETTING_KEY] || DEFAULT_TEAM_COMPANY_NAME;
      const nextCompanySubtitle =
        settings[TEAM_COMPANY_SUBTITLE_SETTING_KEY] ||
        DEFAULT_TEAM_COMPANY_SUBTITLE;
      const nextCompanyNodes = parseCompanyNodes(
        settings[TEAM_COMPANY_NODES_SETTING_KEY],
        nextCompanyName,
        nextCompanySubtitle,
      );
      setMembers(nextMembers);
      setDepartments(buildDepartments(storedDepartments, nextMembers));
      setNetworkPartners(partnerItems);
      setCompanyName(nextCompanyName);
      setCompanySubtitle(nextCompanySubtitle);
      setCompanyNodes(nextCompanyNodes);
      setDepartmentConnections(
        parseDepartmentConnections(
          settings[TEAM_DEPARTMENT_CONNECTIONS_SETTING_KEY],
        ),
      );
      setOrgLayout(parseTeamOrgLayout(settings[TEAM_ORG_LAYOUT_SETTING_KEY]));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      phoneNumber: m.phoneNumber ?? "",
      linkedinUrl: m.linkedinUrl ?? "",
      experience: m.experience ?? "",
      skills: m.skills,
      order: m.order,
    });
    setSkillInput("");
    setEditing(m);
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
    setError("");
  };

  const handleAvatarFile = async (file: File) => {
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await teamApi.uploadAvatar(file);
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

  const applySuggestion = (field: "role" | "department", value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
  };

  const addQuickSkill = (skill: string) => {
    setForm((p) =>
      p.skills.includes(skill) ? p : { ...p, skills: [...p.skills, skill] },
    );
  };

  const createDepartment = async () => {
    const name = departmentInput.trim();
    if (!name) return;
    setDepartmentSaving(true);
    setError("");
    try {
      const stored = await saveDepartmentSettings([
        ...departments.map((department) => department.name),
        name,
      ]);
      setDepartments(buildDepartments(stored, members));
      setDepartmentInput("");
      showSuccess("Хэлтэс нэмэгдлээ");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Хэлтэс нэмэхэд алдаа гарлаа",
      );
    } finally {
      setDepartmentSaving(false);
    }
  };

  const startRenameDepartment = (department: string) => {
    setEditingDepartment(department);
    setDepartmentDraft(department);
  };

  const renameDepartment = async () => {
    const from = editingDepartment;
    const to = departmentDraft.trim();
    if (!from || !to || from === to) {
      setEditingDepartment(null);
      return;
    }
    setDepartmentSaving(true);
    setError("");
    try {
      const stored = await saveDepartmentSettings(
        departments.map((department) =>
          department.name === from ? to : department.name,
        ),
      );
      const affectedMembers = members.filter(
        (member) => member.department === from,
      );
      await Promise.all(
        affectedMembers.map((member) =>
          teamApi.updateMember(member.id, { department: to }),
        ),
      );
      const nextMembers = members.map((member) =>
        member.department === from ? { ...member, department: to } : member,
      );
      setMembers(nextMembers);
      setDepartments(buildDepartments(stored, nextMembers));
      if (form.department === from) setForm((p) => ({ ...p, department: to }));
      setEditingDepartment(null);
      showSuccess("Хэлтсийн нэр солигдлоо");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Хэлтсийн нэр солиход алдаа гарлаа",
      );
    } finally {
      setDepartmentSaving(false);
    }
  };

  const deleteDepartment = async (department: TeamDepartment) => {
    const warning =
      department.count > 0
        ? `"${department.name}" хэлтсийг устгавал ${department.count} ажилчны хэлтэс хоосорно. Үргэлжлүүлэх үү?`
        : `"${department.name}" хэлтсийг устгах уу?`;
    if (!confirm(warning)) return;

    setDepartmentSaving(true);
    setError("");
    try {
      const stored = await saveDepartmentSettings(
        departments
          .map((item) => item.name)
          .filter((name) => name !== department.name),
      );
      const affectedMembers = members.filter(
        (member) => member.department === department.name,
      );
      await Promise.all(
        affectedMembers.map((member) =>
          teamApi.updateMember(member.id, { department: null }),
        ),
      );
      const nextMembers = members.map((member) =>
        member.department === department.name
          ? { ...member, department: null }
          : member,
      );
      setMembers(nextMembers);
      setDepartments(buildDepartments(stored, nextMembers));
      if (form.department === department.name)
        setForm((p) => ({ ...p, department: "" }));
      showSuccess("Хэлтэс устгагдлаа");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Хэлтэс устгахад алдаа гарлаа",
      );
    } finally {
      setDepartmentSaving(false);
    }
  };

  const persistMemberLayout = async (nextMembers: TeamMember[]) => {
    const changedMembers = nextMembers.filter((nextMember) => {
      const current = members.find((member) => member.id === nextMember.id);
      return (
        current &&
        (current.order !== nextMember.order ||
          current.department !== nextMember.department)
      );
    });

    if (changedMembers.length === 0) return;

    await Promise.all(
      changedMembers.map((member) =>
        teamApi.updateMember(member.id, {
          department: member.department,
          order: member.order,
        }),
      ),
    );
  };

  const saveLayout = async (
    nextDepartments: TeamDepartment[],
    nextMembers: TeamMember[],
    message: string,
  ) => {
    setLayoutSaving(true);
    setError("");
    try {
      await saveDepartmentSettings(
        nextDepartments.map((department) => department.name),
      );
      await persistMemberLayout(nextMembers);
      setDepartments(
        buildDepartments(
          nextDepartments.map((department) => department.name),
          nextMembers,
        ),
      );
      setMembers(nextMembers);
      showSuccess(message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Байрлал хадгалахад алдаа гарлаа",
      );
    } finally {
      setLayoutSaving(false);
    }
  };

  const saveCompanyInfo = async (next: { name: string; subtitle: string }) => {
    setCompanySaving(true);
    setError("");
    setCompanyName(next.name);
    setCompanySubtitle(next.subtitle);
    const nextNodes = companyNodes.map((node, index) =>
      index === 0
        ? { ...node, name: next.name, subtitle: next.subtitle }
        : node,
    );
    setCompanyNodes(nextNodes);
    try {
      const res = await teamApi.saveSettings({
        [TEAM_COMPANY_NAME_SETTING_KEY]: next.name,
        [TEAM_COMPANY_SUBTITLE_SETTING_KEY]: next.subtitle,
        [TEAM_COMPANY_NODES_SETTING_KEY]: JSON.stringify(nextNodes),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Компанийн нэр хадгалахад алдаа гарлаа");
      }
      showSuccess("Компанийн нэр шинэчлэгдлээ");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Компанийн нэр хадгалахад алдаа гарлаа",
      );
    } finally {
      setCompanySaving(false);
    }
  };

  const saveCompanyNodes = async (
    nextNodes: TeamCompanyNode[],
    nextConnections = departmentConnections,
  ) => {
    const normalizedNodes = nextNodes
      .map((node, index) => ({ ...node, order: index }))
      .filter((node) => node.name.trim());
    const fallbackNodes =
      normalizedNodes.length > 0
        ? normalizedNodes
        : [
            {
              id: "root-company",
              name: DEFAULT_TEAM_COMPANY_NAME,
              subtitle: DEFAULT_TEAM_COMPANY_SUBTITLE,
              order: 0,
            },
          ];
    const validIds = new Set(fallbackNodes.map((node) => node.id));
    const normalizedConnections = Object.fromEntries(
      Object.entries(nextConnections).filter(
        ([, companyId]) =>
          companyId === DISCONNECTED_COMPANY_ID || validIds.has(companyId),
      ),
    );

    setCompanySaving(true);
    setError("");
    setCompanyNodes(fallbackNodes);
    setDepartmentConnections(normalizedConnections);
    setCompanyName(fallbackNodes[0].name);
    setCompanySubtitle(fallbackNodes[0].subtitle);
    try {
      const res = await teamApi.saveSettings({
        [TEAM_COMPANY_NAME_SETTING_KEY]: fallbackNodes[0].name,
        [TEAM_COMPANY_SUBTITLE_SETTING_KEY]: fallbackNodes[0].subtitle,
        [TEAM_COMPANY_NODES_SETTING_KEY]: JSON.stringify(fallbackNodes),
        [TEAM_DEPARTMENT_CONNECTIONS_SETTING_KEY]: JSON.stringify(
          normalizedConnections,
        ),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Company card хадгалахад алдаа гарлаа");
      }
      showSuccess("Company card шинэчлэгдлээ");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Company card хадгалахад алдаа гарлаа",
      );
    } finally {
      setCompanySaving(false);
    }
  };

  const saveDepartmentConnection = async (
    department: string,
    companyId: string,
  ) => {
    const nextConnections = {
      ...departmentConnections,
      [department]: companyId,
    };
    await saveCompanyNodes(companyNodes, nextConnections);
  };

  const saveOrgLayout = async (nextLayout: TeamOrgLayoutSettings) => {
    const normalized = parseTeamOrgLayout(JSON.stringify(nextLayout));
    setOrgLayout(normalized);
    setOrgLayoutSaving(true);
    setError("");
    try {
      const res = await teamApi.saveSetting(
        TEAM_ORG_LAYOUT_SETTING_KEY,
        JSON.stringify(normalized),
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(
          d.message || "Org chart layout хадгалахад алдаа гарлаа",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Org chart layout хадгалахад алдаа гарлаа",
      );
    } finally {
      setOrgLayoutSaving(false);
    }
  };

  const reorderDepartments = (from: string, to: string) => {
    if (from === to) return;
    const fromIndex = departments.findIndex(
      (department) => department.name === from,
    );
    const toIndex = departments.findIndex(
      (department) => department.name === to,
    );
    if (fromIndex < 0 || toIndex < 0) return;
    const nextDepartments = reorderItems(departments, fromIndex, toIndex);
    const nextMembers = nextDepartments.flatMap((department, departmentIndex) =>
      members
        .filter((member) => member.department === department.name)
        .sort((a, b) => a.order - b.order)
        .map((member, memberIndex) => ({
          ...member,
          order: departmentIndex * 100 + memberIndex,
        })),
    );
    const ungrouped = members.filter(
      (member) =>
        !member.department ||
        !nextDepartments.some(
          (department) => department.name === member.department,
        ),
    );
    saveLayout(
      nextDepartments,
      [...nextMembers, ...ungrouped],
      "Хэлтсийн байрлал шинэчлэгдлээ",
    );
  };

  const moveMember = (
    memberId: string,
    targetDepartment: string,
    targetMemberId?: string,
  ) => {
    const movingMember = members.find((member) => member.id === memberId);
    if (!movingMember) return;

    const groups = groupMembersByDepartment(members, departments);
    const nextGroups = groups.map((group) => ({
      ...group,
      members: group.members.filter((member) => member.id !== memberId),
    }));
    const targetGroup = nextGroups.find(
      (group) => group.department === targetDepartment,
    );
    if (!targetGroup) return;

    const insertIndex = targetMemberId
      ? Math.max(
          0,
          targetGroup.members.findIndex(
            (member) => member.id === targetMemberId,
          ),
        )
      : targetGroup.members.length;
    targetGroup.members.splice(insertIndex, 0, {
      ...movingMember,
      department: targetDepartment,
    });

    const departmentOrder = new Map(
      departments.map((department, index) => [department.name, index]),
    );
    const nextMembers = nextGroups.flatMap((group) => {
      const departmentIndex =
        departmentOrder.get(group.department) ?? departments.length;
      return group.members.map((member, memberIndex) => ({
        ...member,
        department: group.department,
        order: departmentIndex * 100 + memberIndex,
      }));
    });

    saveLayout(departments, nextMembers, "Ажилчны байрлал шинэчлэгдлээ");
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
        phoneNumber: form.phoneNumber || null,
        linkedinUrl: form.linkedinUrl || null,
        experience: form.experience || null,
      };

      const res =
        modal === "create"
          ? await teamApi.createMember(body)
          : await teamApi.updateMember(editing!.id, body);

      if (res.ok) {
        await load();
        closeModal();
        showSuccess(
          modal === "create" ? "Гишүүн нэмэгдлээ" : "Мэдээлэл шинэчлэгдлээ",
        );
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
      const res = await teamApi.deleteMember(id);
      if (res.ok) {
        await load();
        showSuccess("Устгагдлаа");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (m: TeamMember) => {
    const res = await teamApi.updateMember(m.id, { isActive: !m.isActive });
    if (res.ok) {
      await load();
      showSuccess(m.isActive ? "Нуугдлаа" : "Харагдаж байна");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Баг хамт олон</h2>
          <p className="text-sm text-slate-400">
            Компанийн ажилчдын жагсаалтыг удирдана
          </p>
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

      {error && !modal && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="rounded-lg p-1 text-red-400 hover:bg-red-100 hover:text-red-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <DepartmentManager
        departments={departments}
        input={departmentInput}
        draft={departmentDraft}
        editing={editingDepartment}
        saving={departmentSaving}
        onInputChange={setDepartmentInput}
        onDraftChange={setDepartmentDraft}
        onCreate={createDepartment}
        onStartRename={startRenameDepartment}
        onCancelRename={() => setEditingDepartment(null)}
        onRename={renameDepartment}
        onDelete={deleteDepartment}
      />

      <TeamOrgLayoutEditor
        departments={departments}
        members={members}
        companyName={companyName}
        companySubtitle={companySubtitle}
        companyNodes={companyNodes}
        departmentConnections={departmentConnections}
        layout={orgLayout}
        saving={layoutSaving}
        companySaving={companySaving}
        layoutSaving={orgLayoutSaving}
        onEditMember={(memberId) => {
          const member = members.find((item) => item.id === memberId);
          if (member) openEdit(member);
        }}
        onCompanyInfoSave={saveCompanyInfo}
        onCompanyNodesSave={saveCompanyNodes}
        onDepartmentConnectionChange={saveDepartmentConnection}
        onLayoutChange={saveOrgLayout}
        onMoveDepartment={reorderDepartments}
        onMoveMember={moveMember}
      />

      <NetworkPartnersPreview partners={networkPartners} />

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 size={15} className="animate-spin" /> Ачааллаж байна...
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <User size={36} className="text-slate-200" />
          <p className="text-sm font-medium text-slate-400">
            Гишүүн байхгүй байна
          </p>
          <button
            onClick={openCreate}
            className="text-xs font-semibold text-violet-600 hover:underline"
          >
            Эхний гишүүнийг нэм
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div
              key={m.id}
              className={`flex items-center gap-4 rounded-2xl border bg-white px-4 py-3 transition-all ${
                m.isActive
                  ? "border-slate-200"
                  : "border-dashed border-slate-200 opacity-60"
              }`}
            >
              <GripVertical
                size={14}
                className="shrink-0 text-slate-300 cursor-grab"
              />

              {/* Avatar */}
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.avatarUrl}
                    alt={m.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User
                    size={18}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-300"
                  />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-slate-800">
                    {m.name}
                  </span>
                  {!m.isActive && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                      Нуусан
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">{m.role}</span>
                  {m.department && (
                    <>
                      <span className="text-slate-200">·</span>
                      <span className="text-xs text-slate-400">
                        {m.department}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Skills */}
              <div className="hidden items-center gap-1 md:flex">
                {m.skills.slice(0, 3).map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600"
                  >
                    {s}
                  </span>
                ))}
                {m.skills.length > 3 && (
                  <span className="text-[10px] text-slate-400">
                    +{m.skills.length - 3}
                  </span>
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
                  {deletingId === m.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
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
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
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

              <div className="mb-4 rounded-2xl border border-violet-100 bg-violet-50/80 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                  Frontend ангилал
                </p>
                <p className="mt-1 text-xs font-medium text-violet-600">
                  {getTeamSectionHint(form)}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Name + Role */}
                <div className="grid gap-3 md:grid-cols-2">
                  <Field icon={<User size={14} />} label="Нэр *">
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Болд Батаар"
                      className={inputCls}
                    />
                  </Field>
                  <Field icon={<Briefcase size={14} />} label="Албан тушаал *">
                    <input
                      value={form.role}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, role: e.target.value }))
                      }
                      placeholder="Албан тушаал сонгох эсвэл бичих"
                      className={inputCls}
                    />
                    <SuggestionPills
                      options={ROLE_OPTIONS}
                      value={form.role}
                      onSelect={(role) => applySuggestion("role", role)}
                    />
                  </Field>
                </div>

                {/* Department + Experience */}
                <div className="grid gap-3 md:grid-cols-2">
                  <Field icon={<Building2 size={14} />} label="Хэлтэс / бүлэг">
                    <input
                      value={form.department ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, department: e.target.value }))
                      }
                      placeholder="Хэлтэс сонгох эсвэл бичих"
                      className={inputCls}
                    />
                    <SuggestionPills
                      options={
                        departments.length > 0
                          ? departments.map((department) => department.name)
                          : DEFAULT_DEPARTMENT_OPTIONS
                      }
                      value={form.department ?? ""}
                      onSelect={(department) =>
                        applySuggestion("department", department)
                      }
                    />
                  </Field>
                  <Field icon={<Award size={14} />} label="Туршлага">
                    <input
                      value={form.experience ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, experience: e.target.value }))
                      }
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
                        <img
                          src={form.avatarUrl}
                          alt="avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User
                          size={20}
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-300"
                        />
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                          <Loader2
                            size={16}
                            className="animate-spin text-violet-600"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-1.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleAvatarFile(f);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60 transition-colors"
                      >
                        <Upload size={13} />
                        {uploadingAvatar
                          ? "Байршуулж байна..."
                          : "Зураг сонгох"}
                      </button>
                      <p className="text-[10px] text-slate-400">
                        JPG, PNG, WebP · Дээд тал 3MB
                      </p>
                    </div>

                    {form.avatarUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm((p) => ({ ...p, avatarUrl: "" }))
                        }
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                        title="Зураг устгах"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contact */}
                <div className="grid gap-3 md:grid-cols-2">
                  <Field icon={<Mail size={14} />} label="Email">
                    <input
                      value={form.email ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="bold@mglstore.mn"
                      className={inputCls}
                    />
                  </Field>
                  <Field icon={<Phone size={14} />} label="Утас">
                    <input
                      value={form.phoneNumber ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, phoneNumber: e.target.value }))
                      }
                      placeholder="99112233"
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field icon={<Linkedin size={14} />} label="LinkedIn URL">
                    <input
                      value={form.linkedinUrl ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, linkedinUrl: e.target.value }))
                      }
                      placeholder="https://linkedin.com/in/..."
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* Bio */}
                <Field icon={<User size={14} />} label="Товч намтар">
                  <textarea
                    value={form.bio ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, bio: e.target.value }))
                    }
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
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
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_SKILLS.filter((s) => !form.skills.includes(s)).map(
                      (skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => addQuickSkill(skill)}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                        >
                          + {skill}
                        </button>
                      ),
                    )}
                  </div>
                  {form.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {form.skills.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700"
                        >
                          {s}
                          <button
                            onClick={() => removeSkill(s)}
                            className="ml-0.5 text-violet-400 hover:text-violet-700"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order */}
                <Field
                  icon={<GripVertical size={14} />}
                  label="Дараалал (жижиг = эхэнд)"
                >
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, order: Number(e.target.value) }))
                    }
                    className={inputCls}
                  />
                  <p className="mt-1 text-[10px] font-medium text-slate-400">
                    0 бол хамгийн түрүүнд гарна. Ижил дараалалтай үед шинээр
                    нэмэгдсэн дарааллаар эрэмбэлнэ.
                  </p>
                </Field>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
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
