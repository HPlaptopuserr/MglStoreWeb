import type { ReactNode } from "react";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronDown,
  Circle,
  Hash,
  List,
  Type,
} from "lucide-react";
import { detectWebBaseUrl } from "@/lib/sections/utils";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "dropdown"
  | "checkbox"
  | "radio"
  | "date"
  | "label";

export interface FieldOption {
  id: string;
  value: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: FieldOption[];
  placeholder?: string;
}

export interface Form {
  id: string;
  slug: string;
  title: string;
  description: string;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  _count?: { responses: number };
}

export interface FormResponse {
  id: string;
  formId: string;
  data: Record<string, string | string[]>;
  submittedAt: string;
}

export type View = "list" | "builder" | "preview" | "responses";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const uid = () => crypto.randomUUID();

export const FIELD_TYPES: {
  type: FieldType;
  label: string;
  icon: ReactNode;
}[] = [
  { type: "text", label: "Богино хариулт", icon: <Type className="h-4 w-4" /> },
  {
    type: "textarea",
    label: "Дэлгэрэнгүй хариулт",
    icon: <AlignLeft className="h-4 w-4" />,
  },
  { type: "number", label: "Тоон утга", icon: <Hash className="h-4 w-4" /> },
  {
    type: "dropdown",
    label: "Жагсаалтаас сонгох",
    icon: <ChevronDown className="h-4 w-4" />,
  },
  {
    type: "checkbox",
    label: "Олон сонголт",
    icon: <CheckSquare className="h-4 w-4" />,
  },
  { type: "radio", label: "Нэг сонголт", icon: <Circle className="h-4 w-4" /> },
  { type: "date", label: "Огноо", icon: <Calendar className="h-4 w-4" /> },
  {
    type: "label",
    label: "Хэсгийн гарчиг",
    icon: <List className="h-4 w-4" />,
  },
];

export function getFormLink(slug: string): string {
  return `${detectWebBaseUrl()}/forms/${slug}`;
}

export function escapeCSV(val: string): string {
  if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

// ─── Main Component ──────────────────────────────────────────────────────────
