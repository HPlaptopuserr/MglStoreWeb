import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { requestWithSession } from "./auth-request";
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
function session(initial: string | null = "old-token") {
  let token = initial,
    cleared = 0;
  return {
    getToken: () => token,
    onUnauthorized: () => {
      cleared++;
      token = null;
    },
    replace: (next: string | null) => {
      token = next;
    },
    cleared: () => cleared,
  };
}
test("a current rejected token clears cached session on 401", async () => {
  const state = session();
  globalThis.fetch = async (_url, init) => {
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer old-token",
    );
    return new Response(null, { status: 401 });
  };
  assert.equal(
    (await requestWithSession("https://api.example.test/me", undefined, state))
      .status,
    401,
  );
  assert.equal(state.cleared(), 1);
  assert.equal(state.getToken(), null);
});
test("a late 401 cannot clear a replacement login or already logged out session", async () => {
  for (const replacement of ["new-token", null]) {
    const state = session();
    globalThis.fetch = async () => {
      state.replace(replacement);
      return new Response(null, { status: 401 });
    };
    await requestWithSession("https://api.example.test/me", undefined, state);
    assert.equal(state.cleared(), 0);
    assert.equal(state.getToken(), replacement);
  }
});
test("403 and server errors preserve session and return original response", async () => {
  for (const status of [403, 500, 503]) {
    const state = session(),
      response = new Response("original", { status });
    globalThis.fetch = async () => response;
    assert.equal(
      await requestWithSession("https://api.example.test/me", undefined, state),
      response,
    );
    assert.equal(state.cleared(), 0);
    assert.equal(state.getToken(), "old-token");
  }
});
test("temporary network failure returns retryable 503 without signing out", async () => {
  const state = session();
  globalThis.fetch = async () => {
    throw new TypeError("offline");
  };
  const response = await requestWithSession(
    "https://api.example.test/me",
    undefined,
    state,
  );
  assert.equal(response.status, 503);
  assert.equal(state.cleared(), 0);
});
test("aborted requests keep their abort signal and reject rather than clear session", async () => {
  const state = session(),
    controller = new AbortController(),
    error = new DOMException("Aborted", "AbortError");
  controller.abort();
  globalThis.fetch = async (_url, init) => {
    assert.equal(init?.signal, controller.signal);
    throw error;
  };
  await assert.rejects(
    requestWithSession(
      "https://api.example.test/me",
      { signal: controller.signal },
      state,
    ),
    (cause) => cause === error,
  );
  assert.equal(state.cleared(), 0);
});
test("JSON bodies receive session headers without mutating caller headers", async () => {
  const state = session(),
    headers = new Headers({
      "X-Custom": "value",
      Authorization: "Bearer outdated",
    });
  globalThis.fetch = async (_url, init) => {
    const actual = new Headers(init?.headers);
    assert.equal(actual.get("Authorization"), "Bearer old-token");
    assert.equal(actual.get("Content-Type"), "application/json");
    assert.equal(actual.get("X-Custom"), "value");
    return new Response(null, { status: 200 });
  };
  await requestWithSession(
    "https://api.example.test/me",
    { method: "POST", body: JSON.stringify({ name: "test" }), headers },
    state,
  );
  assert.equal(headers.get("Authorization"), "Bearer outdated");
  assert.equal(headers.get("Content-Type"), null);
});
test("multipart uploads retain browser-generated boundary and explicit content types survive", async () => {
  const state = session(),
    body = new FormData();
  body.set("name", "test");
  globalThis.fetch = async (_url, init) => {
    assert.equal(init?.body, body);
    assert.equal(new Headers(init?.headers).get("Content-Type"), null);
    return new Response(null, { status: 200 });
  };
  await requestWithSession(
    "https://api.example.test/upload",
    { method: "POST", body },
    state,
  );
  globalThis.fetch = async (_url, init) => {
    assert.equal(new Headers(init?.headers).get("Content-Type"), "text/plain");
    return new Response(null, { status: 200 });
  };
  await requestWithSession(
    "https://api.example.test/text",
    { method: "POST", body: "test", headers: { "Content-Type": "text/plain" } },
    state,
  );
});
