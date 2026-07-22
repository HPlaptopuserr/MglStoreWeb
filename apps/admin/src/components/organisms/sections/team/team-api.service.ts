import { API, adminFetch } from "@/lib/api";
import type { TeamMember, TeamMemberForm } from "./team.types";

export const teamApi = {
  members: () => adminFetch(`${API}/admin/team`),
  settings: () => adminFetch(`${API}/site-settings/admin`),
  partners: () => adminFetch(`${API}/partners?limit=10000`),
  saveSetting: (key: string, value: string) =>
    adminFetch(`${API}/site-settings/${key}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    }),
  saveSettings: (values: Record<string, string>) =>
    adminFetch(`${API}/site-settings`, {
      method: "PUT",
      body: JSON.stringify(values),
    }),
  uploadAvatar: (file: File) => {
    const body = new FormData();
    body.append("avatar", file);
    return adminFetch(`${API}/admin/team/upload-avatar`, {
      method: "POST",
      body,
    });
  },
  createMember: (member: TeamMemberForm) =>
    adminFetch(`${API}/admin/team`, {
      method: "POST",
      body: JSON.stringify(member),
    }),
  updateMember: (id: string, changes: Partial<TeamMemberForm | TeamMember>) =>
    adminFetch(`${API}/admin/team/${id}`, {
      method: "PUT",
      body: JSON.stringify(changes),
    }),
  deleteMember: (id: string) =>
    adminFetch(`${API}/admin/team/${id}`, { method: "DELETE" }),
};
