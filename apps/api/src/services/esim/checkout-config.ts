import { esimReadiness } from "./readiness";

export function checkoutEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.ESIM_CHECKOUT_ENABLED === "true" &&
    Object.values(esimReadiness(env)).every(Boolean);
}
