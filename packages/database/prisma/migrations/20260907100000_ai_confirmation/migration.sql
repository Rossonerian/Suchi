-- Add one-time confirmation state for consequential AI writes.
ALTER TABLE "AiRun" ADD COLUMN "confirmationNonce" TEXT;
ALTER TABLE "AiRun" ADD COLUMN "confirmedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "AiRun_confirmationNonce_key" ON "AiRun"("confirmationNonce");
