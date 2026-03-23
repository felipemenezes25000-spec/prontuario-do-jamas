-- CreateTable
CREATE TABLE "clinical_alert_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "value2" DOUBLE PRECISION,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "message" TEXT NOT NULL,
    "action" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursing_handoffs" (
    "id" TEXT NOT NULL,
    "sector_id" TEXT,
    "from_nurse_id" TEXT NOT NULL,
    "to_nurse_id" TEXT NOT NULL,
    "patients" JSONB NOT NULL,
    "shift" TEXT,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nursing_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinical_alert_rules_tenant_id_is_active_idx" ON "clinical_alert_rules"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "clinical_alert_rules_field_idx" ON "clinical_alert_rules"("field");

-- CreateIndex
CREATE INDEX "nursing_handoffs_tenant_id_idx" ON "nursing_handoffs"("tenant_id");

-- CreateIndex
CREATE INDEX "nursing_handoffs_from_nurse_id_idx" ON "nursing_handoffs"("from_nurse_id");

-- CreateIndex
CREATE INDEX "nursing_handoffs_to_nurse_id_idx" ON "nursing_handoffs"("to_nurse_id");

-- CreateIndex
CREATE INDEX "nursing_handoffs_created_at_idx" ON "nursing_handoffs"("created_at");

-- AddForeignKey
ALTER TABLE "clinical_alert_rules" ADD CONSTRAINT "clinical_alert_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_handoffs" ADD CONSTRAINT "nursing_handoffs_from_nurse_id_fkey" FOREIGN KEY ("from_nurse_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_handoffs" ADD CONSTRAINT "nursing_handoffs_to_nurse_id_fkey" FOREIGN KEY ("to_nurse_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_handoffs" ADD CONSTRAINT "nursing_handoffs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
