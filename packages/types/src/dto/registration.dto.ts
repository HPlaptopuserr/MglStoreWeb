import type { ID } from "../primitives";
import type { ApprovalStatus, OnboardingSource, OrgType, PlatformRole } from "../enums";

export interface CreateRegistrationRequestDto {
  email: string;
  password?: string;
  requestedRole: PlatformRole;
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
