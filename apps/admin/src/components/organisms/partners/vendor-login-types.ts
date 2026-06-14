export type VendorLoginRole = "OWNER" | "ADMIN" | "STAFF" | "VIEWER";

export type VendorLoginMember = {
  id: string;
  userId: string;
  role: string;
  isPrimary?: boolean;
  memberActive?: boolean;
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  isActive?: boolean;
  hasPassword?: boolean;
  canLogin?: boolean;
  loginIdentifier?: string | null;
  accountContext?: string | null;
  lastLoginAt?: string | null;
};

export type PartnerForLoginAccounts = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  members?: VendorLoginMember[];
  stats?: {
    users?: number;
  };
};

export type PersonalAccountOption = {
  id: string;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
};

export const vendorLoginRoleLabel: Record<VendorLoginRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

export const assignableVendorLoginRoles = ["ADMIN", "STAFF", "VIEWER"] as const;
