-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRED', 'QUARANTINE');

-- AlterTable
ALTER TABLE "consent_records" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "surgical_procedures" ADD COLUMN     "anesthesia_data" JSONB,
ADD COLUMN     "fluid_balance" JSONB,
ADD COLUMN     "intraop_vitals" JSONB,
ADD COLUMN     "opme_data" JSONB;

-- AlterTable
ALTER TABLE "triage_assessments" ADD COLUMN     "discriminator_path" JSONB,
ADD COLUMN     "flowchart_code" TEXT;

-- CreateTable
CREATE TABLE "manchester_flowcharts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "discriminators" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manchester_flowcharts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispensations" (
    "id" TEXT NOT NULL,
    "prescription_item_id" TEXT NOT NULL,
    "pharmacist_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lot" TEXT,
    "expiration_date" TIMESTAMP(3),
    "observations" TEXT,
    "dispensed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_inventory" (
    "id" TEXT NOT NULL,
    "drug_name" TEXT NOT NULL,
    "drug_id" TEXT,
    "lot" TEXT NOT NULL,
    "expiration_date" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "min_quantity" INTEGER NOT NULL DEFAULT 10,
    "location" TEXT NOT NULL,
    "status" "InventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manchester_flowcharts_code_key" ON "manchester_flowcharts"("code");

-- CreateIndex
CREATE INDEX "manchester_flowcharts_tenant_id_is_active_idx" ON "manchester_flowcharts"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "manchester_flowcharts_code_idx" ON "manchester_flowcharts"("code");

-- CreateIndex
CREATE INDEX "dispensations_prescription_item_id_idx" ON "dispensations"("prescription_item_id");

-- CreateIndex
CREATE INDEX "dispensations_pharmacist_id_idx" ON "dispensations"("pharmacist_id");

-- CreateIndex
CREATE INDEX "dispensations_tenant_id_idx" ON "dispensations"("tenant_id");

-- CreateIndex
CREATE INDEX "drug_inventory_tenant_id_idx" ON "drug_inventory"("tenant_id");

-- CreateIndex
CREATE INDEX "drug_inventory_drug_name_idx" ON "drug_inventory"("drug_name");

-- CreateIndex
CREATE INDEX "drug_inventory_status_idx" ON "drug_inventory"("status");

-- AddForeignKey
ALTER TABLE "manchester_flowcharts" ADD CONSTRAINT "manchester_flowcharts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_prescription_item_id_fkey" FOREIGN KEY ("prescription_item_id") REFERENCES "prescription_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_pharmacist_id_fkey" FOREIGN KEY ("pharmacist_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_inventory" ADD CONSTRAINT "drug_inventory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
