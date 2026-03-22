-- Blocks 2-8: Chemotherapy, Billing Appeals, Clinical Protocols, Drug Database

-- CreateEnum
CREATE TYPE "ChemoCycleStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED', 'CANCELLED');
CREATE TYPE "AppealStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'ESCALATED');

-- AlterEnum
ALTER TYPE "MedCheckStatus" ADD VALUE 'FIRST_CHECK';

-- CreateTable: chemotherapy_protocols
CREATE TABLE "chemotherapy_protocols" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "regimen" TEXT NOT NULL,
    "indication" TEXT NOT NULL,
    "drugs" JSONB NOT NULL,
    "premedications" JSONB,
    "cycle_days" INTEGER NOT NULL,
    "max_cycles" INTEGER NOT NULL,
    "emetogenic_risk" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chemotherapy_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable: chemotherapy_cycles
CREATE TABLE "chemotherapy_cycles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "encounter_id" TEXT,
    "protocol_id" TEXT NOT NULL,
    "cycle_number" INTEGER NOT NULL,
    "status" "ChemoCycleStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "bsa" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "adjusted_doses" JSONB,
    "toxicities" JSONB,
    "lab_results" JSONB,
    "nurse_notes" TEXT,
    "doctor_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chemotherapy_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: billing_appeals
CREATE TABLE "billing_appeals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "billing_entry_id" TEXT NOT NULL,
    "appeal_number" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'DRAFT',
    "glosed_item_codes" TEXT[],
    "glosed_amount" DECIMAL(65,30) NOT NULL,
    "appealed_amount" DECIMAL(65,30) NOT NULL,
    "recovered_amount" DECIMAL(65,30),
    "justification" TEXT NOT NULL,
    "ai_justification" TEXT,
    "supporting_docs" TEXT[],
    "tiss_xml_validation" JSONB,
    "submitted_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "billing_appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable: clinical_protocols
CREATE TABLE "clinical_protocols" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "description" TEXT NOT NULL,
    "trigger_criteria" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clinical_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable: drugs
CREATE TABLE "drugs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "active_ingredient" TEXT NOT NULL,
    "atc_code" TEXT,
    "therapeutic_class" TEXT NOT NULL,
    "pharmaceutical_form" TEXT NOT NULL,
    "concentration" TEXT NOT NULL,
    "manufacturer" TEXT,
    "registration_anvisa" TEXT,
    "is_controlled" BOOLEAN NOT NULL DEFAULT false,
    "control_type" TEXT,
    "is_antimicrobial" BOOLEAN NOT NULL DEFAULT false,
    "is_high_alert" BOOLEAN NOT NULL DEFAULT false,
    "max_dose_per_day" TEXT,
    "default_route" TEXT,
    "default_frequency" TEXT,
    "renal_adjustment" BOOLEAN NOT NULL DEFAULT false,
    "hepatic_adjustment" BOOLEAN NOT NULL DEFAULT false,
    "pregnancy_category" TEXT,
    "beers_list_criteria" TEXT,
    "pediatric_use" BOOLEAN NOT NULL DEFAULT true,
    "geriatric_caution" BOOLEAN NOT NULL DEFAULT false,
    "dilution_info" TEXT,
    "administration_notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: drug_interactions
CREATE TABLE "drug_interactions" (
    "id" TEXT NOT NULL,
    "drug1_id" TEXT NOT NULL,
    "drug2_id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "mechanism" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "effect_en" TEXT,
    "management" TEXT,
    "management_en" TEXT,
    "evidence" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "drug_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "chemotherapy_protocols_tenant_id_idx" ON "chemotherapy_protocols"("tenant_id");
CREATE INDEX "chemotherapy_cycles_tenant_id_patient_id_idx" ON "chemotherapy_cycles"("tenant_id", "patient_id");
CREATE INDEX "chemotherapy_cycles_protocol_id_idx" ON "chemotherapy_cycles"("protocol_id");
CREATE INDEX "billing_appeals_tenant_id_status_idx" ON "billing_appeals"("tenant_id", "status");
CREATE INDEX "billing_appeals_billing_entry_id_idx" ON "billing_appeals"("billing_entry_id");
CREATE INDEX "clinical_protocols_tenant_id_is_active_idx" ON "clinical_protocols"("tenant_id", "is_active");
CREATE INDEX "clinical_protocols_category_idx" ON "clinical_protocols"("category");
CREATE INDEX "drugs_tenant_id_idx" ON "drugs"("tenant_id");
CREATE INDEX "drugs_active_ingredient_idx" ON "drugs"("active_ingredient");
CREATE INDEX "drugs_atc_code_idx" ON "drugs"("atc_code");
CREATE INDEX "drugs_name_idx" ON "drugs"("name");
CREATE UNIQUE INDEX "drug_interactions_drug1_id_drug2_id_key" ON "drug_interactions"("drug1_id", "drug2_id");
CREATE INDEX "drug_interactions_drug1_id_idx" ON "drug_interactions"("drug1_id");
CREATE INDEX "drug_interactions_drug2_id_idx" ON "drug_interactions"("drug2_id");

-- AddForeignKeys
ALTER TABLE "chemotherapy_protocols" ADD CONSTRAINT "chemotherapy_protocols_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chemotherapy_cycles" ADD CONSTRAINT "chemotherapy_cycles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chemotherapy_cycles" ADD CONSTRAINT "chemotherapy_cycles_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chemotherapy_cycles" ADD CONSTRAINT "chemotherapy_cycles_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "chemotherapy_cycles" ADD CONSTRAINT "chemotherapy_cycles_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "chemotherapy_protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_appeals" ADD CONSTRAINT "billing_appeals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_appeals" ADD CONSTRAINT "billing_appeals_billing_entry_id_fkey" FOREIGN KEY ("billing_entry_id") REFERENCES "billing_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_appeals" ADD CONSTRAINT "billing_appeals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_protocols" ADD CONSTRAINT "clinical_protocols_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "drugs" ADD CONSTRAINT "drugs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_drug1_id_fkey" FOREIGN KEY ("drug1_id") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_drug2_id_fkey" FOREIGN KEY ("drug2_id") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
