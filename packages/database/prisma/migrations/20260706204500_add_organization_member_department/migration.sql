ALTER TABLE "OrganizationMember"
ADD COLUMN "department" TEXT;

CREATE INDEX "OrganizationMember_department_idx" ON "OrganizationMember"("department");
