import { test } from "node:test";
import assert from "node:assert/strict";
import { isBusinessRequestOrigin } from "./request-origin";
const production = { production: true };
const proxyRequest = (origin?: string, extra: Record<string, string> = {}) =>
  new Request("http://0.0.0.0:10000/api/workforce-session", {
    headers: { ...(origin ? { origin } : {}), ...extra },
  });
test("Render internal URL accepts the configured public HTTPS origin", () => {
  assert.equal(
    isBusinessRequestOrigin(proxyRequest("https://mglbusiness.mn"), production),
    true,
  );
  assert.equal(
    isBusinessRequestOrigin(
      proxyRequest("https://www.mglbusiness.mn"),
      production,
    ),
    true,
  );
});
test("cross-site requests cannot spoof a trusted forwarded host", () => {
  assert.equal(
    isBusinessRequestOrigin(
      proxyRequest("https://evil.example", {
        "x-forwarded-host": "mglbusiness.mn",
        "x-forwarded-proto": "https",
      }),
      production,
    ),
    false,
  );
  for (const origin of [
    undefined,
    "null",
    "http://mglbusiness.mn",
    "https://mglbusiness.mn.evil.example",
    "https://mglbusiness.mn/path",
  ])
    assert.equal(
      isBusinessRequestOrigin(proxyRequest(origin), production),
      false,
    );
});
test("direct Render origin must be explicitly configured", () => {
  const request = proxyRequest("https://mgl-business.onrender.com");
  assert.equal(isBusinessRequestOrigin(request, production), false);
  assert.equal(
    isBusinessRequestOrigin(request, {
      ...production,
      renderUrl: "https://mgl-business.onrender.com",
    }),
    true,
  );
});
test("local development retains exact same-origin checking", () => {
  const request = new Request("http://localhost:3005/api/workforce-session", {
    headers: { origin: "http://localhost:3005" },
  });
  assert.equal(isBusinessRequestOrigin(request, { production: false }), true);
  assert.equal(
    isBusinessRequestOrigin(proxyRequest("https://mglbusiness.mn"), {
      production: false,
    }),
    false,
  );
});
