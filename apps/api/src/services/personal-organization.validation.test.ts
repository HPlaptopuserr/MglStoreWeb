import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanBusinessCategory,
  isValidMongolianOrganizationName,
  normalizeOrganizationName,
} from "./personal-organization.validation";

test("validates Mongolian Cyrillic organization names", () => {
  assert.equal(isValidMongolianOrganizationName("Тэнгэр Хүнс ХХК"), true);
  assert.equal(isValidMongolianOrganizationName("  Тэнгэр   Хүнс  ХХК "), true);
  assert.equal(isValidMongolianOrganizationName("Тэнгэр-Хүнс ХХК"), true);
});

test("rejects latin, numeric, emoji, and special organization names", () => {
  assert.equal(isValidMongolianOrganizationName("Test ХХК"), false);
  assert.equal(isValidMongolianOrganizationName("Тест 123"), false);
  assert.equal(isValidMongolianOrganizationName("Тест 🚀 ХХК"), false);
  assert.equal(isValidMongolianOrganizationName("Тест @ ХХК"), false);
});

test("normalizes whitespace and case for duplicate detection", () => {
  assert.equal(normalizeOrganizationName(" ТЕСТ   ХХК "), "тест ххк");
});

test("requires a meaningful business category", () => {
  assert.equal(cleanBusinessCategory("хүнс үйлдвэрлэл"), "хүнс үйлдвэрлэл");
  assert.equal(cleanBusinessCategory(" "), null);
  assert.equal(cleanBusinessCategory("а"), null);
});
