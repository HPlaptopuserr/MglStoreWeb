import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));

function sourceParts(filename) {
  return path.relative(sourceRoot, filename).split(path.sep);
}

function importTarget(filename, specifier) {
  if (specifier.startsWith("@/"))
    return path.resolve(sourceRoot, specifier.slice(2));
  if (specifier.startsWith("."))
    return path.resolve(path.dirname(filename), specifier);
  return null;
}

export const architectureRule = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      shared: "Shared code must not depend on app routes or business features.",
      route:
        "Features must not import app routes. Compose features in src/app.",
      feature:
        "Features must not depend on sibling features. Move reusable code to shared or compose it in src/app.",
      server:
        "Client components must not import server implementations. Use a route handler or a type-only import.",
    },
  },
  create(context) {
    const filename = context.filename;
    const source = sourceParts(filename);
    const isClient = context.sourceCode.ast.body.some(
      (node) =>
        node.type === "ExpressionStatement" && node.directive === "use client",
    );

    function check(node, value) {
      if (typeof value !== "string") return;
      const filename = importTarget(context.filename, value);
      if (!filename) return;
      const target = sourceParts(filename);
      let messageId;
      if (source[0] === "shared" && ["app", "features"].includes(target[0]))
        messageId = "shared";
      else if (source[0] === "features" && target[0] === "app")
        messageId = "route";
      else if (
        source[0] === "features" &&
        target[0] === "features" &&
        source[1] !== target[1]
      )
        messageId = "feature";
      else if (
        isClient &&
        target.includes("server") &&
        node.importKind !== "type" &&
        node.exportKind !== "type"
      )
        messageId = "server";
      if (messageId) context.report({ node, messageId });
    }

    return {
      ImportDeclaration: (node) => check(node, node.source.value),
      ExportNamedDeclaration: (node) =>
        node.source && check(node, node.source.value),
      ExportAllDeclaration: (node) => check(node, node.source.value),
      ImportExpression: (node) => check(node, node.source.value),
    };
  },
};
