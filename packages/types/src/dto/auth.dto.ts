import type { ID } from "../primitives";
import type { OnboardingSource, PlatformRole } from "../enums";

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: ID;
    email: string;
    role: PlatformRole;
    organizationId?: ID | null;
  };
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface RegisterIndividualDto {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  registerNumber?: string;
}

export interface CreateUserByAdminDto {
  email: string;
  password: string;
  role: PlatformRole;
  fullName: string;
  phoneNumber?: string;
  organizationId?: ID;
  onboardingSource?: OnboardingSource;
}
