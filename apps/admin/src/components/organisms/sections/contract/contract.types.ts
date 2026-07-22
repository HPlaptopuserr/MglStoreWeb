import type { OrgContactInfo } from "./OrgInfoFields";
import type { ContractPaymentAccount } from "./PaymentAccountPanels";

export interface ContractFeePlan {
  key: string;
  label: string;
  sublabel: string;
  price: number;
}
export interface ContractMemberField {
  key: string;
  label: string;
  enabled: boolean;
  required: boolean;
}
export interface ContractSystemQrConfig {
  enabled: boolean;
  selectedAccountId: string;
  username: string;
  password: string;
  merchantCode: string;
  merchantName: string;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  registerNumber: string;
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  corporateName: string;
  cityId: string;
  districtId: string;
  khorooId: string;
  building: string;
  doorNo: string;
  corporateFlag: string;
  gender: string;
  subCategoryId: string;
}
export interface ContractSettings {
  adminSignature: string;
  adminStamp: string | null;
  presidentName: string;
  presidentTitle: string;
  orgName: string;
  headerTitle: string;
  headerSubtitle: string;
  headerContractTitle: string;
  content: string;
  contentIsHtml: boolean;
  isPaid: boolean;
  hasDuration: boolean;
  defaultFeePlan: string;
  feePlans: ContractFeePlan[];
  memberFields: ContractMemberField[];
  orgContact: OrgContactInfo;
  paymentAccounts: ContractPaymentAccount[];
  systemQr: ContractSystemQrConfig;
}
export interface ContractStats {
  total: number;
  signed: number;
  pending: number;
}
