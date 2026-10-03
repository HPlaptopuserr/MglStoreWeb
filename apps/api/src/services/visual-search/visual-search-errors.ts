export class VisualSearchError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "VisualSearchError";
  }
}

export function visualSearchEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  // An explicit kill switch always wins, including on developer machines.
  return env.VISUAL_SEARCH_ENABLED === undefined
    ? env.MGL_LOCAL_DEV === "true"
    : env.VISUAL_SEARCH_ENABLED === "true";
}
