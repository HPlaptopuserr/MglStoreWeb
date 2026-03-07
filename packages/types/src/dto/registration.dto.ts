import type { ID } from "../primitives";
import type { ApprovalStatus, OnboardingSource, OrgType, Role } from "../enums";

export interface CreateRegistrationRequestDto {
  email: string;
  password?: string;
  requestedRole: Role;
  source?: OnboardingSource;

  fullName?: string;
  phoneNumber?: string;

  organizationName?: string;
  organizationType?: OrgType;
  registerNumber?: string;
  taxId?: string;
  organizationEmail?: string;
  organizationPhone?: string;
  organizationAddress?: string;

  note?: string;
}

export interface ReviewRegistrationRequestDto {
  reviewedById: ID;
  status: ApprovalStatus;
  rejectReason?: string;
}
