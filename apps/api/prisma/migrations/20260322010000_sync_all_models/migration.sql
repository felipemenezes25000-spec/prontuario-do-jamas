-- CreateEnum
CREATE TYPE "LegalBasis" AS ENUM ('CONSENT', 'LEGAL_OBLIGATION', 'PUBLIC_POLICY', 'RESEARCH_BASIS', 'CONTRACT', 'LEGITIMATE_INTEREST', 'HEALTH_PROTECTION', 'LIFE_PROTECTION');

-- CreateEnum
CREATE TYPE "DataCategory" AS ENUM ('PERSONAL_IDENTIFICATION', 'HEALTH_RECORDS', 'VOICE_RECORDINGS', 'PRESCRIPTIONS', 'LAB_RESULTS', 'IMAGING', 'BILLING', 'AUDIT_LOGS');

-- CreateEnum
CREATE TYPE "DataAccessAction" AS ENUM ('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'PRINT', 'SHARE');

-- CreateEnum
CREATE TYPE "AnonymizationStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SignatureType" AS ENUM ('CLINICAL_NOTE', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'LAB_RESULT', 'SURGICAL_REPORT', 'MEDICAL_CERTIFICATE');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('ICP_BRASIL_A1', 'ICP_BRASIL_A3', 'CLOUD_CERTIFICATE');

-- CreateEnum
CREATE TYPE "SignatureStandard" AS ENUM ('CADES_BES', 'CADES_T', 'PADES_B', 'XADES_BES');

-- AlterEnum
ALTER TYPE "ConsentType" ADD VALUE 'DATA_COLLECTION';
ALTER TYPE "ConsentType" ADD VALUE 'DATA_PROCESSING';
ALTER TYPE "ConsentType" ADD VALUE 'VOICE_RECORDING';
ALTER TYPE "ConsentType" ADD VALUE 'AI_PROCESSING';

-- AlterTable
ALTER TABLE "consent_records" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "legal_basis" "LegalBasis" NOT NULL DEFAULT 'CONSENT',
ADD COLUMN     "purpose" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_agent" TEXT,
ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "sso_auto_provision" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sso_config" JSONB,
ADD COLUMN     "sso_domain" TEXT,
ADD COLUMN     "sso_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sso_provider" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "oauth_profile_data" JSONB,
ADD COLUMN     "oauth_provider" TEXT,
ADD COLUMN     "oauth_provider_id" TEXT;

-- CreateTable
CREATE TABLE "data_retention_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "data_category" "DataCategory" NOT NULL,
    "retention_years" INTEGER NOT NULL,
    "legal_basis" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_access_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "action" "DataAccessAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "purpose" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anonymization_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "status" "AnonymizationStatus" NOT NULL,
    "data_categories" TEXT[],
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anonymization_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_signatures" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "document_id" TEXT,
    "clinical_note_id" TEXT,
    "prescription_id" TEXT,
    "signer_id" TEXT NOT NULL,
    "signature_type" "SignatureType" NOT NULL,
    "certificate_type" "CertificateType" NOT NULL,
    "certificate_subject" TEXT NOT NULL,
    "certificate_issuer" TEXT NOT NULL,
    "certificate_serial" TEXT NOT NULL,
    "certificate_not_before" TIMESTAMP(3) NOT NULL,
    "certificate_not_after" TIMESTAMP(3) NOT NULL,
    "signature_hash" TEXT NOT NULL,
    "signature_value" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verification_chain" TEXT,
    "signature_standard" "SignatureStandard" NOT NULL,
    "timestamp_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_retention_policies_tenant_id_data_category_key" ON "data_retention_policies"("tenant_id", "data_category");

-- CreateIndex
CREATE INDEX "data_access_logs_tenant_id_idx" ON "data_access_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "data_access_logs_patient_id_idx" ON "data_access_logs"("patient_id");

-- CreateIndex
CREATE INDEX "data_access_logs_user_id_idx" ON "data_access_logs"("user_id");

-- CreateIndex
CREATE INDEX "data_access_logs_created_at_idx" ON "data_access_logs"("created_at");

-- CreateIndex
CREATE INDEX "anonymization_logs_tenant_id_idx" ON "anonymization_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "anonymization_logs_patient_id_idx" ON "anonymization_logs"("patient_id");

-- CreateIndex
CREATE INDEX "digital_signatures_tenant_id_idx" ON "digital_signatures"("tenant_id");

-- CreateIndex
CREATE INDEX "digital_signatures_document_id_idx" ON "digital_signatures"("document_id");

-- CreateIndex
CREATE INDEX "digital_signatures_clinical_note_id_idx" ON "digital_signatures"("clinical_note_id");

-- CreateIndex
CREATE INDEX "digital_signatures_prescription_id_idx" ON "digital_signatures"("prescription_id");

-- CreateIndex
CREATE INDEX "digital_signatures_signer_id_idx" ON "digital_signatures"("signer_id");

-- CreateIndex
CREATE INDEX "consent_records_tenant_id_idx" ON "consent_records"("tenant_id");

-- CreateIndex
CREATE INDEX "consent_records_type_idx" ON "consent_records"("type");

-- CreateIndex
CREATE INDEX "tenants_sso_domain_idx" ON "tenants"("sso_domain");

-- CreateIndex
CREATE UNIQUE INDEX "users_oauth_provider_oauth_provider_id_key" ON "users"("oauth_provider", "oauth_provider_id");

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_retention_policies" ADD CONSTRAINT "data_retention_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "clinical_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_clinical_note_id_fkey" FOREIGN KEY ("clinical_note_id") REFERENCES "clinical_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_signer_id_fkey" FOREIGN KEY ("signer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
