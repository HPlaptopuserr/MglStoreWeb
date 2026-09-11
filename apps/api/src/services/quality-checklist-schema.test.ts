import assert from "node:assert/strict";
import test from "node:test";
import { parseSchema } from "./quality-checklist-schema";

const section = (weight = 1) => [{ id: "section", title: "Цэвэрлэгээ", questions: [{ id: "question", text: "Цэвэр үү?", weight, required: true }] }];
test("quality checklist preserves question identity and valid weights", () => {
  assert.deepEqual(parseSchema(section()), section());
});
test("quality checklist rejects invalid weights and duplicate identifiers", () => {
  for (const weight of [NaN, Infinity, 0, 101]) assert.equal(parseSchema(section(weight)), null);
  const duplicate = section(); duplicate[0].questions[0].id = "section";
  assert.equal(parseSchema(duplicate), null);
  assert.equal(parseSchema([]), null);
});
