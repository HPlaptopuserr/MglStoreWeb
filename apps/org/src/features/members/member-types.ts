export type MemberRole = "OWNER" | "ADMIN" | "STAFF" | "VIEWER";

export type MemberCapability =
  | "KITCHEN_CHEF"
  | "POS_CASHIER"
  | "DELIVERY_DRIVER"
  | "STOCK_MANAGER"
  | "ORDER_PROCESSOR";

export type OrganizationMember = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: MemberRole;
  roleLabel: string;
  department: string | null;
  capabilities: MemberCapability[];
  isActive: boolean;
  isPrimary: boolean;
  createdAt: string;
  performance?: {
    evaluationCount: number;
    averageStars: number | null;
    averageProductivityPercent: number | null;
  };
};

export const ROLE_OPTIONS: Array<{
  value: MemberRole;
  label: string;
  description: string;
}> = [
  {
    value: "OWNER",
    label: "Эзэмшигч",
    description: "Байгууллагын тохиргоо болон бүх үйл ажиллагааг удирдана.",
  },
  {
    value: "ADMIN",
    label: "Менежер",
    description: "Ажилтан, бараа, захиалга болон үйл ажиллагааг удирдана.",
  },
  {
    value: "STAFF",
    label: "Ажилтан",
    description: "Оноосон ажлын эрхийн хүрээнд систем ашиглана.",
  },
  {
    value: "VIEWER",
    label: "Ажиглагч",
    description: "Dashboard болон захиалгыг зөвхөн харна.",
  },
];

export interface MglAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isMember: boolean;
}

export const CAPABILITY_OPTIONS: Array<{
  value: MemberCapability;
  label: string;
  description: string;
}> = [
  {
    value: "KITCHEN_CHEF",
    label: "Тогооч",
    description: "Зөвхөн гал тогооны захиалгыг харж, төлөв өөрчилнө.",
  },
  {
    value: "POS_CASHIER",
    label: "POS кассчин",
    description: "Касс нээж, борлуулалт бүртгэнэ.",
  },
  {
    value: "STOCK_MANAGER",
    label: "Бараа хариуцагч",
    description: "Үлдэгдэл удирдаж, татан авалтын хүсэлт гаргана.",
  },
  {
    value: "ORDER_PROCESSOR",
    label: "Захиалга хариуцагч",
    description: "Захиалга харах болон боловсруулах эрхтэй.",
  },
  {
    value: "DELIVERY_DRIVER",
    label: "Түгээгч",
    description: "Хүргэлтийн ажлыг хүлээн авч гүйцэтгэнэ.",
  },
];

export function roleLabel(role: MemberRole) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label || role;
}

export function capabilityLabel(capability: MemberCapability) {
  return (
    CAPABILITY_OPTIONS.find((option) => option.value === capability)?.label ||
    capability
  );
}

export function canManageMembers(role?: string | null) {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageMember(
  actorRole: string | null | undefined,
  actorUserId: string,
  member: OrganizationMember,
) {
  if (member.userId === actorUserId || member.role === "OWNER") return false;
  if (actorRole === "OWNER") return true;
  return (
    actorRole === "ADMIN" &&
    (member.role === "STAFF" || member.role === "VIEWER")
  );
}

export function assignableRoles(actorRole?: string | null) {
  return ROLE_OPTIONS.filter((option) => {
    if (actorRole === "OWNER") return option.value !== "OWNER";
    if (actorRole === "ADMIN") {
      return option.value === "STAFF" || option.value === "VIEWER";
    }
    return false;
  });
}
