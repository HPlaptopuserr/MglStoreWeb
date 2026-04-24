const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const packageDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageDir, "..", "..");
const rootEnvPath = path.join(repoRoot, ".env");

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

if (fs.existsSync(rootEnvPath)) {
  const envFromFile = parseEnvFile(rootEnvPath);
  for (const [key, value] of Object.entries(envFromFile)) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
} else {
  console.warn(`[with-root-env] Root .env not found at ${rootEnvPath}`);
}

const [tool, ...args] = process.argv.slice(2);

if (!tool) {
  console.error("[with-root-env] Missing command");
  process.exit(1);
}

const nodeToolEntrypoints = {
  prisma: require.resolve("prisma/build/index.js"),
  "ts-node": require.resolve("ts-node/dist/bin.js"),
};

const spawnOptions = {
  cwd: packageDir,
  env: process.env,
  stdio: "inherit",
};

const child =
  tool in nodeToolEntrypoints
    ? spawn(process.execPath, [nodeToolEntrypoints[tool], ...args], spawnOptions)
    : spawn(tool, args, {
        ...spawnOptions,
        shell: process.platform === "win32",
      });

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

