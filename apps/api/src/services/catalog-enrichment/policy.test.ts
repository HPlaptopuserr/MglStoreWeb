import assert from "node:assert/strict";
import test from "node:test";
import {
  decideEnrichment,
  sourceCodes,
  type EnrichmentSource,
  type EnrichmentMaster,
} from "./policy";
const source: EnrichmentSource = {
  id: "vendor-1",
  name: "Сүү 1 л",
  barcode: "8651234567890",
  barcodeAliases: [],
  unit: "pcs",
  masterProductId: null,
};
const master: EnrichmentMaster = {
  id: "master-1",
  canonicalName: "Сүү 1 л",
  normalizedName: "сүү 1 л",
  barcode: source.barcode,
  unit: "ш",
  status: "ACTIVE",
  sourceProductId: null,
  aliases: [],
};

test("barcode identity deduplicates vendor and warehouse products", () => {
  assert.deepEqual(decideEnrichment(source, []), { action: "create" });
  assert.deepEqual(
    decideEnrichment({ ...source, id: "warehouse-1" }, [master]),
    { action: "existing", masterId: master.id },
  );
});
test("existing admin edits and original source identities are preserved", () => {
  assert.equal(
    decideEnrichment({ ...source, masterProductId: master.id }, [
      { ...master, canonicalName: "Admin зассан нэр", barcode: null },
    ]).action,
    "existing",
  );
  assert.equal(
    decideEnrichment(source, [
      {
        ...master,
        sourceProductId: source.id,
        barcode: null,
        normalizedName: "зассан",
      },
    ]).action,
    "existing",
  );
});
test("additional barcodes are normalized, matched and cannot join multiple masters", () => {
  const aliased = {
    ...source,
    barcode: " OTHER ",
    barcodeAliases: ["8651234567890", "other"],
  };
  assert.deepEqual(sourceCodes(aliased), ["other", "8651234567890"]);
  assert.equal(decideEnrichment(aliased, [master]).action, "existing");
  assert.equal(
    decideEnrichment(aliased, [
      master,
      { ...master, id: "other", barcode: "other" },
    ]).action,
    "skip",
  );
  assert.equal(
    decideEnrichment({ ...source, barcode: "999999" }, [
      { ...master, aliases: [{ normalizedValue: "barcode:999999" }] },
    ]).action,
    "existing",
  );
});
test("barcodeless records require an unambiguous name and unit match", () => {
  const noBarcode = { ...source, barcode: null };
  assert.equal(decideEnrichment(noBarcode, [master]).action, "existing");
  assert.equal(
    decideEnrichment(noBarcode, [master, { ...master, id: "second" }]).action,
    "skip",
  );
  assert.equal(
    decideEnrichment({ ...noBarcode, unit: "kg" }, [master]).action,
    "create",
  );
  assert.equal(
    decideEnrichment({ ...source, barcode: "different" }, [master]).action,
    "create",
  );
});
test("invalid names, inactive masters and barcode unit conflicts require review", () => {
  assert.equal(decideEnrichment({ ...source, name: "123" }, []).action, "skip");
  assert.equal(
    decideEnrichment(source, [{ ...master, status: "ARCHIVED" }]).action,
    "skip",
  );
  assert.equal(
    decideEnrichment(source, [{ ...master, unit: "kg" }]).action,
    "skip",
  );
});

test("a product name cannot masquerade as another product barcode", () => {
  assert.equal(
    decideEnrichment({ ...source, barcode: "AB-CD" }, [
      {
        ...master,
        normalizedName: "ab cd",
        aliases: [{ normalizedValue: "ab cd" }],
      },
    ]).action,
    "create",
  );
});
