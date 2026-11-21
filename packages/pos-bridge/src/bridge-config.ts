import fs from "node:fs";
import path from "node:path";

export function loadBridgeEnv() {
  const paths = [
    path.resolve(__dirname, "../../../.env"),
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, "../bridge.env"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "bridge.env"),
  ];
  for (const filename of [...new Set(paths)]) {
    if (!fs.existsSync(filename)) continue;
    for (const raw of fs.readFileSync(filename, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      )
        value = value.slice(1, -1);
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

/** Outside the installer payload: upgrades preserve credentials and payment evidence. */
export function bridgeDataDirectory(): string {
  return (
    process.env.BRIDGE_DATA_DIR ||
    path.join(
      process.env.LOCALAPPDATA || path.resolve(__dirname, "../../.."),
      "MGLStore",
      "pos-bridge-data",
    )
  );
}
