CREATE TABLE "DeliveryDriverProfile" (
    "userId" TEXT NOT NULL,
    "nationalId" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehiclePlateNumber" TEXT,
    "vehicleCategory" TEXT,
    "driverLicenseNumber" TEXT,
    "driverLicenseDocumentUrl" TEXT,
    "vehicleDocumentUrl" TEXT,
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "insuranceExpiresAt" TIMESTAMP(3),
    "insuranceDocumentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryDriverProfile_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "DeliveryDriverProfile_vehiclePlateNumber_idx"
ON "DeliveryDriverProfile"("vehiclePlateNumber");

CREATE INDEX "DeliveryDriverProfile_insuranceExpiresAt_idx"
ON "DeliveryDriverProfile"("insuranceExpiresAt");

ALTER TABLE "DeliveryDriverProfile"
ADD CONSTRAINT "DeliveryDriverProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
