import {
  airaloCatalog,
  esimAccessCatalog,
  esimGoCatalog,
  type SupplierCatalog,
} from "../services/esim/supplier-catalog";

async function main() {
  const country = process.argv[2] ?? "CN";
  const env = process.env;
  const suppliers: SupplierCatalog[] = [];
  if (env.ESIM_ACCESS_CODE)
    suppliers.push(esimAccessCatalog(env.ESIM_ACCESS_CODE));
  if (env.ESIM_GO_API_KEY) suppliers.push(esimGoCatalog(env.ESIM_GO_API_KEY));
  if (env.AIRALO_CLIENT_ID && env.AIRALO_CLIENT_SECRET) {
    suppliers.push(
      airaloCatalog(env.AIRALO_CLIENT_ID, env.AIRALO_CLIENT_SECRET),
    );
  }
  if (!suppliers.length) {
    console.error(
      "No supplier credentials configured. See tool/esim-suppliers/README.md.",
    );
    process.exitCode = 1;
  } else {
    const results = await Promise.allSettled(
      suppliers.map(async (supplier) => {
        const page = await supplier.fetchPage(country);
        // Counts only: never print tokens, wholesale prices or installation secrets.
        return {
          supplier: supplier.id,
          country,
          recordsOnFirstPage: page.records.length,
          nextPage: page.nextPage,
        };
      }),
    );
    results.forEach((result, index) => {
      if (result.status === "fulfilled")
        console.log(JSON.stringify(result.value));
      else {
        console.error(
          `${suppliers[index]?.id}: catalog check failed; inspect account access and configuration.`,
        );
        process.exitCode = 1;
      }
    });
  }
}
void main().catch(() => {
  console.error("Supplier check failed.");
  process.exitCode = 1;
});
