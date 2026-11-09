import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCommunityTags } from "./community-tags";
test("multi-select tags preserve custom entries and remove duplicate selections", () => {
  assert.deepEqual(
    parseCommunityTags(
      " Хуулийн зөвлөгөө, Вэбсайт хөгжүүлэлт\nхуулийн зөвлөгөө\r\nМиний өөр үйлчилгээ ,, ",
    ),
    ["Хуулийн зөвлөгөө", "Вэбсайт хөгжүүлэлт", "Миний өөр үйлчилгээ"],
  );
  assert.deepEqual(parseCommunityTags(" , \n"), []);
});
