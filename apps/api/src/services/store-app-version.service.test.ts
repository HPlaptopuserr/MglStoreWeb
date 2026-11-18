import assert from "node:assert/strict";
import test from "node:test";
import {
  createStoreIosVersionLookup,
  parseStoreIosVersion,
} from "./store-app-version.service";

const listing = {
  results: [
    { bundleId: "mn.mglstore.app", trackId: 6798190534, version: "1.0.14" },
  ],
};
test("iOS version lookup accepts only the correct published Mgl Store listing", () => {
  assert.deepEqual(parseStoreIosVersion(listing), {
    latestVersionName: "1.0.14",
    storeUrl: "https://apps.apple.com/mn/app/mgl-store/id6798190534",
  });
  for (const payload of [
    null,
    {},
    { results: [] },
    { results: [{ bundleId: "other", version: "9.0.0" }] },
    { results: [{ ...listing.results[0], trackId: 1 }] },
    { results: [{ ...listing.results[0], version: "invalid" }] },
  ]) {
    assert.throws(() => parseStoreIosVersion(payload));
  }
});
test("concurrent startups share a lookup and successful releases are cached", async () => {
  let calls = 0;
  const lookup = createStoreIosVersionLookup(async (url, options) => {
    calls++;
    assert.match(String(url), /bundleId=mn.mglstore.app&country=mn$/);
    assert.ok(options?.signal);
    return Response.json(listing);
  });
  const values = await Promise.all([lookup(), lookup(), lookup()]);
  await lookup();
  assert.equal(calls, 1);
  assert.ok(values.every((value) => value.latestVersionName === "1.0.14"));
});
test("failed lookups are retryable and do not advertise a fabricated release", async () => {
  let calls = 0;
  const lookup = createStoreIosVersionLookup(async () => {
    calls++;
    return calls === 1
      ? new Response(null, { status: 503 })
      : Response.json(listing);
  });
  await assert.rejects(lookup());
  assert.equal((await lookup()).latestVersionName, "1.0.14");
  assert.equal(calls, 2);
});

test("Business lookup resolves its own listing and rejects the Store app", async () => {
  const business = {
    results: [
      {
        bundleId: "mn.mglbusiness.app",
        trackId: 6797782780,
        version: "1.0.53",
      },
    ],
  };
  const lookup = createStoreIosVersionLookup(async (url) => {
    assert.match(String(url), /bundleId=mn.mglbusiness.app&country=mn$/);
    return Response.json(business);
  }, "business");
  assert.deepEqual(await lookup(), {
    latestVersionName: "1.0.53",
    storeUrl: "https://apps.apple.com/mn/app/mgl-business/id6797782780",
  });
  assert.throws(() => parseStoreIosVersion(listing, "business"));
  assert.throws(() => parseStoreIosVersion(business));
});
