import { disconnectSeedPrisma, seedCategoriesOnly } from "./seed";

async function main() {
  await seedCategoriesOnly();

  console.log("✅ Category seed completed");
  console.log("   - Business categories upserted");
  console.log("   - Product categories upserted");
}

main()
  .catch((e) => {
    console.error("❌ Category seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectSeedPrisma();
  });
