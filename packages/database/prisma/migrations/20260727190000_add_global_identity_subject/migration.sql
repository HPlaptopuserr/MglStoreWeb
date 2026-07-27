ALTER TABLE "User" ADD COLUMN "identitySubject" TEXT;

CREATE UNIQUE INDEX "User_identitySubject_key" ON "User"("identitySubject");
