interface LocalPaymentSimulationContext {
  enabled: boolean;
  localDev: boolean;
  environment: string;
  databaseUrl?: string;
  hostname: string;
  remoteAddress?: string;
  registerId: string | null;
}

/** Explicit local fixture mode: never available to production, staging or remote callers. */
export function canSimulateLocalPosPayment(
  context: LocalPaymentSimulationContext,
): boolean {
  if (
    !context.enabled ||
    !context.localDev ||
    context.environment !== "development" ||
    !context.registerId?.startsWith("local-")
  )
    return false;
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(context.hostname))
    return false;
  if (
    !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
      context.remoteAddress || "",
    )
  )
    return false;
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(context.databaseUrl || "").hostname,
    );
  } catch {
    return false;
  }
}
