import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { OperationJournal } from "./operation-journal";

test("concurrent retries and a restarted bridge never send the purchase twice", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pgw-journal-"));
  try {
    const journal = new OperationJournal(directory);
    let calls = 0;
    const purchase = async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { status: "APPROVED" as const, transactionId: "001234567890" };
    };
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        journal.execute("charge:a", "amount:100", "terminal", purchase),
      ),
    );
    assert.equal(calls, 1);
    assert.ok(
      results.every((result) => result.transactionId === "001234567890"),
    );
    assert.deepEqual(
      await new OperationJournal(directory).execute(
        "charge:a",
        "amount:100",
        "terminal",
        purchase,
      ),
      results[0],
    );
    assert.equal(calls, 1);
    await assert.rejects(
      journal.execute("charge:a", "amount:200", "terminal", purchase),
      /different parameters/,
    );
    assert.equal(calls, 1);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

for (const kind of ["exception", "unknown", "interrupted"] as const) {
  test(`${kind} operation blocks a new purchase across restart`, async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pgw-journal-"));
    try {
      const journal = new OperationJournal(directory);
      let release: (() => void) | undefined;
      const pending = journal.execute(
        "original",
        "original",
        "terminal",
        async () => {
          if (kind === "exception") throw new Error("USB response lost");
          if (kind === "interrupted")
            await new Promise<void>((resolve) => {
              release = resolve;
            });
          return { status: "FAILED" };
        },
      );
      if (kind !== "interrupted") await pending;
      const restarted = new OperationJournal(directory);
      let dispatched = false;
      const duplicate = await restarted.execute(
        "original",
        "original",
        "terminal",
        async () => {
          dispatched = true;
          return { status: "APPROVED" };
        },
      );
      assert.equal(duplicate.status, "FAILED");
      assert.equal(dispatched, false);
      await assert.rejects(
        restarted.execute("new", "new", "terminal", async () => {
          dispatched = true;
          return { status: "APPROVED" };
        }),
        /unresolved/,
      );
      assert.equal(dispatched, false);
      release?.();
      await pending;
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}

test("explicit decline releases terminal but retains the original declined result", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pgw-journal-"));
  try {
    const journal = new OperationJournal(directory);
    await journal.execute("declined", "a", "terminal", async () => ({
      status: "DECLINED",
    }));
    const result = await journal.execute("next", "b", "terminal", async () => ({
      status: "APPROVED",
    }));
    assert.equal(result.status, "APPROVED");
    assert.equal(journal.lookup("declined", "a")?.status, "DECLINED");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("damaged evidence fails closed without invoking hardware", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pgw-journal-"));
  try {
    const journal = new OperationJournal(directory);
    await journal.execute("a", "a", "terminal", async () => ({
      status: "APPROVED",
    }));
    fs.writeFileSync(path.join(directory, fs.readdirSync(directory)[0]!), "{");
    let invoked = false;
    await assert.rejects(
      journal.execute("a", "a", "terminal", async () => {
        invoked = true;
        return { status: "APPROVED" };
      }),
    );
    assert.equal(invoked, false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
