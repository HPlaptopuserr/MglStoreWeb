import assert from "node:assert/strict";
import {
  inventoryError,
  serializeBlocks,
  type BlockDraft,
} from "../apps/business/src/features/building/management/inventory-draft";
import { defaultFacadeRegions } from "../apps/business/src/features/building/website/facade-regions";

const parking: BlockDraft = {
  id: "existing",
  name: "А блок",
  floorCount: "16",
  types: [],
  floors: [
    {
      id: "parking",
      number: "-2",
      units: Array.from({ length: 500 }, (_, index) => ({
        id: `parking-${index}`,
        unitNo: `P${index}`,
        typeLabel: "Зогсоол",
        rooms: "",
        areaM2: "",
      })),
    },
  ],
};
const added: BlockDraft = {
  id: "new",
  name: "Б блок",
  floorCount: "16",
  types: [],
  floors: Array.from({ length: 16 }, (_, index) => ({
    id: `floor-${index}`,
    number: String(index + 1),
    units: [],
  })),
};
assert.equal(inventoryError([parking, added], [parking]), null);
const request = serializeBlocks([parking, added], [parking]);
assert.equal(request[0].preserveInventory, true);
assert.equal(request[0].floors, undefined);
assert.equal(request[1].floors?.length, 16);
assert.match(
  inventoryError([parking, { ...added, name: parking.name }], [parking]) ?? "",
  /давхардсан/,
);
const regions = defaultFacadeRegions(
  Array.from({ length: 16 }, (_, index) => index + 1),
);
assert.equal(regions[0].floor, 16);
assert.equal(regions.at(-1)?.floor, 1);
assert.ok(regions[0].y < regions.at(-1)!.y);
assert.equal(new Set(regions.map((region) => region.floor)).size, 16);
console.log(
  "PASS: unchanged parking inventory, new block serialization, duplicate names, 16th floor above 1st floor",
);
