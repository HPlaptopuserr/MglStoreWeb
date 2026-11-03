import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { uploadReel } from "../src/lib/reel-upload";

const originalFetch = globalThis.fetch;
const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  "localStorage",
);
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalStorage)
    Object.defineProperty(globalThis, "localStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
});
function localCache() {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  return values;
}

test("browser resumes committed parts after a lost response and does not forward auth to object storage", async () => {
  const cache = localCache();
  const present = new Set([0]);
  const writes: number[] = [];
  const calls: string[] = [];
  const state = () => ({
    status: "UPLOADING",
    partSize: 4,
    partCount: 3,
    receivedParts: [...present],
  });
  const authFetch = async (url: string, init?: RequestInit) => {
    calls.push(url);
    if (url.includes("/parts/"))
      return Response.json({
        url: `https://storage.example/parts/${url.split("/").at(-1)}`,
      });
    if (url.endsWith("/complete"))
      return Response.json({ status: "SUCCEEDED", reel: { id: "ready" } });
    assert.ok(url.startsWith("https://api.example/api/reel-uploads"));
    if (init?.method === "POST")
      assert.equal(JSON.parse(String(init.body)).sizeBytes, 12);
    return Response.json(state());
  };
  globalThis.fetch = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    const index = Number(String(url).split("/").at(-1));
    writes.push(index);
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    assert.equal(init?.credentials, "omit");
    assert.equal((init?.body as Blob).size, 4);
    present.add(index);
    if (index === 1) throw new Error("response lost after commit");
    return Response.json({ ok: true });
  }) as typeof fetch;
  const result = await uploadReel({
    api: "https://api.example/api",
    file: new File([new Uint8Array(12)], "video.mp4", {
      type: "video/mp4",
      lastModified: 1,
    }),
    organizationId: "org",
    title: "Reel",
    caption: "",
    authFetch,
  });
  assert.equal(result.id, "ready");
  assert.deepEqual(writes, [1, 2]);
  assert.equal(cache.size, 0);
  assert.ok(calls.some((url) => /\/reel-uploads\/[^/]+$/.test(url)));
});

test("browser rejects impossible source limits before transferring media", async () => {
  localCache();
  let calls = 0;
  await assert.rejects(
    uploadReel({
      api: "https://api.example/api",
      file: new File([], "bad.mp4"),
      organizationId: "org",
      title: "",
      caption: "",
      authFetch: async () => {
        calls++;
        return Response.json({});
      },
    }),
  );
  assert.equal(calls, 0);
});
