import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emptyUnitContent,
  emptyWebsiteContent,
  type WebsiteInventoryUnit,
  type WebsiteProject,
} from "@mgl/types/building-website";
import { copyUnitLayouts, unitImageSources } from "./unit-image-library";

function unit(id: string): WebsiteInventoryUnit {
  return {
    id,
    unitNo: id,
    typeLabel: "Ж",
    rooms: 1,
    areaM2: "34.26",
    priceTotal: "100",
    pricePerM2: "3",
    planImageUrl: null,
    status: "AVAILABLE",
    published: false,
  };
}
function project(): WebsiteProject {
  return {
    id: "project",
    title: "Test",
    slug: "test",
    description: null,
    district: null,
    address: null,
    coverImageUrl: null,
    status: "ACTIVE",
    verification: "PENDING",
    constructionStatus: "BUILDING",
    updatedAt: "2026-10-19",
    website: {
      content: emptyWebsiteContent(),
      plansByBlock: {},
      unitContent: {
        target: { ...emptyUnitContent(), layout3d: "/target.webp" },
        source: { ...emptyUnitContent(), layout3d: "/source.webp" },
        gallery: { ...emptyUnitContent(), gallery: ["/gallery.webp"] },
      },
    },
    blocks: [
      {
        id: "block",
        name: "А блок",
        minPaymentPercent: "0",
        maxPaymentPercent: "100",
        floors: [
          {
            id: "floor4",
            number: 4,
            units: [
              unit("target"),
              unit("source"),
              unit("gallery"),
              unit("empty"),
            ],
          },
        ],
      },
    ],
  };
}
test("layout reuse preserves the target identity-dependent content and missing source layouts", () => {
  const target = {
    ...emptyUnitContent(),
    layout2d: "/target-2d.webp",
    description: "Target",
    paymentTerms: "Target terms",
    useProjectPrice: false,
    gallery: ["/own.webp"],
  };
  const source = {
    ...emptyUnitContent(),
    layout3d: "/source-3d.webp",
    description: "Source",
    paymentTerms: "Source terms",
    gallery: ["/other.webp"],
  };
  const result = copyUnitLayouts(target, source);
  assert.deepEqual(result, { ...target, layout3d: "/source-3d.webp" });
  assert.equal(target.layout3d, "");
  assert.equal(source.layout3d, "/source-3d.webp");
});
test("image library excludes current unit and units without layouts; preserves floor and unit identifiers", () => {
  const result = unitImageSources(project(), "target");
  assert.equal(result.length, 1);
  assert.equal(result[0].unitId, "source");
  assert.equal(result[0].floorNumber, 4);
  assert.match(result[0].label, /А блок · 4-р давхар · № source · Ж/);
  assert.equal(result[0].content.layout3d, "/source.webp");
});
