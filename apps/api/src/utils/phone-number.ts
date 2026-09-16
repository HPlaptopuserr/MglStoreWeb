const MONGOLIA_COUNTRY_CODE = "976";
const MONGOLIA_LOCAL_PHONE_LENGTH = 8;

/**
 * Stores every Mongolian phone number in the same canonical form so database
 * uniqueness also covers values such as `+976 90696900` and `9069-6900`.
 */
export function normalizePhoneNumber(
  value: string | null | undefined,
): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return null;

  if (
    digits.startsWith(MONGOLIA_COUNTRY_CODE) &&
    digits.length ===
      MONGOLIA_COUNTRY_CODE.length + MONGOLIA_LOCAL_PHONE_LENGTH
  ) {
    return digits.slice(MONGOLIA_COUNTRY_CODE.length);
  }

  return digits;
}

export function isPhoneNumberConflict(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return (error as { code?: unknown }).code === "P2002";
}
