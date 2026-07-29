import type { ScannedContractForm } from "./types";

export type StandardContractFieldKey = Exclude<
  keyof ScannedContractForm,
  "customFields"
>;

export interface StandardContractField {
  key: StandardContractFieldKey;
  label: string;
  type?: "text" | "tel" | "email" | "date";
  required?: boolean;
  placeholder?: string;
  removable?: boolean;
}

export const STANDARD_CONTRACT_FIELDS: StandardContractField[] = [
  { key: "contractName", label: "Гэрээний нэр", required: true, placeholder: "Жишээ: Нийлүүлэлтийн гэрээ" },
  { key: "org", label: "Харилцагч байгууллага", required: true },
  { key: "contractNumber", label: "Гэрээний дугаар", placeholder: "Жишээ: CT-2026-001", removable: true },
  { key: "register", label: "Регистр", removable: true },
  { key: "director", label: "Захирал / төлөөлөгч", removable: true },
  { key: "position", label: "Албан тушаал", removable: true },
  { key: "phone", label: "Утас", type: "tel", removable: true },
  { key: "email", label: "И-мэйл", type: "email", removable: true },
  { key: "signedAt", label: "Байгуулсан огноо", type: "date", removable: true },
  { key: "expiresAt", label: "Дуусах огноо", type: "date", removable: true },
];

export const OPTIONAL_CONTRACT_FIELDS = STANDARD_CONTRACT_FIELDS.filter(
  (field) => field.removable,
);

export function createInitialContractForm(): ScannedContractForm {
  return {
    org: "",
    register: "",
    phone: "",
    email: "",
    director: "",
    position: "",
    contractNumber: "",
    contractName: "",
    signedAt: new Date().toISOString().slice(0, 10),
    expiresAt: "",
    customFields: [],
  };
}
