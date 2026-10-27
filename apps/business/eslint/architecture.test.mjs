import { RuleTester } from "eslint";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { architectureRule } from "./architecture.mjs";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
const filename = (name) => path.join(sourceRoot, name);
const tester = new RuleTester({
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
});

tester.run("business-boundaries", architectureRule, {
  valid: [
    {
      filename: filename("app/page.tsx"),
      code: 'import "@/features/business-intro/BusinessLivePage";',
    },
    {
      filename: filename("app/_components/BusinessLoading.tsx"),
      code: '"use client"; import "@/features/workforce/components/WorkforceLoadingScreen";',
    },
    {
      filename: filename("features/building/server/session.ts"),
      code: 'import "@/shared/server/request-origin";',
    },
    {
      filename: filename("features/building/plans/editor.ts"),
      code: 'import "../management/inventory-draft";',
    },
    { filename: filename("shared/ui/button.ts"), code: 'import "react";' },
  ],
  invalid: [
    {
      filename: filename("shared/ui/button.ts"),
      code: 'import "@/features/building/components/BuildingShell";',
      errors: [{ messageId: "shared" }],
    },
    {
      filename: filename("shared/ui/button.ts"),
      code: 'import "../../app/page";',
      errors: [{ messageId: "shared" }],
    },
    {
      filename: filename("features/building/plans/editor.ts"),
      code: 'import "@/app/building/page";',
      errors: [{ messageId: "route" }],
    },
    {
      filename: filename("features/building/plans/editor.ts"),
      code: 'import "../../workforce/WorkforceApp";',
      errors: [{ messageId: "feature" }],
    },
    {
      filename: filename("features/building/plans/editor.ts"),
      code: 'export * from "@/features/workforce/WorkforceApp";',
      errors: [{ messageId: "feature" }],
    },
    {
      filename: filename("features/building/plans/editor.ts"),
      code: 'import("../../workforce/WorkforceApp");',
      errors: [{ messageId: "feature" }],
    },
    {
      filename: filename("features/building/plans/editor.ts"),
      code: '"use client"; import "../server/building-session";',
      errors: [{ messageId: "server" }],
    },
  ],
});
