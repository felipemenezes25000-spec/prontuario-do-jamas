-- CreateTable
CREATE TABLE "exam_catalogs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "exam_type" "ExamType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_catalogs_code_key" ON "exam_catalogs"("code");

-- CreateIndex
CREATE INDEX "exam_catalogs_tenant_id_exam_type_idx" ON "exam_catalogs"("tenant_id", "exam_type");

-- CreateIndex
CREATE INDEX "exam_catalogs_name_idx" ON "exam_catalogs"("name");

-- CreateIndex
CREATE INDEX "exam_catalogs_code_idx" ON "exam_catalogs"("code");

-- AddForeignKey
ALTER TABLE "exam_catalogs" ADD CONSTRAINT "exam_catalogs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
