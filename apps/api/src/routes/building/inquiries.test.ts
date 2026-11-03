import assert from "node:assert/strict";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import express from "express";
import { prisma } from "@mgl/database";
import { parseBuildingInquiry } from "@mgl/types/building-inquiry";
import router from "./index";

const input = {
  id: "3013f284-cde1-43ed-9a98-6fc766164c65",
  unitId: "unit-1",
  name: "Тест хэрэглэгч",
  phone: "99112233",
};

test("inquiry accepts an optional question and validates names, phones and length", () => {
  assert.equal(parseBuildingInquiry(input).question, "");
  assert.equal(
    parseBuildingInquiry({
      ...input,
      phone: "+976 9911-2233",
      question: "  Асуулт  ",
    }).phone,
    "+97699112233",
  );
  for (const change of [
    { name: " " },
    { phone: "123" },
    { question: "x".repeat(2001) },
    { id: "invalid" },
    { unitId: "" },
  ])
    assert.throws(() => parseBuildingInquiry({ ...input, ...change }));
});

test("inquiry stores the selected public unit, retries once, and hides draft/unpublished targets", async () => {
  const originals = {
    project: prisma.barilgaProject.findFirst,
    find: prisma.barilgaInquiry.findUnique,
    create: prisma.barilgaInquiry.create,
  };
  let captured: unknown;
  let stored: unknown;
  let creates = 0;
  let missing = false;
  Reflect.set(prisma.barilgaProject, "findFirst", async (query: unknown) => {
    captured = query;
    return missing
      ? null
      : {
          id: "project-1",
          blocks: [
            {
              name: "А",
              floors: [
                {
                  number: 20,
                  units: [
                    { id: "unit-1", unitNo: "2058", typeLabel: "2 өрөө" },
                  ],
                },
              ],
            },
          ],
        };
  });
  Reflect.set(prisma.barilgaInquiry, "findUnique", async () =>
    creates ? { projectId: "project-1", unitId: "unit-1" } : null,
  );
  Reflect.set(prisma.barilgaInquiry, "create", async (args: unknown) => {
    creates++;
    stored = args;
    return {};
  });
  const app = express();
  app.use(express.json(), router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (path: string, body: unknown) =>
    fetch(url + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    assert.equal(
      (await post("/projects/project-1/inquiries", input)).status,
      201,
    );
    assert.equal(
      (await post("/projects/project-1/inquiries", input)).status,
      201,
    );
    assert.equal(creates, 1);
    assert.deepEqual((stored as { data: unknown }).data, {
      ...input,
      question: "",
      projectId: "project-1",
      blockName: "А",
      floorNumber: 20,
      unitNo: "2058",
      unitLabel: "2 өрөө",
    });
    const where = (captured as { where: Record<string, unknown> }).where;
    assert.equal(where.status, "PUBLISHED");
    assert.equal(where.verification, "VERIFIED");
    assert.ok(JSON.stringify(captured).includes('"published":true'));
    assert.equal(
      (await post("/admin/projects/project-1/inquiries", input)).status,
      401,
    );
    assert.equal(
      (await post("/projects/project-1/inquiries", { ...input, phone: "bad" }))
        .status,
      400,
    );
    missing = true;
    assert.equal(
      (await post("/projects/project-1/inquiries", input)).status,
      404,
    );
    assert.equal(creates, 1);
  } finally {
    Reflect.set(prisma.barilgaProject, "findFirst", originals.project);
    Reflect.set(prisma.barilgaInquiry, "findUnique", originals.find);
    Reflect.set(prisma.barilgaInquiry, "create", originals.create);
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
