const STORE_BUNDLE_ID = "mn.mglstore.app";
const STORE_APP_ID = 6798190534;
const CACHE_MS = 15 * 60_000;

export interface StoreIosVersion {
  latestVersionName: string;
  storeUrl: string;
}

export function parseStoreIosVersion(payload: unknown): StoreIosVersion {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("results" in payload) ||
    !Array.isArray(payload.results)
  ) {
    throw new Error("Invalid App Store response");
  }
  const result: unknown = payload.results.find(
    (item: unknown) =>
      !!item &&
      typeof item === "object" &&
      "bundleId" in item &&
      item.bundleId === STORE_BUNDLE_ID,
  );
  if (
    !result ||
    typeof result !== "object" ||
    !("trackId" in result) ||
    result.trackId !== STORE_APP_ID ||
    !("version" in result) ||
    typeof result.version !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(result.version)
  ) {
    throw new Error("Mgl Store is not available in the App Store response");
  }
  return {
    latestVersionName: result.version,
    storeUrl: `https://apps.apple.com/mn/app/mgl-store/id${STORE_APP_ID}`,
  };
}

/** Cache only verified releases; concurrent app launches share one lookup. */
export function createStoreIosVersionLookup(fetcher: typeof fetch = fetch) {
  let cached: { value: StoreIosVersion; expiresAt: number } | undefined;
  let pending: Promise<StoreIosVersion> | undefined;
  return async (): Promise<StoreIosVersion> => {
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (!pending) {
      pending = (async () => {
        const response = await fetcher(
          `https://itunes.apple.com/lookup?bundleId=${STORE_BUNDLE_ID}&country=mn`,
          { signal: AbortSignal.timeout(6000) },
        );
        if (!response.ok) throw new Error("App Store lookup failed");
        const payload: unknown = await response.json();
        const value = parseStoreIosVersion(payload);
        cached = { value, expiresAt: Date.now() + CACHE_MS };
        return value;
      })();
    }
    try {
      return await pending;
    } finally {
      pending = undefined;
    }
  };
}

export const getStoreIosVersion = createStoreIosVersionLookup();
