-- Prisma 8 PostgreSQL Contract Migration
-- Converts existing unique indexes on singular relation targets to official UNIQUE constraints
-- guaranteeing PostgreSQL schema contract alignment without data loss or table locks.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserProfile_authUserId_key'
  ) THEN
    ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_authUserId_key" UNIQUE USING INDEX "UserProfile_authUserId_key";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AiUsageRecord_runId_key'
  ) THEN
    ALTER TABLE "AiUsageRecord" ADD CONSTRAINT "AiUsageRecord_runId_key" UNIQUE USING INDEX "AiUsageRecord_runId_key";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrganizationSettings_organizationId_key'
  ) THEN
    ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_key" UNIQUE USING INDEX "OrganizationSettings_organizationId_key";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_externalId_key'
  ) THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_externalId_key" UNIQUE USING INDEX "Subscription_externalId_key";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_organizationId_key'
  ) THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_key" UNIQUE USING INDEX "Subscription_organizationId_key";
  END IF;
END $$;
