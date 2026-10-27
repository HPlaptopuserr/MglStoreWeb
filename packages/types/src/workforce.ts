import type { WorkforcePayrollAccount } from "./workforce-payroll";
export const workforceFeatures = [
  "dashboard",
  "reports",
  "requests",
  "employees",
  "departments",
  "schedules",
  "locations",
  "notifications",
  "analytics",
  "integrations",
] as const;
export type WorkforceFeature = (typeof workforceFeatures)[number];
export type WorkforceFeatureFlags = Record<WorkforceFeature, boolean>;
export const defaultWorkforceFeatures: WorkforceFeatureFlags = {
  dashboard: true,
  reports: true,
  requests: true,
  employees: true,
  departments: true,
  schedules: true,
  locations: true,
  notifications: true,
  analytics: true,
  integrations: false,
};
export const timeRequestKinds = [
  "REMOTE",
  "CORRECTION",
  "LEAVE",
  "OVERTIME",
] as const;
export type TimeRequestKind = (typeof timeRequestKinds)[number];
export type TimeRequestState =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";
export type WorkforceStatus =
  | "PRESENT"
  | "CLOCKED_OUT"
  | "LATE"
  | "ABSENT"
  | "SCHEDULED"
  | "UNRECORDED"
  | "LEAVE"
  | "DAY_OFF"
  | "UNSCHEDULED";
export interface WorkforceEmployee {
  jobTitle?: string;
  employeeCode?: string;
  workforceDisplayName?: string | null;
  employmentEndedAt?: string | null;
  employmentEndReason?: string | null;
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  role: string;
  department: string;
  active: boolean;
  joinedAt: string;
  capabilities: string[];
}
/** Organization-owned personnel record. Login credentials remain on the user account. */
export interface WorkforceEmployeeProfile extends WorkforcePayrollAccount {
  fullName: string;
  lastName: string;
  phone: string;
  email: string;
  registerNumber: string;
  birthDate: string;
  gender: "" | "MALE" | "FEMALE" | "OTHER";
  address: string;
  employeeCode: string;
  jobTitle: string;
  hiredAt: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
}
export interface WorkforceEmployeeDetails {
  profile: WorkforceEmployeeProfile;
  account: { fullName: string; email: string; phone: string };
}
export interface WorkforceDepartment {
  id: string;
  name: string;
  parentId: string | null;
  managerId: string | null;
}
export interface WorkforceShift {
  id: string;
  name: string;
  startMinute: number;
  endMinute: number;
  breakMinutes: number;
  weekdays: number[];
  color: string;
  active: boolean;
}
export interface WorkforceAssignment {
  id: string;
  userId: string;
  shiftId: string;
  from: string;
  to: string;
  zoneId: string | null;
}
export interface WorkforceZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  isActive: boolean;
  userIds: string[];
}
export interface WorkforceRequest {
  id: string;
  userId: string;
  kind: TimeRequestKind;
  state: TimeRequestState;
  from: string;
  to: string;
  note: string;
  decisionNote: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  zoneId: string | null;
  direction: "IN" | "OUT" | null;
}
export interface WorkforceNotice {
  id: string;
  title: string;
  content: string;
  userIds: string[];
  createdBy: string;
  createdAt: string;
  readBy: string[];
}
export interface WorkforceToken {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}
export interface WorkforceAudit {
  id: string;
  actorId: string;
  action: string;
  entityId: string;
  createdAt: string;
  before: unknown;
  after: unknown;
}
export interface WorkforcePolicy {
  timeZone: string;
  lateGraceMinutes: number;
  features: WorkforceFeatureFlags;
  requestKinds: TimeRequestKind[];
  approvalRequired: boolean;
}
export interface WorkforceSubscription {
  planName: string;
  expiresAt: string | null;
  seatUnitPrice: number | null;
  currency: string;
  addons: string[];
}
export interface WorkforceRecord {
  id: string;
  userId: string;
  clockIn: string;
  clockOut: string | null;
  zoneId: string | null;
  method: string;
  totalMinutes: number | null;
  note: string | null;
}
export interface WorkforceRow {
  id: string;
  date: string;
  userId: string;
  employeeName: string;
  department: string;
  shiftName: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  clockIn: string | null;
  clockOut: string | null;
  plannedMinutes: number;
  workedMinutes: number;
  lateMinutes: number;
  earlyMinutes: number;
  absentMinutes: number;
  overtimeMinutes: number;
  approvedOvertimeMinutes: number;
  status: WorkforceStatus;
  recordIds: string[];
}
export interface WorkforceSummary {
  employees: number;
  present: number;
  late: number;
  absent: number;
  unrecorded: number;
  leave: number;
  plannedMinutes: number;
  workedMinutes: number;
  lateMinutes: number;
  earlyMinutes: number;
  absentMinutes: number;
  overtimeMinutes: number;
  approvedOvertimeMinutes: number;
  pendingRequests: number;
}
export interface WorkforceSession {
  userId: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: string;
  canManage: boolean;
  canApproveRequests: boolean;
  canManageSchedules: boolean;
  managedUserIds: string[];
  canExport: boolean;
  organizations: { id: string; name: string; role: string }[];
}
export interface WorkforceSnapshot {
  pulse: { score: number; count: number }[];
  organization: {
    id: string;
    name: string;
    maxMembers: number;
    activeMembers: number;
    attendanceEnabled: boolean;
    manualEnabled: boolean;
  };
  session: WorkforceSession;
  policy: WorkforcePolicy;
  subscription: WorkforceSubscription;
  employees: WorkforceEmployee[];
  departments: WorkforceDepartment[];
  shifts: WorkforceShift[];
  assignments: WorkforceAssignment[];
  zones: WorkforceZone[];
  requests: WorkforceRequest[];
  notices: WorkforceNotice[];
  tokens: WorkforceToken[];
  audit: WorkforceAudit[];
  records: WorkforceRecord[];
  rows: WorkforceRow[];
  summary: WorkforceSummary;
  range: { from: string; to: string };
  today: string;
}
export const workforceRequestLabels: Record<TimeRequestKind, string> = {
  REMOTE: "Зайнаас цаг бүртгүүлэх",
  CORRECTION: "Цаг нөхөн / засаж бүртгүүлэх",
  LEAVE: "Чөлөө",
  OVERTIME: "Илүү цаг",
};
export const workforceStatusLabels: Record<WorkforceStatus, string> = {
  PRESENT: "Ирсэн",
  CLOCKED_OUT: "Явсан",
  LATE: "Хоцорсон",
  ABSENT: "Тасалсан",
  UNRECORDED: "Бүртгэлгүй",
  SCHEDULED: "Ээлж эхлээгүй",
  LEAVE: "Чөлөөтэй",
  DAY_OFF: "Амралтын өдөр",
  UNSCHEDULED: "Хуваарьгүй",
};
