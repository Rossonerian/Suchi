-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'scheduled';
