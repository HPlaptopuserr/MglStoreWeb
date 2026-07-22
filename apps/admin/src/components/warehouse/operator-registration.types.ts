export type RegistrationResult = {
  userId: string;
  operatorId: string;
  email: string;
  setupLink: string;
  expiresAt: string;
};

export type RegistrationResponse = {
  success?: boolean;
  message?: string;
  data?: RegistrationResult;
};

export type PersonalAccount = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  isAssigned: boolean;
};
