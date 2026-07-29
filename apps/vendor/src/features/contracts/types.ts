export type ContractStatus = "PENDING" | "SIGNED" | "EXPIRED" | string;

export interface ArchivedContract {
  id: string;
  templateId: string | null;
  org: string;
  register: string | null;
  phone: string | null;
  email: string | null;
  director: string | null;
  position: string | null;
  contractNumber: string | null;
  contractName: string | null;
  status: ContractStatus;
  feePlan: string | null;
  feePlanLabel: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  pdfUrl: string | null;
  customFields: ContractCustomField[];
}

export interface ContractCustomField {
  id: string;
  label: string;
  value: string;
  type: "text" | "date";
}

export type ArchiveStatusFilter =
  | "ALL"
  | "SIGNED"
  | "PENDING"
  | "EXPIRING"
  | "EXPIRED";

export interface ContractArchiveResponse {
  success: boolean;
  submissions?: ArchivedContract[];
  error?: string;
}

export interface ScannedContractForm {
  org: string;
  register: string;
  phone: string;
  email: string;
  director: string;
  position: string;
  contractNumber: string;
  contractName: string;
  signedAt: string;
  expiresAt: string;
  customFields: ContractCustomField[];
}

export interface ArchiveFieldDefinition {
  key: string;
  label: string;
  type: "text" | "date";
}
