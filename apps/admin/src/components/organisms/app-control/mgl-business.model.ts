import {
  BellRing,
  BrainCircuit,
  CalendarClock,
  ChartNoAxesCombined,
  ClipboardList,
  Clock3,
  FileChartColumnIncreasing,
  Package,
  ReceiptText,
  ShieldAlert,
  Truck,
} from "lucide-react";

export type BusinessAppFeatures = {
  orders: boolean;
  inventory: boolean;
  attendance: boolean;
  tasks: boolean;
  delivery: boolean;
};

export type BusinessAppSettings = {
  attendanceManual: boolean;
  restrictSalesRepVendors: boolean;
};

export type CeoServiceControls = {
  enabled: boolean;
  adviceNotifications: boolean;
  calendarReminders: boolean;
  weeklyDigest: boolean;
  riskAlerts: boolean;
  kpiInsights: boolean;
  decisionBrief: boolean;
};

export type BusinessAppControl = {
  id: string;
  name: string;
  slug: string;
  maxMembers: number;
  activeMembers: number;
  features: BusinessAppFeatures;
  settings: BusinessAppSettings;
  ceoService: CeoServiceControls;
  members: BusinessAppMember[];
};

export type BusinessAppMember = {
  id: string;
  userId: string;
  role: BusinessAppRole;
  isPrimary?: boolean;
  memberActive?: boolean;
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  canLogin?: boolean;
};

export type BusinessAppRole = "OWNER" | "ADMIN" | "STAFF" | "VIEWER";

export type AppFeatureOption = {
  key: keyof BusinessAppFeatures;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof ReceiptText;
};

export const FEATURE_OPTIONS: AppFeatureOption[] = [
  {
    key: "delivery",
    label: "Хүргэлтийн ажиллагаа",
    shortLabel: "Delivery",
    description:
      "Удирдах ажилтан жолоочийн эрх оноож, хүргэлтийн ажилтны тусгай интерфейс ашиглах боломж нээнэ.",
    icon: Truck,
  },
  {
    key: "tasks",
    label: "Даалгавар",
    shortLabel: "Tasks",
    description: "Ажилчдад task оноох, өөрийн ажлын жагсаалт үүсгэх хэсэг.",
    icon: ClipboardList,
  },
  {
    key: "orders",
    label: "Захиалга",
    shortLabel: "Orders",
    description:
      "Ажилчдын account дээр захиалга хүлээн авах, төлөв солих хэсэг.",
    icon: ReceiptText,
  },
  {
    key: "inventory",
    label: "Дотоод бараа, агуулах",
    shortLabel: "Internal inventory",
    description:
      "MGL Business app-д өөрийн бараа бүртгэх, үлдэгдэл харах, агуулахаас татан авах хэсэг.",
    icon: Package,
  },
  {
    key: "attendance",
    label: "Цаг бүртгэл",
    shortLabel: "Attendance",
    description: "Ирц бүртгэл, ажлын бүс, цагийн хяналтын app хэсэг.",
    icon: Clock3,
  },
];

export const DEFAULT_FEATURES: BusinessAppFeatures = {
  orders: true,
  inventory: true,
  attendance: true,
  tasks: true,
  delivery: false,
};

export const DEFAULT_SETTINGS: BusinessAppSettings = {
  attendanceManual: false,
  restrictSalesRepVendors: false,
};

export const DEFAULT_CEO_SERVICE: CeoServiceControls = {
  enabled: false,
  adviceNotifications: true,
  calendarReminders: true,
  weeklyDigest: true,
  riskAlerts: true,
  kpiInsights: true,
  decisionBrief: true,
};

export const CEO_SERVICE_OPTIONS: Array<{
  key: Exclude<keyof CeoServiceControls, "enabled">;
  label: string;
  description: string;
  icon: typeof BellRing;
}> = [
  {
    key: "adviceNotifications",
    label: "CEO зөвлөгөө",
    description:
      "Удирдлагад зориулсан зөвлөгөө, чухал мэдээллийг notification-оор хүргэнэ.",
    icon: BrainCircuit,
  },
  {
    key: "calendarReminders",
    label: "Calendar сануулга",
    description: "Төлөвлөсөн ажлын хугацаа ойртох болон дуусах үед сануулна.",
    icon: CalendarClock,
  },
  {
    key: "weeklyDigest",
    label: "7 хоногийн тойм",
    description:
      "Ажил, ирц, гүйцэтгэлийн гол үзүүлэлтийг нэг товч тайлан болгоно.",
    icon: FileChartColumnIncreasing,
  },
  {
    key: "riskAlerts",
    label: "Эрсдэлийн дохио",
    description:
      "Хугацаа хэтэрсэн болон саатах эрсдэлтэй ажлыг эрт анхааруулна.",
    icon: ShieldAlert,
  },
  {
    key: "kpiInsights",
    label: "KPI insight",
    description:
      "Багийн бүтээмжийн өөрчлөлт, анхаарах үзүүлэлтийг ойлгомжтой харуулна.",
    icon: ChartNoAxesCombined,
  },
  {
    key: "decisionBrief",
    label: "Шийдвэрийн товч",
    description:
      "Өдрийн чухал асуудал, дараагийн боломжит алхмыг эрэмбэлж өгнө.",
    icon: ClipboardList,
  },
];

export const ROLE_OPTIONS: Array<{
  value: Exclude<BusinessAppRole, "OWNER">;
  label: string;
  description: string;
}> = [
  {
    value: "ADMIN",
    label: "Manager",
    description: "Task оноох, ажилтан/апп хэсгийг удирдах эрхтэй.",
  },
  {
    value: "STAFF",
    label: "Staff",
    description: "Өөрийн app хэсгүүдийг ашиглаж, task гүйцэтгэнэ.",
  },
  {
    value: "VIEWER",
    label: "Viewer",
    description: "Хязгаарлагдмал харах эрхтэй.",
  },
];

export const ROLE_LABEL: Record<BusinessAppRole, string> = {
  OWNER: "CEO / Owner",
  ADMIN: "Manager",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

export function hasFeatureDiff(
  draft: BusinessAppFeatures,
  saved: BusinessAppFeatures,
) {
  return FEATURE_OPTIONS.some(
    (feature) => draft[feature.key] !== saved[feature.key],
  );
}

export function filterOrganizations(
  organizations: BusinessAppControl[],
  search: string,
) {
  const needle = search.trim().toLowerCase();
  if (!needle) return organizations;
  return organizations.filter((organization) => {
    return (
      organization.name.toLowerCase().includes(needle) ||
      organization.slug.toLowerCase().includes(needle)
    );
  });
}

export function normalizeBusinessAppControl(
  organization: BusinessAppControl,
): BusinessAppControl {
  return {
    ...organization,
    members: organization.members ?? [],
    features: {
      orders: organization.features?.orders ?? true,
      inventory: organization.features?.inventory ?? true,
      attendance: organization.features?.attendance ?? true,
      tasks: organization.features?.tasks ?? true,
      delivery: organization.features?.delivery ?? false,
    },
    settings: {
      attendanceManual:
        organization.settings?.attendanceManual ??
        DEFAULT_SETTINGS.attendanceManual,
      restrictSalesRepVendors:
        organization.settings?.restrictSalesRepVendors ?? false,
    },
    ceoService: {
      ...DEFAULT_CEO_SERVICE,
      ...organization.ceoService,
    },
  };
}
