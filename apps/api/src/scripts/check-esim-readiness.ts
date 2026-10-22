import "../config/env";
import { AccessFulfillment } from "../services/esim/access-fulfillment";
import { EsimCatalogService } from "../services/esim/catalog-service";
import { esimAccessCatalog } from "../services/esim/supplier-catalog";
import { esimReadiness } from "../services/esim/readiness";

/** Read-only preflight. Never creates an invoice/order, charges, or emits keys. */
async function main() {
  const checks: Record<string, boolean | number> = { ...esimReadiness(process.env) };
  if (process.env.ESIM_ACCESS_CODE?.trim()) {
    try {
      const balance = await new AccessFulfillment(
        process.env.ESIM_ACCESS_CODE,
      ).balance();
      checks.supplierConnected = true;
      checks.supplierFunded = balance > 0;
      const catalog = await new EsimCatalogService([
        esimAccessCatalog(process.env.ESIM_ACCESS_CODE),
      ]).list("CN");
      checks.chinaOffers = catalog.offers.length;
    } catch {
      checks.supplierConnected = false;
    }
  } else checks.supplierConnected = false;
  console.log(JSON.stringify(checks, null, 2));
  if (Object.values(checks).some((value) => value === false || value === 0))
    process.exitCode = 1;
}
void main();
