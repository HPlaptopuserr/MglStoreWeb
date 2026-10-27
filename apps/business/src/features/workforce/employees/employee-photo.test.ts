import assert from "node:assert/strict";
import test from "node:test";
import { employeePhotoSource } from "./employee-photo";
test("stored MGL profile photos resolve through the API proxy", () => {
  assert.equal(
    employeePhotoSource("/api/auth/profile/uploads/avatar.png"),
    "/api-proxy/auth/profile/uploads/avatar.png",
  );
  assert.equal(
    employeePhotoSource("/auth/profile/uploads/avatar.png"),
    "/api-proxy/auth/profile/uploads/avatar.png",
  );
  assert.equal(
    employeePhotoSource("/uploads/avatar.jpg"),
    "/api-proxy/uploads/avatar.jpg",
  );
});
test("local and external image URLs are supported", () => {
  assert.equal(employeePhotoSource("/images/person.png"), "/images/person.png");
  assert.equal(
    employeePhotoSource("https://images.example.mn/person.png"),
    "https://images.example.mn/person.png",
  );
});
test("missing, credential-bearing and unsafe URLs use the initials fallback", () => {
  for (const value of [
    undefined,
    null,
    "",
    "javascript:alert(1)",
    "data:text/html,test",
    "//example.mn/person.png",
    "/\\example.mn/person.png",
    "https://user:secret@example.mn/image.png",
    "https://example.mn/\nimage.png",
  ])
    assert.equal(employeePhotoSource(value), null);
});
