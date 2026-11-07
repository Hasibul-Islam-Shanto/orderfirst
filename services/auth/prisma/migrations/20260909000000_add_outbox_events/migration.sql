-- CreateEnum
CREATE TYPE "auth"."OutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "auth"."OutboxEvent" (
    "id" UUID NOT NULL,
    "exchange" VARCHAR(100) NOT NULL,
    "routingKey" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "correlationId" VARCHAR(100),
    "status" "auth"."OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutboxEvent_status_createdAt_idx" ON "auth"."OutboxEvent"("status", "createdAt");

