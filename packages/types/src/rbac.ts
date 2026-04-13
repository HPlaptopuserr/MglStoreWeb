import { PlatformRole, Permission } from "./enums/role";

// ─── Platform Role → Permission mapping ─────────────────────────────────
// This is the single source of truth for what each admin role can do.
// SUPER_ADMIN and ADMIN get ALL permissions.
// Sub-admin roles get only their domain-specific permissions.

const ALL_PERMISSIONS = Object.values(Permission) as Permission[];

export const PLATFORM_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  [PlatformRole.SUPER_ADMIN]: ALL_PERMISSIONS,
  [PlatformRole.ADMIN]: ALL_PERMISSIONS,

  [PlatformRole.HR_ADMIN]: [
    Permission.VIEW_SYSTEM_DASHBOARD,
    Permission.MANAGE_JOB_POSITIONS,
    Permission.MANAGE_JOB_APPLICATIONS,
    Permission.MANAGE_USERS,
    Permission.MANAGE_SERVICES,
    Permission.MANAGE_ADMIN_STAFF,
  ],

  [PlatformRole.CONTENT_ADMIN]: [
    Permission.VIEW_SYSTEM_DASHBOARD,
    Permission.MANAGE_SITE_CONTENT,
    Permission.MANAGE_SITE_SETTINGS,
    Permission.MANAGE_CATEGORIES,
    Permission.MANAGE_FORMS,
    Permission.MANAGE_CHAT,
  ],

  [PlatformRole.PARTNER_ADMIN]: [
    Permission.VIEW_SYSTEM_DASHBOARD,
    Permission.MANAGE_ORGANIZATIONS,
    Permission.MANAGE_REGISTRATIONS,
  ],

  [PlatformRole.WAREHOUSE_ADMIN]: [
    Permission.VIEW_SYSTEM_DASHBOARD,
    Permission.MANAGE_WAREHOUSES,
    Permission.MANAGE_STOCK,
    Permission.REQUEST_STOCK,
  ],

  [PlatformRole.FINANCE_ADMIN]: [
    Permission.VIEW_SYSTEM_DASHBOARD,
    Permission.MANAGE_INVESTORS,
    Permission.MANAGE_POS,
    Permission.MANAGE_ORGANIZATIONS,
  ],

  [PlatformRole.SERVICE_ADMIN]: [
    Permission.VIEW_SYSTEM_DASHBOARD,
    Permission.MANAGE_SERVICES,
  ],

  [PlatformRole.USER]: [],
};

// ─── Helper: check if a platform role is any admin role ─────────────────
export const ADMIN_ROLES: string[] = [
  PlatformRole.SUPER_ADMIN,
  PlatformRole.ADMIN,
  PlatformRole.HR_ADMIN,
  PlatformRole.CONTENT_ADMIN,
  PlatformRole.PARTNER_ADMIN,
  PlatformRole.WAREHOUSE_ADMIN,
  PlatformRole.FINANCE_ADMIN,
  PlatformRole.SERVICE_ADMIN,
];

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isFullAdmin(role: string): boolean {
  return role === PlatformRole.SUPER_ADMIN || role === PlatformRole.ADMIN;
}

export function getPlatformPermissions(role: string): Permission[] {
  return PLATFORM_ROLE_PERMISSIONS[role] || [];
}

export function hasPlatformPermission(role: string, permission: Permission): boolean {
  const perms = PLATFORM_ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

// ─── Admin role display labels (Mongolian) ──────────────────────────────
export const ADMIN_ROLE_LABELS: Record<string, string> = {
  [PlatformRole.SUPER_ADMIN]: "Ерөнхий админ",
  [PlatformRole.ADMIN]: "Админ",
  [PlatformRole.HR_ADMIN]: "Хүний нөөц",
  [PlatformRole.CONTENT_ADMIN]: "Контент менежер",
  [PlatformRole.PARTNER_ADMIN]: "Түнш менежер",
  [PlatformRole.WAREHOUSE_ADMIN]: "Агуулахын менежер",
  [PlatformRole.FINANCE_ADMIN]: "Санхүүгийн менежер",
  [PlatformRole.SERVICE_ADMIN]: "Үйлчилгээний менежер",
};

// ─── Navigation access per role ─────────────────────────────────────────
// Maps admin sidebar nav item IDs to required permissions.
// If a role has ANY of the listed permissions, the nav item is visible.
export const NAV_PERMISSION_MAP: Record<string, Permission[]> = {
  dashboard: [Permission.VIEW_SYSTEM_DASHBOARD],
  requests: [Permission.MANAGE_REGISTRATIONS, Permission.MANAGE_JOB_APPLICATIONS, Permission.MANAGE_STOCK, Permission.MANAGE_SERVICES],
  partners: [Permission.MANAGE_ORGANIZATIONS],
  warehouses: [Permission.MANAGE_WAREHOUSES],
  sections: [Permission.VIEW_SYSTEM_DASHBOARD],
  settings: [Permission.MANAGE_SITE_SETTINGS],
  categories: [Permission.MANAGE_CATEGORIES],
  applications: [Permission.MANAGE_JOB_APPLICATIONS],
  investors: [Permission.MANAGE_INVESTORS],
  hr: [Permission.MANAGE_USERS],
  services: [Permission.MANAGE_SERVICES],
  tools: [Permission.MANAGE_FORMS],
};
