export const VENDOR_TOKEN_KEY = "vendor_token";
export const VENDOR_USER_KEY = "vendor_user";
export type VendorSessionStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

/** A response from an old request must never invalidate a newer session. */
export function clearVendorSessionIfCurrent(
  storage: VendorSessionStorage,
  expectedToken: string | null,
): boolean {
  if (!expectedToken || storage.getItem(VENDOR_TOKEN_KEY) !== expectedToken)
    return false;
  storage.removeItem(VENDOR_TOKEN_KEY);
  storage.removeItem(VENDOR_USER_KEY);
  return true;
}

export function saveVendorSession(
  storage: VendorSessionStorage,
  expectedToken: string,
  accessToken: string,
  user: unknown,
) {
  if (storage.getItem(VENDOR_TOKEN_KEY) !== expectedToken) {
    throw new Error(
      "Нэвтрэлт өөр цонхонд шинэчлэгдсэн байна. Хуудсаа дахин ачаална уу.",
    );
  }
  const previousUser = storage.getItem(VENDOR_USER_KEY);
  try {
    storage.setItem(VENDOR_USER_KEY, JSON.stringify(user));
    storage.setItem(VENDOR_TOKEN_KEY, accessToken);
  } catch (error) {
    if (previousUser === null) storage.removeItem(VENDOR_USER_KEY);
    else storage.setItem(VENDOR_USER_KEY, previousUser);
    throw error;
  }
}
