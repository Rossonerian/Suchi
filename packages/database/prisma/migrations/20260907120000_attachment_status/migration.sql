-- Track whether a signed attachment upload has completed.
ALTER TABLE "Attachment" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Attachment" ADD COLUMN "uploadedAt" TIMESTAMP(3);
