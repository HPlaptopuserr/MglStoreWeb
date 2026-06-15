export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string | null;
  bio: string | null;
  avatarUrl: string | null;
  email: string | null;
  phoneNumber?: string | null;
  linkedinUrl: string | null;
  experience: string | null;
  skills: string[];
  order: number;
}

export interface TeamInvestor {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  tier: string;
  tierLabel: string;
  investmentLevel: string | null;
  joinedAt: string;
}

export interface TeamNetworkCompany {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  businessCategory: string | null;
  description: string | null;
  shortDescription: string | null;
  address: string | null;
  isInvestor: boolean;
  stats?: {
    users?: number;
    products?: number;
    branches?: number;
    orders?: number;
  };
}

export interface TeamCompanyInfo {
  name: string;
  subtitle: string;
}

export interface TeamCompanyNode {
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

export const TEAM_ORG_DISCONNECTED_COMPANY_ID = "__none__";

export const ALL_DEPARTMENTS = "Бүгд";

export const CARD_GRADIENTS = [
  "from-amber-400 via-orange-400 to-orange-500",
  "from-violet-400 via-fuchsia-500 to-purple-600",
  "from-emerald-400 via-teal-400 to-cyan-500",
  "from-sky-400 via-blue-500 to-indigo-600",
  "from-rose-400 via-pink-500 to-red-500",
  "from-lime-400 via-green-500 to-emerald-600",
];

export function normalizeText(value: string | null | undefined) {
  return value?.toLocaleLowerCase("mn-MN").trim() ?? "";
}

export function getMemberSearchText(member: TeamMember) {
  return [
    member.name,
    member.role,
    member.department,
    member.bio,
    member.experience,
    ...member.skills,
  ]
    .map(normalizeText)
    .join(" ");
}

export function getLeadershipGroup(member: TeamMember) {
  const text = getMemberSearchText(member);

  if (text.includes("үүсгэн") || text.includes("founder")) {
    return "founders";
  }

  if (text.includes("хөрөнгө") || text.includes("investor")) {
    return "investors";
  }

  if (text.includes("зөвлөх") || text.includes("advisor")) {
    return "advisors";
  }

  return null;
}

export function isLeadershipMember(member: TeamMember) {
  return getLeadershipGroup(member) !== null;
}
