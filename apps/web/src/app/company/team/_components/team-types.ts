export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string | null;
  bio: string | null;
  avatarUrl: string | null;
  email: string | null;
  linkedinUrl: string | null;
  experience: string | null;
  skills: string[];
  order: number;
}

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
