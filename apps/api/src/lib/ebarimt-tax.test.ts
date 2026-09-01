import assert from "node:assert/strict";
import test from "node:test";
import {
  EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE,
  getEbarimtGroceryClassificationCode,
  getEbarimtTaxProductCodes,
  isValidEbarimtClassificationCode,
  isValidEbarimtTaxProductCode,
  requiresEbarimtTaxProductCode,
} from "@mgl/types";

test("eBarimt tax product codes are required only for VAT_FREE and VAT_ZERO", () => {
  assert.equal(requiresEbarimtTaxProductCode("VAT_FREE"), true);
  assert.equal(requiresEbarimtTaxProductCode("VAT_ZERO"), true);
  assert.equal(requiresEbarimtTaxProductCode("VAT_ABLE"), false);
  assert.equal(requiresEbarimtTaxProductCode("NOT_VAT"), false);
});

test("eBarimt tax product codes are validated against the matching official list", () => {
  assert.equal(isValidEbarimtTaxProductCode("VAT_FREE", "305"), true);
  assert.equal(isValidEbarimtTaxProductCode("VAT_FREE", "501"), false);
  assert.equal(isValidEbarimtTaxProductCode("VAT_ZERO", "501"), true);
  assert.equal(isValidEbarimtTaxProductCode("VAT_ZERO", "305"), false);
  assert.equal(isValidEbarimtTaxProductCode("VAT_ABLE", null), true);
  assert.equal(isValidEbarimtTaxProductCode("NOT_VAT", null), true);
  assert.equal(getEbarimtTaxProductCodes("VAT_FREE").length, 44);
  assert.equal(getEbarimtTaxProductCodes("VAT_ZERO").length, 7);
});

test("eBarimt classification code must contain exactly seven digits", () => {
  assert.equal(
    isValidEbarimtClassificationCode(
      EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE,
    ),
    true,
  );
  assert.equal(isValidEbarimtClassificationCode("305"), false);
  assert.equal(isValidEbarimtClassificationCode("621299A"), false);
});

test("grocery categories receive safe automatic retail classifications", () => {
  assert.equal(getEbarimtGroceryClassificationCode("fresh-produce"), "6212100");
  assert.equal(
    getEbarimtGroceryClassificationCode("dairy-products"),
    "6212200",
  );
  assert.equal(
    getEbarimtGroceryClassificationCode("meat-seafood", "Үхрийн мах"),
    "6212300",
  );
  assert.equal(
    getEbarimtGroceryClassificationCode("meat-seafood", "Хөлдөөсөн загас"),
    "6212400",
  );
  assert.equal(getEbarimtGroceryClassificationCode("electronics"), null);
});
