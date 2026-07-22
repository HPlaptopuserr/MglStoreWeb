export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string | null;
  bio: string | null;
  avatarUrl: string | null;
  email: string | null;
  phoneNumber: string | null;
  linkedinUrl: string | null;
  experience: string | null;
  skills: string[];
  order: number;
  isActive: boolean;
}
export interface TeamDepartment {
  name: string;
  count: number;
}
export interface NetworkPartner {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  businessCategory: string | null;
  shortDescription: string | null;
  isInvestor?: boolean;
  stats?: { users?: number; products?: number; branches?: number };
}
export interface TeamCompanyNode {
  id: string;
  name: string;
  subtitle: string;
  order: number;
}
export type TeamMemberForm = Omit<TeamMember, "id" | "isActive">;
