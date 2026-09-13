CREATE TABLE "OrganizationJoinCode" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "createdByMembershipId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OrganizationJoinCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationJoinCode_codeHash_key" ON "OrganizationJoinCode"("codeHash");
CREATE INDEX "OrganizationJoinCode_organizationId_revokedAt_expiresAt_idx" ON "OrganizationJoinCode"("organizationId", "revokedAt", "expiresAt");
ALTER TABLE "OrganizationJoinCode" ADD CONSTRAINT "OrganizationJoinCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationJoinCode" ADD CONSTRAINT "OrganizationJoinCode_createdByMembershipId_fkey" FOREIGN KEY ("createdByMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
