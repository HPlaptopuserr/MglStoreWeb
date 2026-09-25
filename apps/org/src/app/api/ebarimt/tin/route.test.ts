import assert from "node:assert/strict";
import test from "node:test";
import type { NextRequest } from "next/server";
import { GET } from "./route";

test("TIN lookup also returns the organization name", async (context) => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("getTinInfo")) {
      return new Response(
        JSON.stringify({ status: 200, data: "11165620060" }),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify({
        status: 200,
        data: { name: "Тест Байгууллага", found: true },
      }),
      { status: 200 },
    );
  };

  const response = await GET({
    nextUrl: new URL("http://localhost/api/ebarimt/tin?regNo=7247105"),
  } as NextRequest);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload, {
    regNo: "7247105",
    tin: "11165620060",
    name: "Тест Байгууллага",
  });
  assert.equal(calls.length, 2);
  assert.match(calls[0], /getTinInfo\?regNo=7247105/);
  assert.match(calls[1], /getInfo\?tin=11165620060/);
});
