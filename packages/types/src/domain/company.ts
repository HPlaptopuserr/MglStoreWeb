import type { ID, ISODateString, SoftDeletable, Timestamps } from "../primitives";

export enum OrgType {
  SUPPLIER = "SUPPLIER",
  BUSINESS_CUSTOMER = "BUSINESS_CUSTOMER",
}

export enum OrgStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  BLOCKED = "BLOCKED",
}

export interface Organization extends Timestamps, SoftDeletable {
  id: ID;
  name: string;
  slug: string;
  taxId: string;

  type: OrgType;
  status: OrgStatus;
  isVerified: boolean;

  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  address?: string | null;
}

export interface Branch extends Timestamps, SoftDeletable {
  id: ID;
  organizationId: ID;

  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
}