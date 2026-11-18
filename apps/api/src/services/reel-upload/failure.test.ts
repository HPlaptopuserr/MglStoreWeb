import assert from "node:assert/strict";
import test from "node:test";
import { describeReelUploadFailure } from "./failure";
import { ReelUploadError } from "./policy";

test("network and storage outages retry while invalid media stays terminal", () => {
  const timeout = Object.assign(
    new Error("https://private.example/signed?token=secret"),
    { code: "ETIMEDOUT" },
  );
  assert.equal(describeReelUploadFailure(timeout, "assembly").retryable, true);
  assert.equal(
    describeReelUploadFailure(new Error("private storage details"), "storage")
      .retryable,
    true,
  );
  assert.equal(
    describeReelUploadFailure(new ReelUploadError("Invalid media"), "transcode")
      .retryable,
    false,
  );
  assert.equal(
    describeReelUploadFailure(
      new ReelUploadError("Temporarily unavailable", 503),
      "storage",
    ).retryable,
    true,
  );
});
test("diagnostics expose only safe categories, never raw errors, paths or storage tokens", () => {
  const error = Object.assign(
    new Error("/private/author/video.mov?token=secret"),
    { code: "https://private.example?secret" },
  );
  const failure = describeReelUploadFailure(error, "transcode");
  assert.equal(failure.code, undefined);
  assert.equal(failure.name, "Error");
  assert.doesNotMatch(JSON.stringify(failure), /author|token|secret|https/);
});
