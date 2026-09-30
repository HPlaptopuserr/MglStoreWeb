import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import {
  buildSalesStoresWorkbook,
  type ExportStore,
} from "./admin-sales-stores-export.service";

function store(id: string): ExportStore {
  return {
    id,
    name: "=1+1",
    address: "Улаанбаатар",
    latitude: 47.9184,
    longitude: 106.9177,
    contactName: "Харилцагч",
    contactPhone: "00112233",
    isActive: true,
    createdAt: new Date("2026-09-30T00:00:00Z"),
    updatedAt: new Date("2026-09-30T00:00:00Z"),
    organization: { name: "Хариуцсан байгууллага" },
    vendorOrganization: {
      id: "vendor",
      name: "Дэлгүүр",
      taxId: "00123",
      email: null,
      phone: null,
      businessCategory: "market-food-grocery",
      status: "ACTIVE",
      isVerified: false,
    },
    assignments: [],
    _count: { visits: 0 },
  };
}
test("xlsx export includes every batch, preserves phone and tax IDs, and never evaluates user strings", async () => {
  const items = Array.from({ length: 25 }, (_, i) => store(String(i + 1)));
  const cursors: Array<string | undefined> = [];
  const workbook = await buildSalesStoresWorkbook(async (cursor) => {
    cursors.push(cursor);
    const start = cursor ? Number(cursor) : 0;
    return items.slice(start, start + 12);
  });
  const bytes: Buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
  assert.equal(bytes.subarray(0, 2).toString(), "PK");
  const sheet = XLSX.read(bytes, { type: "buffer" }).Sheets["MGL Store-ууд"];
  assert.equal(sheet["!ref"], "A1:T26");
  assert.equal(sheet.U1, undefined);
  assert.equal(sheet.U2, undefined);
  assert.deepEqual(cursors, [undefined, "12", "24", "25"]);
  assert.equal(sheet.B2.v, "=1+1");
  assert.equal(sheet.B2.t, "s");
  assert.equal(sheet.B2.f, undefined);
  assert.equal(sheet.C2.v, "00123");
  assert.equal(sheet.F2.v, "00112233");
  assert.equal(sheet.M2.t, "n");
  assert.equal(sheet.N2.v, 106.9177);
  assert.equal(
    workbook.Sheets["MGL Store-ууд"].O2.l?.Target,
    "https://www.google.com/maps/search/?api=1&query=47.9184,106.9177",
  );
  const archive = await JSZip.loadAsync(bytes);
  const relationships = await archive
    .file("xl/worksheets/_rels/sheet1.xml.rels")
    ?.async("string");
  assert.ok(relationships?.includes("api=1&amp;query=47.9184,106.9177"));
  assert.ok(!relationships?.includes("&amp;amp;"));
  assert.equal(sheet.K2.v, "2026-09-30 08:00:00");
  assert.equal(sheet["!autofilter"]?.ref, "A1:T26");
});
test("empty exports still contain headers and invalid coordinates cannot create map links", async () => {
  const empty = await buildSalesStoresWorkbook(async () => []);
  assert.equal(empty.Sheets["MGL Store-ууд"]["!ref"], "A1:T1");
  const invalid = await buildSalesStoresWorkbook(async (cursor) =>
    cursor ? [] : [{ ...store("1"), latitude: 0, longitude: 0 }],
  );
  assert.equal(invalid.Sheets["MGL Store-ууд"].O2.l, undefined);
});
