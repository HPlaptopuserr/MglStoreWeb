import path from "path";
import dotenv from "dotenv";
import { prisma } from "@mgl/database";
import { suggestProductCategory } from "../services/product-discovery.service";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

type Args = {
  apply: boolean;
  all: boolean;
  minScore: number;
  limit: number;
};

function parseArgs(): Args {
  const args = new Set(process.argv.slice(2));
  const getValue = (name: string, fallback: string) => {
    const prefix = `${name}=`;
    const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
    return found ? found.slice(prefix.length) : fallback;
  };

  return {
    apply: args.has("--apply"),
    all: args.has("--all"),
    minScore: Number(getValue("--min-score", "50")),
    limit: Number(getValue("--limit", "5000")),
  };
}

async function main() {
  const options = parseArgs();
  const categories = await prisma.businessCategory.findMany({
    where: { isActive: true },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true, level: true },
  });

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(options.all ? {} : { businessCategoryId: null }),
    },
    take: options.limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      sku: true,
      businessCategoryId: true,
      organization: { select: { id: true, name: true } },
    },
  });

  const decisions = products
    .map((product) => {
      const [best] = suggestProductCategory(product, categories);
      return { product, best };
    })
    .filter(({ best }) => best && best.score >= options.minScore);

  const skipped = products.length - decisions.length;

  console.log(
    JSON.stringify(
      {
        mode: options.apply ? "apply" : "dry-run",
        productsScanned: products.length,
        matched: decisions.length,
        skipped,
        minScore: options.minScore,
        allProducts: options.all,
      },
      null,
      2,
    ),
  );

  for (const { product, best } of decisions.slice(0, 30)) {
    console.log(
      [
        options.apply ? "APPLY" : "DRY",
        best!.score,
        product.name,
        "=>",
        best!.name,
        `(${best!.id})`,
      ].join(" "),
    );
  }

  if (!options.apply) {
    console.log("\nNo database changes made. Re-run with --apply to update matched products.");
    return;
  }

  let updated = 0;
  for (const { product, best } of decisions) {
    if (!best) continue;
    await prisma.product.update({
      where: { id: product.id },
      data: { businessCategoryId: best.id },
    });
    updated += 1;
  }

  console.log(`Updated ${updated} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
