-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "booking";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateEnum
CREATE TYPE "booking"."ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "booking"."RestaurantTable" (
    "id" UUID NOT NULL,
    "tableNumber" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."Reservation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "customerName" VARCHAR(80) NOT NULL,
    "customerEmail" VARCHAR(254) NOT NULL,
    "restaurantTableId" UUID NOT NULL,
    "reservationDate" TIMESTAMP(3) NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "specialRequest" VARCHAR(500),
    "status" "booking"."ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_tableNumber_key" ON "booking"."RestaurantTable"("tableNumber");
CREATE INDEX "Reservation_userId_reservationDate_idx" ON "booking"."Reservation"("userId", "reservationDate");
CREATE INDEX "Reservation_restaurantTableId_reservationDate_idx" ON "booking"."Reservation"("restaurantTableId", "reservationDate");
CREATE INDEX "Reservation_status_reservationDate_idx" ON "booking"."Reservation"("status", "reservationDate");

-- AddForeignKey
ALTER TABLE "booking"."Reservation" ADD CONSTRAINT "Reservation_restaurantTableId_fkey" FOREIGN KEY ("restaurantTableId") REFERENCES "booking"."RestaurantTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Check Constraints
ALTER TABLE "booking"."RestaurantTable" ADD CONSTRAINT "RestaurantTable_positive_values" CHECK ("tableNumber" > 0 AND "capacity" BETWEEN 1 AND 8);
ALTER TABLE "booking"."Reservation" ADD CONSTRAINT "Reservation_positive_guests" CHECK ("guestCount" BETWEEN 1 AND 8);

-- Exclusion Constraint for Overlapping Reservations
ALTER TABLE "booking"."Reservation" ADD CONSTRAINT "Reservation_no_overlap"
EXCLUDE USING gist ("restaurantTableId" WITH =, tsrange("reservationDate", "reservationDate" + interval '90 minutes', '[)') WITH &&)
WHERE ("status" IN ('PENDING', 'CONFIRMED'));

