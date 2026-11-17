import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseClubWebsite } from "@mgl/types";
import { innovaCompany, innovaWebsite } from "./local-companies";
import { withLocalWebsiteMedia } from "./website-template";

test("Innova sections validate and reference existing supplied assets", () => {
  assert.ok(parseClubWebsite(innovaWebsite));
  assert.equal(innovaWebsite.sections.length, 5);
  const contact = innovaWebsite.sections.find(
    (section) => section.id === "contact",
  );
  assert.match(contact?.text || "", /8010-0101, 9400-0042/);
  for (const section of innovaWebsite.sections) {
    for (const url of [
      section.imageUrl,
      ...section.items.map((item) => item.imageUrl),
    ].filter(Boolean)) {
      assert.ok(existsSync(join(process.cwd(), "public", url)), url);
    }
  }
});

test("old local snapshots collapse to five sections while preserving edited content", () => {
  const old = structuredClone(innovaWebsite);
  old.sections = old.sections.filter(
    (section) => !["production", "certificates"].includes(section.id),
  );
  old.sections.push({
    ...structuredClone(innovaWebsite.sections[1]),
    id: "advantages",
    type: "services",
  });
  const about = old.sections.find((section) => section.id === "about")!;
  about.imageUrl = "/mgl-club/website-demo/innova-logo.png";
  about.title = "Өөрчилсөн танилцуулга";
  old.sections[0].imageUrl = "https://example.test/custom.png";
  const updated = withLocalWebsiteMedia(innovaCompany, old);
  assert.ok(parseClubWebsite(updated));
  assert.equal(updated.sections.length, 5);
  assert.equal(
    updated.sections.find((section) => section.id === "about")?.title,
    about.title,
  );
  assert.equal(updated.sections[0].imageUrl, old.sections[0].imageUrl);
  assert.equal(old.sections.length, 4);
  assert.deepEqual(withLocalWebsiteMedia(innovaCompany, updated), updated);
});

test("current local drafts retain deliberately removed galleries", () => {
  const current = {
    ...innovaWebsite,
    sections: innovaWebsite.sections.filter(
      (section) => section.id !== "production",
    ),
  };
  assert.equal(
    withLocalWebsiteMedia(innovaCompany, current).sections.some(
      (section) => section.id === "production",
    ),
    false,
  );
});
