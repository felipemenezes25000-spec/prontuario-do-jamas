-- Add NEWS score fields to vital_signs
ALTER TABLE "vital_signs" ADD COLUMN "news_score" INTEGER;
ALTER TABLE "vital_signs" ADD COLUMN "news_classification" TEXT;

-- Add signature block to clinical_notes
ALTER TABLE "clinical_notes" ADD COLUMN "signature_block" TEXT;
