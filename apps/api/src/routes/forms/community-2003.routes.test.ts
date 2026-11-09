import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { prisma } from "@mgl/database";
import router from "./forms.routes";

let server: Server;
let base: string;
before(async () => {
  const app = express();
  app.use(express.json(), router);
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/forms/2003`;
});
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

test("a submitted public profile appears in the directory without private fields", async () => {
  const originals = {
    upsert: prisma.form.upsert,
    create: prisma.formResponse.create,
    findMany: prisma.formResponse.findMany,
  };
  let saved: unknown;
  Reflect.set(prisma.form, "upsert", async () => ({
    id: "community",
    isActive: true,
  }));
  Reflect.set(
    prisma.formResponse,
    "create",
    async (args: { data: { formId: string; data: unknown } }) => {
      assert.equal(args.data.formId, "community");
      saved = args.data.data;
      return { id: "member" };
    },
  );
  Reflect.set(prisma.formResponse, "findMany", async (args: unknown) => {
    assert.deepEqual(args, {
      where: {
        form: { slug: "2003", isActive: true },
        data: { path: ["publishConsent"], equals: "yes" },
      },
      select: { id: true, data: true },
      orderBy: [{ submittedAt: "desc" }, { id: "asc" }],
    });
    return [{ id: "member", data: saved }];
  });
  try {
    const submission = await fetch(`${base}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          name: "Бат",
          profession: "Инженер",
          phone: "99112233",
          business: "no",
          consent: "yes",
          publishConsent: "yes",
        },
      }),
    });
    assert.equal(submission.status, 201);
    const listing = await fetch(`${base}/members`);
    assert.equal(listing.status, 200);
    assert.equal(listing.headers.get("cache-control"), "no-store");
    const result: unknown = await listing.json();
    assert.deepEqual(result, {
      members: [
        {
          id: "member",
          activity: "employed",
          name: "Бат",
          phone: "99112233",
          city: "",
          profession: "Инженер",
          role: "Инженер",
          organization: "",
          sector: "Инженер",
          bio: "",
          offers: [],
          needs: [],
        },
      ],
      requests: [],
    });
  } finally {
    Reflect.set(prisma.form, "upsert", originals.upsert);
    Reflect.set(prisma.formResponse, "create", originals.create);
    Reflect.set(prisma.formResponse, "findMany", originals.findMany);
  }
});

test("directory storage failures return an error instead of a successful empty list", async () => {
  const original = prisma.formResponse.findMany;
  Reflect.set(prisma.formResponse, "findMany", async () => {
    throw new Error("offline");
  });
  try {
    assert.equal((await fetch(`${base}/members`)).status, 500);
  } finally {
    Reflect.set(prisma.formResponse, "findMany", original);
  }
});
