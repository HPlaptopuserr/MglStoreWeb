import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ChargeResult } from "./providers/provider.interface";

type Entry = { fingerprint: string; terminalId: string; result?: ChargeResult };

/** Reserve before touching hardware. Interrupted/unknown operations are never resent. */
export class OperationJournal {
  private readonly inFlight = new Map<string, Promise<ChargeResult>>();

  constructor(private readonly directory: string) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  }

  private filename(id: string) {
    return path.join(
      this.directory,
      `${crypto.createHash("sha256").update(id).digest("hex")}.json`,
    );
  }

  private read(id: string): Entry | null {
    const filename = this.filename(id);
    if (!fs.existsSync(filename)) return null;
    const entry: unknown = JSON.parse(fs.readFileSync(filename, "utf8"));
    if (
      !entry ||
      typeof entry !== "object" ||
      !("fingerprint" in entry) ||
      typeof entry.fingerprint !== "string" ||
      !("terminalId" in entry) ||
      typeof entry.terminalId !== "string" ||
      ("result" in entry &&
        (!entry.result ||
          typeof entry.result !== "object" ||
          !("status" in entry.result) ||
          !["APPROVED", "DECLINED", "FAILED"].includes(
            String(entry.result.status),
          )))
    )
      throw new Error(
        "Bridge journal is damaged; reconcile the terminal before continuing",
      );
    return entry as Entry;
  }

  lookup(id: string, fingerprint: string): ChargeResult | null {
    const entry = this.read(id);
    if (!entry) return null;
    if (entry.fingerprint !== fingerprint)
      throw new Error(
        "Operation identity was reused with different parameters",
      );
    return (
      entry.result || {
        status: "FAILED",
        message:
          "Original terminal operation is unresolved; do not charge again",
      }
    );
  }

  async execute(
    id: string,
    fingerprint: string,
    terminalId: string,
    operation: () => Promise<ChargeResult>,
  ): Promise<ChargeResult> {
    // Check the disk fingerprint even while an identical operation is in flight.
    const previous = this.lookup(id, fingerprint);
    const active = this.inFlight.get(id);
    if (active) return active;
    if (previous) return previous;
    const work = this.run(id, fingerprint, terminalId, operation);
    this.inFlight.set(id, work);
    try {
      return await work;
    } finally {
      this.inFlight.delete(id);
    }
  }

  private async run(
    id: string,
    fingerprint: string,
    terminalId: string,
    operation: () => Promise<ChargeResult>,
  ): Promise<ChargeResult> {
    const filename = this.filename(id);
    // One unresolved financial operation blocks this physical terminal, including after restart.
    const lockfile = path.join(this.directory, "terminal.lock");
    let lock: number;
    try {
      lock = fs.openSync(lockfile, "wx", 0o600);
    } catch {
      throw new Error(
        "Terminal has an unresolved operation; verify it before starting another",
      );
    }
    fs.writeFileSync(lock, id);
    fs.fsyncSync(lock);
    fs.closeSync(lock);
    const entry: Entry = { fingerprint, terminalId };
    try {
      const fd = fs.openSync(filename, "wx", 0o600);
      try {
        fs.writeFileSync(fd, JSON.stringify(entry));
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
    } catch (error) {
      // Keep the lock on an uncertain disk failure; never risk dispatching twice.
      throw error;
    }
    let result: ChargeResult;
    try {
      result = await operation();
    } catch (error: unknown) {
      result = {
        status: "FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Terminal response lost; verify original operation",
      };
    }
    const temporary = `${filename}.${process.pid}.tmp`;
    const fd = fs.openSync(temporary, "wx", 0o600);
    try {
      fs.writeFileSync(fd, JSON.stringify({ ...entry, result }));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(temporary, filename);
    if (result.status === "APPROVED" || result.status === "DECLINED")
      fs.unlinkSync(lockfile);
    return result;
  }
}
