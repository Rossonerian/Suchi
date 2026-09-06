-- Store provider event IDs so Stripe webhook delivery is idempotent.
CREATE TABLE "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingWebhookEvent_provider_eventId_key" ON "BillingWebhookEvent"("provider", "eventId");
