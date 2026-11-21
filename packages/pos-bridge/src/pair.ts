import readline from "node:readline";
import { bridgeDataDirectory, loadBridgeEnv } from "./bridge-config";
import {
  assertPairingSafe,
  pairBridge,
  readBridgeCredentials,
} from "./bridge-pairing";

async function main() {
  loadBridgeEnv();
  const directory = bridgeDataDirectory();
  assertPairingSafe(directory);
  if (process.argv.includes("--check-safe")) return;
  if (process.argv.includes("--if-needed")) {
    const existing = readBridgeCredentials(directory);
    if (existing && !existing.revoked) return;
  }
  console.log("Admin > Vendor & POS > Vendor kass > PAX A35 holboh.");
  console.log(
    "Copy the one-time connection link. The code expires in 10 minutes.",
  );
  const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const input = await new Promise<string>((resolve) =>
      prompt.question("Connection link or code: ", resolve),
    );
    const credentials = await pairBridge(
      directory,
      input,
      process.env.BRIDGE_API_URL,
    );
    console.log(
      `Paired register ${credentials.registerId}. Restart the bridge; do not copy secrets into the browser.`,
    );
  } finally {
    prompt.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Pairing failed");
  process.exitCode = 1;
});
