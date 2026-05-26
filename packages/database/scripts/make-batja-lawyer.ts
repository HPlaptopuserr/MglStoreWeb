import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "batja@mglstore.mn";
  const passwordHash = await bcrypt.hash("Lalar1234", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: "LAWYER" as any,
      isActive: true,
      emailVerified: true,
      passwordHash, // ensures the password is Lalar1234
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
      fullName: "Батжаргал (Хуульч)",
    },
    create: {
      userId: user.id,
      fullName: "Батжаргал (Хуульч)",
    },
  });

  console.log(`Successfully updated ${email} to LAWYER with password Lalar1234`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
