-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "catalog";

-- CreateTable
CREATE TABLE "catalog"."Category" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."MenuItem" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "imageUrl" VARCHAR(2048) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "preparationTimeMinutes" INTEGER NOT NULL,
    "categoryId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "catalog"."Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "catalog"."Category"("slug");

-- CreateIndex
CREATE INDEX "MenuItem_categoryId_isAvailable_idx" ON "catalog"."MenuItem"("categoryId", "isAvailable");

-- CreateIndex
CREATE INDEX "MenuItem_isFeatured_idx" ON "catalog"."MenuItem"("isFeatured");

-- AddForeignKey
ALTER TABLE "catalog"."MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "catalog"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraints
ALTER TABLE "catalog"."MenuItem" ADD CONSTRAINT "MenuItem_positive_price" CHECK ("price" > 0), ADD CONSTRAINT "MenuItem_positive_preparation" CHECK ("preparationTimeMinutes" > 0);

