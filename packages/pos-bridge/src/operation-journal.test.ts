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

for (const foreignLock of [false, true]) {
  test(`stored cancellation correction persists without dispatch and preserves ${foreignLock ? "another operation's lock" : "restart evidence"}`, async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pgw-journal-recovery-"));
    try {
      const original = { status: "FAILED" as const, raw: '{"code":-22}', parsed: { code: -22 } };
      await new OperationJournal(directory).execute("charge:old", "exact", "terminal", async () => original);
      const lock = path.join(directory, "terminal.lock");
      if (foreignLock) fs.writeFileSync(lock, "charge:other");
      let normalized = 0;
      const recovered = new OperationJournal(directory, (_id, entry) => {
        normalized += 1;
        return { ...entry.result, status: "DECLINED" };
      });
      assert.throws(() => recovered.lookup("charge:old", "wrong"), /different parameters/);
      assert.equal(normalized, 0);
      const result = await recovered.execute("charge:old", "exact", "terminal", async () => {
        throw new Error("recovery must never dispatch");
      });
      assert.equal(result.status, "DECLINED");
      assert.equal(result.raw, original.raw);
      assert.deepEqual(result.parsed, original.parsed);
      assert.equal(new OperationJournal(directory).lookup("charge:old", "exact")?.status, "DECLINED");
      if (foreignLock) assert.equal(fs.readFileSync(lock, "utf8"), "charge:other");
      else {
        assert.equal(fs.existsSync(lock), false);
        assert.equal((await recovered.execute("charge:next", "next", "terminal", async () => ({ status: "APPROVED" }))).status, "APPROVED");
      }
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
  });
}

test("unknown and active operations cannot be released by stored cancellation correction", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pgw-journal-active-"));
  try {
    let normalizations = 0;
    const journal = new OperationJournal(directory, (_id, entry) => {
      normalizations += 1;
      return entry.result;
    });
    let release: (() => void) | undefined;
    const pending = journal.execute("charge:active", "exact", "terminal", async () => {
      await new Promise<void>(resolve => { release = resolve; });
      return { status: "FAILED" };
    });
    assert.equal(journal.lookup("charge:active", "exact")?.status, "FAILED");
    assert.equal(normalizations, 0);
    assert.equal(fs.readFileSync(path.join(directory, "terminal.lock"), "utf8"), "charge:active");
    release?.(); await pending;
    assert.equal(journal.lookup("charge:active", "exact")?.status, "FAILED");
    assert.equal(normalizations, 1);
    await assert.rejects(journal.execute("charge:new", "new", "terminal", async () => ({ status: "APPROVED" })), /unresolved/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

for (const status of ["APPROVED", "DECLINED"] as const) {
  test(`restart releases only its own durable ${status} reservation after the persist/unlink crash window`, async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pgw-journal-final-"));
    try {
      await new OperationJournal(directory).execute("charge:final", "exact", "terminal", async () => ({ status }));
      const lock = path.join(directory, "terminal.lock");
      fs.writeFileSync(lock, "charge:final");
      const restarted = new OperationJournal(directory);
      assert.throws(() => restarted.lookup("charge:final", "wrong"), /different parameters/);
      assert.equal(fs.readFileSync(lock, "utf8"), "charge:final");
      assert.equal(restarted.lookup("charge:final", "exact")?.status, status);
      assert.equal(fs.existsSync(lock), false);
      fs.writeFileSync(lock, "charge:other");
      assert.equal(restarted.lookup("charge:final", "exact")?.status, status);
      assert.equal(fs.readFileSync(lock, "utf8"), "charge:other");
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
  });
}


for (const stored of ["cancel", "unknown", "missing", "damaged", "final"] as const) {
  test(`startup reconciles only the lock-owned completed operation: ${stored}`, async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pgw-startup-"));
    try {
      const id = "charge:owned";
      if (stored !== "missing") {
        await new OperationJournal(directory).execute(id, "bound-request", "terminal", async () => ({
          status: stored === "final" ? "DECLINED" : "FAILED",
          ...(stored === "cancel" ? { code: "-22" } : {}),
        }));
      }
      const lock = path.join(directory, "terminal.lock");
      fs.writeFileSync(lock, id);
      if (stored === "damaged") {
        const record = fs.readdirSync(directory).find(name => name.endsWith(".json"))!;
        fs.writeFileSync(path.join(directory, record), "{");
      }
      let corrections = 0;
      const restarted = new OperationJournal(directory, (operationId, entry) => {
        assert.equal(operationId, id);
        assert.equal(entry.fingerprint, "bound-request");
        corrections += 1;
        return entry.result.code === "-22" ? { ...entry.result, status: "DECLINED" } : entry.result;
      });
      if (stored === "damaged") assert.throws(() => restarted.recoverStoredOperation());
      else restarted.recoverStoredOperation();
      assert.equal(fs.existsSync(lock), !["cancel", "final"].includes(stored));
      if (stored === "cancel") assert.equal(new OperationJournal(directory).lookup(id, "bound-request")?.status, "DECLINED");
      if (["missing", "damaged", "final"].includes(stored)) assert.equal(corrections, 0);
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
  });
}
