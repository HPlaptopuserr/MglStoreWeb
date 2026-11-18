/** Accept a plain domain or HTTP(S) link, without accepting executable schemes. */
export function normalizeRegistrationWebsite(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/\s/.test(trimmed)) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.hostname.includes(".") ||
      url.username ||
      url.password
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
