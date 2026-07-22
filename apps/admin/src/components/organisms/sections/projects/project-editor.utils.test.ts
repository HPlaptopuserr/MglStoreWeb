import assert from "node:assert/strict";
import test from "node:test";
import {
  getProjectImages,
  parseImageUrls,
  parseStudyProgramRows,
  parseStudyTeacherRows,
  serializeStudyProgramRows,
  serializeStudyTeacherRows,
} from "./project-editor.utils";

test("project images are trimmed, deduplicated, and capped", () => {
  const urls = Array.from(
    { length: 15 },
    (_, index) => `https://img/${index}.jpg`,
  ).join("\n");
  assert.equal(parseImageUrls(urls).length, 12);
  assert.deepEqual(
    getProjectImages({
      imageUrl: " a.jpg ",
      imageUrls: ["a.jpg", "b.jpg"],
    } as Parameters<typeof getProjectImages>[0]),
    ["a.jpg", "b.jpg"],
  );
});

test("study program rows round-trip without losing empty editor rows", () => {
  const rows = [
    { title: "Оршил", description: "Тайлбар" },
    { title: "", description: "" },
  ];
  assert.deepEqual(
    parseStudyProgramRows(serializeStudyProgramRows(rows)),
    rows,
  );
});

test("study teacher rows round-trip image metadata", () => {
  const rows = [
    {
      name: "Багш",
      description: "Туршлага",
      imageUrl: "https://img/teacher.jpg",
    },
  ];
  assert.deepEqual(
    parseStudyTeacherRows(serializeStudyTeacherRows(rows)),
    rows,
  );
});
