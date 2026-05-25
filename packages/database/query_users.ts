import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    include: {
      profile: true
    }
  });
  console.log("USERS_JSON_START");
  console.log(JSON.stringify(users, null, 2));
  console.log("USERS_JSON_END");
}
main().catch(console.error).finally(() => prisma.$disconnect());
