import type { BaseEntity, SoftDelete } from "../common";
import type { ID, ISODateString, URLString } from "../primitives";
import type { AuditAction, Gender, OnboardingSource, PlatformRole } from "../enums";
import type { JsonValue } from "../primitives";

export interface User extends BaseEntity, SoftDelete {
  id: ID;
  email: string;
  password: string;

  registerNumber?: string | null;
  role: PlatformRole;
  isPrime: boolean;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: ISODateString | null;

  onboardingSource: OnboardingSource;
}

export interface Profile {
  userId: ID;
  fullName: string;
  phoneNumber?: string | null;
  avatarUrl?: URLString | null;

  birthDate?: ISODateString | null;
  gender?: Gender | null;
  birthPlaceCode?: string | null;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface UserSession {
  id: ID;
  userId: ID;
  refreshHash: string;
  userAgent?: string | null;
  ip?: string | null;
  deviceId?: string | null;

  createdAt: ISODateString;
  expiresAt: ISODateString;
  revokedAt?: ISODateString | null;
}

export interface PasswordResetToken {
  id: ID;
  userId: ID;
  tokenHash: string;
  expiresAt: ISODateString;
  usedAt?: ISODateString | null;
  createdAt: ISODateString;
}

export interface AuditLog {
  id: ID;
  userId?: ID | null;
  action: AuditAction;
  ip?: string | null;
  userAgent?: string | null;
  meta?: JsonValue | null;
  createdAt: ISODateString;
}

export interface Address extends BaseEntity, SoftDelete {
  id: ID;
  userId: ID;

  label?: string | null;
  fullAddress: string;
  city?: string | null;
  district?: string | null;
  khoroo?: string | null;
  entrance?: string | null;
  apartment?: string | null;

  lat?: number | null;
  lng?: number | null;

  isDefault: boolean;
}
