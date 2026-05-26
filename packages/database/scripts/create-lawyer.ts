import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("lawyer123", 10);
  const email = "lawyer@mglstore.mn";

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: "LAWYER" as any,
      emailVerified: true,
      onboardingSource: "ADMIN" as any,
      isActive: true,
      passwordHash,
    },
    create: {
      email,
      passwordHash,
      role: "LAWYER" as any,
      emailVerified: true,
      onboardingSource: "ADMIN" as any,
      isActive: true,
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      fullName: "Хуульч Дорж",
      phoneNumber: "99112233",
    },
    create: {
      userId: user.id,
      fullName: "Хуульч Дорж",
      phoneNumber: "99112233",
    },
  });

  console.log(`Successfully created lawyer user: ${email} / password: lawyer123`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
