import { API_BASE, OrgUser, saveOrgSession } from "@/lib/api";

const PHONE_PATTERN = /^[0-9+\-\s()]{7,15}$/;

type LoginPayload =
  | { email: string; password: string }
  | { phone: string; password: string };

type OrgAuthResponse = {
  accessToken: string;
  user: OrgUser;
};

type VerifyOrgUserOptions = {
  requiredUserId?: string;
  allowedOrgRoles?: readonly string[];
  accessDeniedMessage?: string;
};

function buildLoginPayload(identifier: string, password: string): LoginPayload {
  const value = identifier.trim();
  const isPhone = PHONE_PATTERN.test(value) && !value.includes("@");
  return isPhone
    ? { phone: value, password }
    : { email: value.toLowerCase(), password };
}

async function authenticateOrgUser(
  identifier: string,
  password: string,
): Promise<OrgAuthResponse> {
  const response = await fetch(`${API_BASE}/auth/vendor/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildLoginPayload(identifier, password)),
  });
  const data = (await response.json().catch(() => ({}))) as Partial<
    OrgAuthResponse & { message: string }
  >;

  if (!response.ok) {
    throw new Error(data.message || "Нэвтрэх үед алдаа гарлаа.");
  }

  if (!data.user?.organizationId) {
    throw new Error("Энэ хэрэглэгч байгууллагын эрхтэй холбогдоогүй байна.");
  }

  if (!data.accessToken) {
    throw new Error("Нэвтрэх эрхийн мэдээлэл дутуу байна.");
  }

  return { accessToken: data.accessToken, user: data.user };
}

export async function loginOrgUser(identifier: string, password: string) {
  const data = await authenticateOrgUser(identifier, password);

  saveOrgSession(data.accessToken, data.user);
}

export async function verifyOrgUserCredentials(
  identifier: string,
  password: string,
  organizationId: string,
  options: VerifyOrgUserOptions = {},
) {
  const data = await authenticateOrgUser(identifier, password);

  if (data.user.organizationId !== organizationId) {
    throw new Error(
      "Энэ хэрэглэгч одоогийн байгууллагын хамгаалалттай хэсэгт хандах эрхгүй байна.",
    );
  }

  if (options.requiredUserId && data.user.id !== options.requiredUserId) {
    throw new Error(
      "Одоо нэвтэрсэн хэрэглэгч өөрийн нэвтрэх мэдээллээр эрхээ баталгаажуулна уу.",
    );
  }

  const allowedRoles = options.allowedOrgRoles?.map((role) =>
    role.toUpperCase(),
  );
  const orgRole = String(data.user.orgRole || "").toUpperCase();
  if (allowedRoles?.length && !allowedRoles.includes(orgRole)) {
    throw new Error(
      options.accessDeniedMessage ||
        "Зөвхөн байгууллагын эзэмшигч эсвэл админ энэ хэсэгт нэвтрэх эрхтэй.",
    );
  }

  return data.user;
}
