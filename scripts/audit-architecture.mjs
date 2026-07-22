import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), process.argv[2] || "apps/admin/src");
const strict = process.argv.includes("--strict");
const limits = { lines: 500, states: 10, directApis: 3, modals: 5, functionLines: 80, any: 0 };

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

function count(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

function longFunctions(source) {
  const lines = source.split("\n");
  const found = [];
  for (let start = 0; start < lines.length; start += 1) {
    const match = lines[start].match(/^\s*(?:export\s+)?(?:default\s+)?function\s+([\w$]+)/);
    if (!match) continue;
    let depth = 0;
    let opened = false;
    for (let end = start; end < lines.length; end += 1) {
      for (const character of lines[end]) {
        if (character === "{") { depth += 1; opened = true; }
        if (character === "}") depth -= 1;
      }
      if (opened && depth === 0) {
        const length = end - start + 1;
        if (length > limits.functionLines) found.push({ name: match[1], length });
        break;
      }
    }
  }
  return found;
}

function inspect(file) {
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split("\n").length;
  const states = count(source, /\buseState\s*(?:<[^;]+?>)?\s*\(/g);
  const directApis = count(source, /\b(?:adminFetch|fetch)\s*\(/g);
  const modals = count(
    source,
    /useState[^\n]*(?:Modal|Dialog|modal|dialog|Open)|\bshow[A-Z]\w*(?:Modal|Dialog)\b/g,
  );
  const any = count(source, /:\s*any\b|\bas\s+any\b|\bany\[\]/g);
  const long = longFunctions(source);
  const violations = [
    lines > limits.lines && `${lines} lines`,
    states > limits.states && `${states} states`,
    directApis > limits.directApis && `${directApis} direct APIs`,
    modals > limits.modals && `${modals} modals`,
    long.length > 0 && `${long.length} long fn (max ${Math.max(...long.map(({ length }) => length))})`,
    any > limits.any && `${any} any`,
  ].filter(Boolean);
  return { file: path.relative(process.cwd(), file), lines, states, directApis, modals, any, long, violations };
}

const results = sourceFiles(ROOT).map(inspect);
const violations = results
  .filter((item) => item.violations.length)
  .sort(
    (left, right) =>
      right.states * 25 + right.directApis * 20 + right.lines / 10 + right.any * 8 -
      (left.states * 25 + left.directApis * 20 + left.lines / 10 + left.any * 8),
  );

console.log(`Architecture audit: ${path.relative(process.cwd(), ROOT)}`);
console.log(`Limits: ${limits.states} states, ${limits.directApis} direct APIs, ${limits.modals} modals, ${limits.functionLines}-line functions, ${limits.lines}-line files, no any\n`);
for (const item of violations) {
  console.log(`${item.violations.join(" | ").padEnd(48)} ${item.file}`);
}
console.log(`\n${violations.length}/${results.length} files require review.`);
console.log("Manual review remains required for duplicated UI blocks, excessive props, and change coupling.");

if (strict && violations.length) process.exitCode = 1;
