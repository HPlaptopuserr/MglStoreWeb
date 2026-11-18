const IOS_APPS = {
  store: { bundleId: "mn.mglstore.app", appId: 6798190534, slug: "mgl-store" },
  business: {
    bundleId: "mn.mglbusiness.app",
    appId: 6797782780,
    slug: "mgl-business",
  },
} as const;
type IosApp = keyof typeof IOS_APPS;
const CACHE_MS = 15 * 60_000;

export interface StoreIosVersion {
  latestVersionName: string;
  storeUrl: string;
}

export function parseStoreIosVersion(
  payload: unknown,
  app: IosApp = "store",
): StoreIosVersion {
  const target = IOS_APPS[app];
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
      item.bundleId === target.bundleId,
  );
  if (
    !result ||
    typeof result !== "object" ||
    !("trackId" in result) ||
    result.trackId !== target.appId ||
    !("version" in result) ||
    typeof result.version !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(result.version)
  ) {
    throw new Error(
      "The requested app is not available in the App Store response",
    );
  }
  return {
    latestVersionName: result.version,
    storeUrl: `https://apps.apple.com/mn/app/${target.slug}/id${target.appId}`,
  };
}

/** Cache only verified releases; concurrent app launches share one lookup. */
export function createStoreIosVersionLookup(
  fetcher: typeof fetch = fetch,
  app: IosApp = "store",
) {
  const target = IOS_APPS[app];
  let cached: { value: StoreIosVersion; expiresAt: number } | undefined;
  let pending: Promise<StoreIosVersion> | undefined;
  return async (): Promise<StoreIosVersion> => {
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (!pending) {
      pending = (async () => {
        const response = await fetcher(
          `https://itunes.apple.com/lookup?bundleId=${target.bundleId}&country=mn`,
          { signal: AbortSignal.timeout(6000) },
        );
        if (!response.ok) throw new Error("App Store lookup failed");
        const payload: unknown = await response.json();
        const value = parseStoreIosVersion(payload, app);
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

export const getBusinessIosVersion = createStoreIosVersionLookup(
  fetch,
  "business",
);
