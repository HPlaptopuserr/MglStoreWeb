import type { BaseEntity, SoftDelete } from "../common";
import type { ID, URLString } from "../primitives";
import type { OrgStatus, OrgType, InvestorTier } from "../enums";

export interface Organization extends BaseEntity, SoftDelete {
  id: ID;
  name: string;
  slug: string;
  taxId: string;

  type: OrgType;
  status: OrgStatus;
  isVerified: boolean;

  email?: string | null;
  phone?: string | null;
  logoUrl?: URLString | null;
  address?: string | null;
}

export interface InvestorProfile extends BaseEntity {
  id: ID;
  organizationId: ID;
  tier: InvestorTier;
  featured: boolean;
  priority: number;
  publiclyVisible: boolean;
  investmentLevel?: string | null;
  description?: string | null;
  joinedAt: string;
}

export interface Branch extends BaseEntity, SoftDelete {
  id: ID;
  organizationId: ID;
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
}

export interface Category extends BaseEntity {
  id: ID;
  name: string;
  slug: string;
  parentId?: ID | null;
}
