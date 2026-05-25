import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const contracts = await prisma.contract.findMany({
    where: {
      id: { startsWith: '058372a6' }
    }
  });
  console.log("CONTRACTS_JSON_START");
  console.log(JSON.stringify(contracts, null, 2));
  console.log("CONTRACTS_JSON_END");
}
main().catch(console.error).finally(() => prisma.$disconnect());
