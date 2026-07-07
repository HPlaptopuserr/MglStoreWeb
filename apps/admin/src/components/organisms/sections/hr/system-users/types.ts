import type { ElementType } from "react";

export type SystemUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  isPrime: boolean;
  membershipPaidAt?: string | null;
  membershipStartedAt?: string | null;
  membershipExpiresAt?: string | null;
  membershipDiscountPhone?: string | null;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  organizationId: string | null;
  organizationName: string | null;
  memberships: SystemUserMembership[];
  createdAt: string;
};

export type SystemUserMembership = {
  role: string;
  isActive: boolean;
  isPrimary?: boolean;
  orgId?: string;
  orgName: string;
};

export type UsersSummary = {
  totalUsers: number;
  activeUsers: number;
  primeUsers: number;
  roles: Record<string, number>;
};

export type UsersResponse = {
  items: SystemUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: UsersSummary;
};

export type UsersStatusFilter = "" | "active" | "inactive";
export type UsersPrimeFilter = "" | "prime";
export type SummaryFilter = "all" | "active" | "prime" | `role:${string}`;

export type UsersQuery = {
  page: number;
  limit: number;
  search: string;
  role: string;
  status: UsersStatusFilter;
  prime: UsersPrimeFilter;
};

export type RoleMeta = {
  label: string;
  color: string;
  bg: string;
  icon: ElementType;
};

export type CreateAdminUserInput = {
  email: string;
  fullName: string;
  password: string;
  role: string;
};

export type UpdateMembershipOptions = {
  durationMonths?: number;
  expiresAt?: string;
};
