import type {
  ProjectItem,
  ProjectPaymentAccount,
  ProjectShowcaseSection,
} from "@/lib/sections/types";

export type ProjectMode = "project" | "franchise" | "study";
export interface StudyProgramRow {
  title: string;
  description: string;
}
export interface StudyTeacherRow {
  name: string;
  description: string;
  imageUrl?: string;
}
export interface ContractTemplateOption {
  id: string;
  title: string;
  isPaid?: boolean;
}
export interface TeamMemberOption {
  id: string;
  name: string;
  role?: string;
  department?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  isActive?: boolean;
}
export interface ProjectsSectionProps {
  projects: ProjectItem[];
  paymentAccounts?: ProjectPaymentAccount[];
  projectShowcaseSections?: ProjectShowcaseSection[];
  mode?: ProjectMode;
  setProjects: (
    update: ProjectItem[] | ((previous: ProjectItem[]) => ProjectItem[]),
  ) => void;
  setProjectShowcaseSections?: (
    update:
      | ProjectShowcaseSection[]
      | ((previous: ProjectShowcaseSection[]) => ProjectShowcaseSection[]),
  ) => void;
  onSave: (
    currentProjects?: ProjectItem[],
    currentShowcaseSections?: ProjectShowcaseSection[],
  ) => Promise<boolean | void> | boolean | void;
  saving?: boolean;
  saved?: boolean;
}
