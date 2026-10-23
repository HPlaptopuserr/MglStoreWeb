import assert from "node:assert/strict";
import test from "node:test";
import { fetchOrgRegisters, fetchRegisterConfig } from "./register";

test("register discovery requests RETAIL and rejects incompatible rows from old servers", async () => {
  const previous = globalThis.fetch;
  let requested = "";
  globalThis.fetch = async (input) => {
    requested = String(input);
    return Response.json([
      { id: "retail", mode: "RETAIL" },
      { id: "restaurant", mode: "RESTAURANT" },
    ]);
  };
  try {
    assert.deepEqual(
      (await fetchOrgRegisters()).map((register) => register.id),
      ["retail"],
    );
    assert.match(requested, /mode=RETAIL/);
  } finally {
    globalThis.fetch = previous;
  }
});
test("restoring a saved restaurant register fails before any financial request", async () => {
  const previous = globalThis.fetch;
  const methods: string[] = [];
  globalThis.fetch = async (_input, options) => {
    methods.push(options?.method ?? "GET");
    return Response.json({ id: "wrong", name: "Тест", mode: "RESTAURANT" });
  };
  try {
    await assert.rejects(
      fetchRegisterConfig("wrong"),
      /Дэлгүүрийн касс сонгоно уу/,
    );
    assert.deepEqual(methods, ["GET"]);
  } finally {
    globalThis.fetch = previous;
  }
});
