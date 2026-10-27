/** Profile uploads are served by the API; arbitrary URL schemes are not images. */
export function employeePhotoSource(
  value: string | null | undefined,
): string | null {
  const source = value?.trim();
  if (!source || source.startsWith("//") || /[\\\u0000-\u0020]/.test(source))
    return null;
  if (source.startsWith("/api/auth/profile/uploads/"))
    return `/api-proxy${source.slice(4)}`;
  if (
    source.startsWith("/auth/profile/uploads/") ||
    source.startsWith("/uploads/")
  )
    return `/api-proxy${source}`;
  if (source.startsWith("/")) return source;
  try {
    const url = new URL(source);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
