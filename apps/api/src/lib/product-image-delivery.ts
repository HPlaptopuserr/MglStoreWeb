const PUBLIC_STORAGE_PATH = "/storage/v1/object/public/";

export type InlineProductImage = {
  contentType: string;
  body: Buffer;
};

export function decodeInlineProductImage(
  value: string,
): InlineProductImage | null {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(
    value,
  );
  if (!match) return null;

  try {
    const body = Buffer.from(match[2].replace(/\s/g, ""), "base64");
    if (!body.length) return null;
    return { contentType: match[1].toLowerCase(), body };
  } catch {
    return null;
  }
}

/**
 * Product images are uploaded to the configured Supabase project. Older rows
 * can contain a stale Supabase hostname, so keep the public object path while
 * moving the request to the currently configured project origin.
 *
 * Arbitrary hosts are deliberately rejected: this URL is fetched by the API,
 * and accepting any stored URL here would turn the endpoint into an SSRF proxy.
 */
export function resolveProductImageRemoteUrl(
  storedValue: string,
  configuredSupabaseUrl: string | undefined,
): URL | null {
  if (!configuredSupabaseUrl) return null;

  try {
    const stored = new URL(storedValue);
    const configured = new URL(configuredSupabaseUrl);
    const isPublicStorageObject = stored.pathname.startsWith(PUBLIC_STORAGE_PATH);

    if (!isPublicStorageObject && stored.origin !== configured.origin) {
      return null;
    }

    const resolved = isPublicStorageObject
      ? new URL(`${stored.pathname}${stored.search}`, configured.origin)
      : stored;

    if (resolved.origin !== configured.origin) return null;
    if (resolved.protocol !== "https:" && resolved.protocol !== "http:") {
      return null;
    }
    return resolved;
  } catch {
    return null;
  }
}
