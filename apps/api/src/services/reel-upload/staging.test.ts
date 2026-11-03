import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import test from "node:test";
import {
  assembleParts,
  discardParts,
  ensureReelStaging,
  listParts,
  localReelStaging,
  writeLocalPart,
} from "./staging";

test("private staged parts survive a retry and are immutable once committed", async () => {
  if (!localReelStaging()) return;
  const author = `test-${randomUUID()}`;
  const id = randomUUID();
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "mgl-parts-test-"));
  try {
    await ensureReelStaging();
    await writeLocalPart(
      author,
      id,
      0,
      Readable.from([Buffer.from("first")]),
      5,
    );
    await assert.rejects(
      writeLocalPart(author, id, 0, Readable.from([Buffer.from("other")]), 5),
    );
    await assert.rejects(
      writeLocalPart(author, id, 1, Readable.from([Buffer.from("bad")]), 2),
    );
    assert.deepEqual(await listParts(author, id), [{ index: 0, size: 5 }]);
    await writeLocalPart(
      author,
      id,
      1,
      Readable.from([Buffer.from("second")]),
      6,
    );
    await assembleParts(author, id, 2, path.join(temporary, "joined"));
    assert.equal(
      await fs.readFile(path.join(temporary, "joined"), "utf8"),
      "firstsecond",
    );
    await discardParts(author, id, 2);
    assert.deepEqual(await listParts(author, id), []);
  } finally {
    await discardParts(author, id, 2);
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
