// packages/types/src/domain/user.ts
import type { ID, ISODateString, SoftDeletable, Timestamps } from "../primitives";
import type { Role } from "../enums/role";

export enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
}

export interface User extends Timestamps, SoftDeletable {
    id: ID;
    email: string;

    password?: string;

    registerNumber?: string | null;

    role: Role;
    isActive: boolean;
    emailVerified: boolean;
    lastLoginAt?: ISODateString | null;

    organizationId?: ID | null;
}

export interface Profile extends Timestamps {
    userId: ID;
    fullName: string;
    phoneNumber?: string | null;
    avatarUrl?: string | null;

    birthDate?: ISODateString | null;
    gender?: Gender | null;
    birthPlaceCode?: string | null;
}

export interface Address extends Timestamps, SoftDeletable {
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

export enum AuditAction {
    LOGIN = "LOGIN",
    LOGOUT = "LOGOUT",
    PASSWORD_RESET_REQUEST = "PASSWORD_RESET_REQUEST",
    PASSWORD_RESET_SUCCESS = "PASSWORD_RESET_SUCCESS",
    PASSWORD_CHANGED = "PASSWORD_CHANGED",

    ORDER_CREATED = "ORDER_CREATED",
    ORDER_STATUS_CHANGED = "ORDER_STATUS_CHANGED",
    PAYMENT_CREATED = "PAYMENT_CREATED",
    PAYMENT_STATUS_CHANGED = "PAYMENT_STATUS_CHANGED",
    DELIVERY_STATUS_CHANGED = "DELIVERY_STATUS_CHANGED",
    RETURN_STATUS_CHANGED = "RETURN_STATUS_CHANGED",
}

export interface AuditLog {
    id: ID;

    userId?: ID | null;
    action: AuditAction;

    ip?: string | null;
    userAgent?: string | null;
    meta?: unknown; // Prisma Json

    createdAt: ISODateString;
}