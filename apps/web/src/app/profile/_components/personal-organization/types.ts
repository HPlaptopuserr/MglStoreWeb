export type InviteeUser = {
  id: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
};

export type PendingPersonalOrganization = {
  id: string;
  name: string;
  status: string;
  businessCategory: string | null;
  createdAt: string;
  invitation: {
    id: string;
    status: string;
    rejectedReason: string | null;
    createdAt: string;
    inviteeName: string;
    inviteeEmail: string | null;
    inviteePhone: string | null;
    inviteeAvatarUrl: string | null;
  } | null;
};

export type PersonalOrganizationInvitation = {
  id: string;
  message: string | null;
  createdAt: string;
  organizationId: string;
  organizationName: string;
  businessCategory: string | null;
  ownerName: string;
  ownerEmail: string | null;
  ownerPhone: string | null;
};

export type PersonalOrganizationOverview = {
  ownedPending: PendingPersonalOrganization[];
  invitations: PersonalOrganizationInvitation[];
};

export type CreatePersonalOrganizationResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
    status: string;
    businessCategory: string | null;
  };
};
