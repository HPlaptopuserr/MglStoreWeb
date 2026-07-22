export type TabType = "partners" | "careers";
export type SectionType =
  | "partner-career"
  | "stock"
  | "service"
  | "card-terminal";

export type CardTerminalRequest = {
  id: string;
  organizationId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  providerType: string;
  businessNote: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  cardTerminalId: string | null;
  terminalBridgeUrl: string | null;
  createdAt: string;
  reviewedAt: string | null;
  organization: {
    id: string;
    name: string;
    slug: string;
    phone: string | null;
    email: string | null;
    taxId: string;
  };
  reviewedBy: {
    id: string;
    email: string;
    profile: { fullName: string } | null;
  } | null;
};

export const CARD_PROVIDERS: Record<string, string> = {
  MINUPOS: "Мину Пос",
  MONPAY: "МонПэй",
  GOLOMT: "Голомт банк",
  TDB: "Худалдаа хөгжлийн банк (TDB)",
  KHAAN: "Хаан банк",
  KHAS: "Хас банк",
  OTHER: "Бусад",
};

export type PartnerRequest = {
  id: string;
  email: string;
  phoneNumber: string | null;
  organizationName: string | null;
  businessCategory: string | null;
  operatingYears: number | null;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
};

export type JobApplication = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  registerNumber: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  jobPosition:
    | string
    | {
        id?: string;
        name?: string;
        slug?: string;
        isActive?: boolean;
        createdAt?: string;
      }
    | null;
  education: string | null;
  salaryExpect: string | null;
  experience: string | null;
  professionalSkills: string | null;
  personalSkills: string | null;
  languages: string | null;
  status: string;
  createdAt: string;
};

export type StockRequestSummary = {
  id: string;
  requestNumber: string;
  status: string;
  requestedAt: string;
  organization?: { name?: string };
  warehouse?: { name?: string };
};

export type ServiceRequestSummary = {
  id: string;
  title: string;
  typeLabel?: string;
  status: string;
  statusLabel?: string;
  createdAt: string;
  organization?: { name?: string };
};

export const JOB_POSITION_LABELS: Record<string, string> = {
  driver: "Жолооч",
  picker: "Бараа бэлтгэгч",
  support: "Хэрэглэгчийн үйлчилгээ",
  admin: "Админ",
};

export function getJobPositionLabel(
  jobPosition: JobApplication["jobPosition"],
) {
  if (!jobPosition) {
    return "-";
  }

  if (typeof jobPosition === "string") {
    return JOB_POSITION_LABELS[jobPosition] || jobPosition;
  }

  if (jobPosition.name) {
    return jobPosition.name;
  }

  if (jobPosition.slug) {
    return JOB_POSITION_LABELS[jobPosition.slug] || jobPosition.slug;
  }

  return "-";
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Хүлээгдэж буй";
    case "APPROVED":
      return "Зөвшөөрсөн";
    case "REJECTED":
      return "Татгалзсан";
    default:
      return status;
  }
}

export function getStatusClass(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "REJECTED":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-200";
  }
}

export function getRequestTotalText({
  section,
  tab,
  partnerCount,
  jobCount,
  stockCount,
  serviceCount,
  cardTerminals,
}: {
  section: SectionType;
  tab: TabType;
  partnerCount: number;
  jobCount: number;
  stockCount: number;
  serviceCount: number;
  cardTerminals: CardTerminalRequest[];
}) {
  if (section === "stock") return `Нийт бараа таталтын хүсэлт: ${stockCount}`;
  if (section === "service") return `Нийт үйлчилгээний хүсэлт: ${serviceCount}`;
  if (section === "card-terminal") {
    const pending = cardTerminals.filter(
      ({ status }) => status === "PENDING",
    ).length;
    return `Card Terminal хүсэлт: ${cardTerminals.length}${pending ? ` · ${pending} хүлээгдэж буй` : ""}`;
  }
  const count = tab === "partners" ? partnerCount : jobCount;
  return `Нийт ${tab === "partners" ? "Түнш хүсэлт" : "Ажлын анкет"}: ${count}`;
}
