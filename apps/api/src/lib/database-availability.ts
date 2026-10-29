const CONNECTION_ERROR_CODES = new Set([
  "P1001", // Database unreachable.
  "P1002", // Connection timed out.
  "P1008", // Operation timed out.
  "P1017", // Server closed the connection.
  "P2024", // Connection pool exhausted.
]);

/** Prisma reports PostgreSQL recovery as an unknown error without a code. */
export function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (
    "code" in error &&
    typeof error.code === "string" &&
    CONNECTION_ERROR_CODES.has(error.code)
  ) {
    return true;
  }
  return (
    "message" in error &&
    typeof error.message === "string" &&
    /database system is (?:in recovery mode|starting up|shutting down)|server has closed the connection/i.test(
      error.message,
    )
  );
}
