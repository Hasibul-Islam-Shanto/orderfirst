-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "orders";

-- CreateEnum
CREATE TYPE "orders"."OrderType" AS ENUM ('DINE_IN', 'PICKUP');

-- CreateEnum
CREATE TYPE "orders"."OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "orders"."Order" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "customerName" VARCHAR(80) NOT NULL,
    "customerEmail" VARCHAR(254) NOT NULL,
    "status" "orders"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "orderType" "orders"."OrderType" NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders"."OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "menuItemId" UUID NOT NULL,
    "menuItemName" VARCHAR(100) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "orders"."Order"("userId", "createdAt");
CREATE INDEX "Order_status_createdAt_idx" ON "orders"."Order"("status", "createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "orders"."OrderItem"("orderId");
CREATE INDEX "OrderItem_menuItemId_idx" ON "orders"."OrderItem"("menuItemId");
CREATE UNIQUE INDEX "OrderItem_orderId_menuItemId_key" ON "orders"."OrderItem"("orderId", "menuItemId");

-- AddForeignKey
ALTER TABLE "orders"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraints
ALTER TABLE "orders"."Order" ADD CONSTRAINT "Order_valid_totals" CHECK ("subtotal" >= 0 AND "total" = "subtotal");
ALTER TABLE "orders"."OrderItem" ADD CONSTRAINT "OrderItem_positive_values" CHECK ("quantity" BETWEEN 1 AND 20 AND "unitPrice" > 0);

