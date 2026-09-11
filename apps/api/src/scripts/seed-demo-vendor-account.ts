import path from "path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import {
  Capability,
  OrgRole,
  OrgStatus,
  OrgType,
  PosActivationStatus,
  prisma,
} from "@mgl/database";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

const email = "demo@mglstore.mn";
const password = "Demo1234";
const organizationId = "demo-store-001";

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const organization = await prisma.organization.upsert({
    where: { id: organizationId },
    update: {
      name: "Номин Мини Маркет",
      type: OrgType.VENDOR,
      status: OrgStatus.ACTIVE,
      businessCategory: "market-food-grocery",
      businessOrdersEnabled: true,
      businessInventoryEnabled: true,
    },
    create: {
      id: organizationId,
      name: "Номин Мини Маркет",
      slug: "demo-nomin-mini-market",
      taxId: "DEMO-STORE-001",
      type: OrgType.VENDOR,
      status: OrgStatus.ACTIVE,
      isVerified: true,
      businessCategory: "market-food-grocery",
      businessOrdersEnabled: true,
      businessInventoryEnabled: true,
      businessAttendanceEnabled: false,
      businessTasksEnabled: false,
    },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isActive: true, deletedAt: null },
    create: {
      email,
      passwordHash,
      isActive: true,
      emailVerified: true,
      profile: {
        create: { fullName: "Бат-Эрдэнэ Ганболд", phoneNumber: "99112233" },
      },
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { fullName: "Бат-Эрдэнэ Ганболд", phoneNumber: "99112233" },
    create: {
      userId: user.id,
      fullName: "Бат-Эрдэнэ Ганболд",
      phoneNumber: "99112233",
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id,
      },
    },
    update: {
      role: OrgRole.OWNER,
      isPrimary: true,
      isActive: true,
      deletedAt: null,
      capabilities: [Capability.POS_CASHIER],
    },
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: OrgRole.OWNER,
      isPrimary: true,
      capabilities: [Capability.POS_CASHIER],
    },
  });

  await prisma.siteSetting.upsert({
    where: { key: `pos-enabled-${organization.id}` },
    update: { value: "true" },
    create: { key: `pos-enabled-${organization.id}`, value: "true" },
  });

  const branch = await prisma.branch.upsert({
    where: { id: "demo-store-branch-001" },
    update: { name: "Үндсэн салбар", address: "Улаанбаатар", deletedAt: null },
    create: {
      id: "demo-store-branch-001",
      organizationId: organization.id,
      name: "Үндсэн салбар",
      address: "Улаанбаатар",
    },
  });
  await prisma.posRegister.upsert({
    where: { id: "demo-store-register-001" },
    update: {
      branchId: branch.id,
      isActive: true,
      activationStatus: PosActivationStatus.APPROVED,
      deletedAt: null,
    },
    create: {
      id: "demo-store-register-001",
      organizationId: organization.id,
      branchId: branch.id,
      name: "Mobile POS",
      label: "Үндсэн касс",
      isActive: true,
      activationStatus: PosActivationStatus.APPROVED,
    },
  });

  console.log(`Demo vendor ready: ${email} -> ${organization.id}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
