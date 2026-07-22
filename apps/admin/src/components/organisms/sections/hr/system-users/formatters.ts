import type { SystemUser } from "./types";

export function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function displayEmail(email: string) {
  return email.endsWith("@temp.local") ? "Имэйлгүй" : email;
}

export function displayPhone(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");
  const normalized =
    digits.startsWith("976") && digits.length === 11 ? digits.slice(3) : digits;
  if (normalized.length >= 8 && normalized.length <= 12) return normalized;
  return "";
}

export function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Нэвтрээгүй";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} минутын өмнө`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} хоногийн өмнө`;
  return formatDate(dateStr);
}

export function isMembershipActive(
  user: Pick<SystemUser, "isPrime" | "membershipExpiresAt">,
) {
  if (!user.isPrime) return false;
  if (!user.membershipExpiresAt) return true;
  return new Date(user.membershipExpiresAt).getTime() > Date.now();
}

export function membershipStatusText(user: SystemUser) {
  if (!user.isPrime) return "Member биш";
  if (!user.membershipExpiresAt) return "Хугацаагүй member";

  const expiresAt = new Date(user.membershipExpiresAt);
  const days = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return `${formatDate(user.membershipExpiresAt)} дууссан`;
  if (days === 0) return "Өнөөдөр дуусна";
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remainingMonths = Math.round((days % 365) / 30);
    return remainingMonths > 0
      ? `${years} жил ${remainingMonths} сар үлдсэн`
      : `${years} жил үлдсэн`;
  }
  if (days >= 45) return `${Math.round(days / 30)} сар үлдсэн`;
  if (days >= 28) return "1 сар үлдсэн";
  return `${days} хоног үлдсэн`;
}
