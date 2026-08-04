import { execFileSync } from "node:child_process";

const apps = [
  { name: "web", port: 3000 },
  { name: "admin", port: 3001 },
  { name: "vendor", port: 3002 },
  { name: "warehouse", port: 3003 },
  { name: "org", port: 3004 },
  { name: "business", port: 3005 },
  { name: "pos", port: 3006 },
];

const CPU_WARNING_PERCENT = 150;
const MEMORY_WARNING_MB = 3_072;
const REQUEST_TIMEOUT_MS = 8_000;

function readNextProcesses() {
  const output = execFileSync(
    "ps",
    ["-axo", "pid=,ppid=,%cpu=,rss=,etime=,command="],
    {
      encoding: "utf8",
    },
  );

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("next-server"))
    .map((line) => {
      const match = line.match(
        /^(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(\S+)\s+(.+)$/,
      );
      if (!match) return null;
      return {
        pid: Number(match[1]),
        parentPid: Number(match[2]),
        cpuPercent: Number(match[3]),
        memoryMb: Math.round(Number(match[4]) / 1_024),
        elapsed: match[5],
      };
    })
    .filter(Boolean);
}

async function checkApp({ name, port }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = performance.now();
  try {
    const response = await fetch(`http://localhost:${port}/`, {
      redirect: "manual",
      signal: controller.signal,
    });
    return {
      name,
      port,
      ok: response.status >= 200 && response.status < 500,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
    };
  } catch {
    return { name, port, ok: false, status: null, durationMs: null };
  } finally {
    clearTimeout(timeout);
  }
}

const [appResults, processes] = await Promise.all([
  Promise.all(apps.map(checkApp)),
  Promise.resolve(readNextProcesses()),
]);

console.table(
  appResults.map(({ name, port, ok, status, durationMs }) => ({
    app: name,
    port,
    state: ok ? "OK" : "DOWN",
    status: status ?? "—",
    response: durationMs === null ? "—" : `${durationMs}ms`,
  })),
);

console.table(
  processes.map(({ pid, cpuPercent, memoryMb, elapsed }) => ({
    pid,
    cpu: `${cpuPercent}%`,
    memory: `${memoryMb}MB`,
    elapsed,
    state:
      cpuPercent > CPU_WARNING_PERCENT || memoryMb > MEMORY_WARNING_MB
        ? "RUNAWAY"
        : "OK",
  })),
);

const unavailableApps = appResults.filter((app) => !app.ok);
const runawayProcesses = processes.filter(
  (process) =>
    process.cpuPercent > CPU_WARNING_PERCENT ||
    process.memoryMb > MEMORY_WARNING_MB,
);

if (unavailableApps.length || runawayProcesses.length) {
  if (unavailableApps.length) {
    console.error(
      `Unavailable apps: ${unavailableApps.map((app) => app.name).join(", ")}`,
    );
  }
  if (runawayProcesses.length) {
    console.error(
      `Runaway Next processes: ${runawayProcesses.map((process) => process.pid).join(", ")}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log("All development apps and Next processes are healthy.");
}
