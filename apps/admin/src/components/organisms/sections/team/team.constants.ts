import type { TeamMemberForm } from "./team.types";
export const DEFAULT_DEPARTMENT_OPTIONS = [
  "Үүсгэн байгуулагчид",
  "Хөрөнгө оруулагчид",
  "Зөвлөхүүд",
  "Захиргаа удирдлагын хэлтэс",
  "Бүтээгдэхүүн хөгжүүлэлтийн хэлтэс",
  "Технологийн хэлтэс",
  "Маркетинг борлуулалтын хэлтэс",
  "Үйл ажиллагааны хэлтэс",
  "Санхүүгийн хэлтэс",
];
export const TEAM_DEPARTMENTS_SETTING_KEY = "teamDepartments";
export const TEAM_COMPANY_NAME_SETTING_KEY = "teamCompanyName";
export const TEAM_COMPANY_SUBTITLE_SETTING_KEY = "teamCompanySubtitle";
export const TEAM_COMPANY_NODES_SETTING_KEY = "teamCompanyNodes";
export const TEAM_DEPARTMENT_CONNECTIONS_SETTING_KEY =
  "teamDepartmentConnections";
export const TEAM_ORG_LAYOUT_SETTING_KEY = "teamOrgLayout";
export const DEFAULT_TEAM_COMPANY_NAME = "MGL STORE ХХК";
export const DEFAULT_TEAM_COMPANY_SUBTITLE = "MGL STORE LLC";
export const DISCONNECTED_COMPANY_ID = "__none__";
export const ROLE_OPTIONS = [
  "Үүсгэн байгуулагч, CEO",
  "Хөрөнгө оруулагч",
  "Стратегийн зөвлөх",
  "HR",
  "Бүтээгдэхүүн хөгжүүлэлтийн менежер",
  "UI/UX дизайнер",
  "Frontend хөгжүүлэгч",
  "Backend хөгжүүлэгч",
  "Маркетингийн менежер",
  "Борлуулалтын зөвлөх",
  "Логистик зохицуулагч",
  "Санхүүгийн мэргэжилтэн",
];
export const QUICK_SKILLS = [
  "Founder",
  "Strategy",
  "Leadership",
  "Хөрөнгө оруулагч",
  "Finance",
  "Advisor",
  "HR",
  "Product",
  "UI design",
  "Next.js",
  "React",
  "Prisma",
  "Marketing",
  "Operations",
];
export const EMPTY_FORM: TeamMemberForm = {
  name: "",
  role: "",
  department: "",
  bio: "",
  avatarUrl: "",
  email: "",
  phoneNumber: "",
  linkedinUrl: "",
  experience: "",
  skills: [],
  order: 0,
};
