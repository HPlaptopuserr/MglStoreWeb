// packages/types/src/dto/auth.dto.ts
import type { ID } from "../primitives";

export interface RegisterDto {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface RefreshDto {
    refreshToken: string;
}

export interface LogoutDto {
    sessionId: ID;
}

export interface RequestPasswordResetDto {
    email: string;
}

export interface ResetPasswordDto {
    token: string;
    newPassword: string;
}