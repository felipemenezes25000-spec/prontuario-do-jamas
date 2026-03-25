import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  StartBulkExportDto,
  BulkExportType,
  BulkExportStatus,
} from './dto/bulk-fhir.dto';

export interface BulkExportJob {
  id: string;
  tenantId: string;
  exportType: string;
  resourceTypes: string[];
  since: Date | null;
  outputFormat: string;
  status: string;
  progress: number;
  totalResources: number;
  outputFiles: Array<{ type: string; url: string; count: number }>;
  requestedById: string;
  startedAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
}

@Injectable()
export class BulkFhirService {
  private jobs: BulkExportJob[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async startExport(tenantId: string, userId: string, dto: StartBulkExportDto) {
    const resourceTypes = dto.resourceTypes ?? [
      'Patient', 'Encounter', 'Observation', 'Condition',
      'MedicationRequest', 'AllergyIntolerance', 'DiagnosticReport',
    ];

    const job: BulkExportJob = {
      id: crypto.randomUUID(),
      tenantId,
      exportType: dto.exportType ?? BulkExportType.SYSTEM,
      resourceTypes,
      since: dto.since ? new Date(dto.since) : null,
      outputFormat: dto.outputFormat ?? 'application/fhir+ndjson',
      status: BulkExportStatus.QUEUED,
      progress: 0,
      totalResources: 0,
      outputFiles: [],
      requestedById: userId,
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    };

    this.jobs.push(job);

    // Simulate async export processing
    this.processExport(tenantId, job).catch(() => {
      job.status = BulkExportStatus.FAILED;
      job.errorMessage = 'Export processing failed';
    });

    return {
      jobId: job.id,
      status: job.status,
      message: 'Bulk export job queued. Poll status at GET /interop/bulk-fhir/export/:jobId',
      contentLocation: `/interop/bulk-fhir/export/${job.id}`,
    };
  }

  private async processExport(tenantId: string, job: BulkExportJob): Promise<void> {
    job.status = BulkExportStatus.IN_PROGRESS;
    job.progress = 10;

    // Count resources
    const counts: Record<string, number> = {};

    if (job.resourceTypes.includes('Patient')) {
      counts.Patient = await this.prisma.patient.count({ where: { tenantId } });
    }
    if (job.resourceTypes.includes('Encounter')) {
      counts.Encounter = await this.prisma.encounter.count({ where: { tenantId } });
    }
    if (job.resourceTypes.includes('Observation')) {
      counts.Observation = await this.prisma.vitalSigns.count({
        where: { patient: { tenantId } },
      });
    }
    if (job.resourceTypes.includes('Condition')) {
      counts.Condition = await this.prisma.chronicCondition.count({
        where: { patient: { tenantId } },
      });
    }
    if (job.resourceTypes.includes('AllergyIntolerance')) {
      counts.AllergyIntolerance = await this.prisma.allergy.count({
        where: { patient: { tenantId } },
      });
    }
    if (job.resourceTypes.includes('DiagnosticReport')) {
      counts.DiagnosticReport = await this.prisma.examResult.count({
        where: { patient: { tenantId } },
      });
    }
    if (job.resourceTypes.includes('MedicationRequest')) {
      counts.MedicationRequest = await this.prisma.prescription.count({
        where: { tenantId },
      });
    }

    job.progress = 50;

    let totalResources = 0;
    const outputFiles: BulkExportJob['outputFiles'] = [];

    for (const [resourceType, count] of Object.entries(counts)) {
      if (count > 0) {
        outputFiles.push({
          type: resourceType,
          url: `/interop/bulk-fhir/export/${job.id}/download?type=${resourceType}`,
          count,
        });
        totalResources += count;
      }
    }

    job.totalResources = totalResources;
    job.outputFiles = outputFiles;
    job.progress = 100;
    job.status = BulkExportStatus.COMPLETED;
    job.completedAt = new Date();
  }

  async getExportStatus(tenantId: string, jobId: string) {
    const job = this.jobs.find((j) => j.id === jobId && j.tenantId === tenantId);
    if (!job) {
      throw new NotFoundException(`Export job "${jobId}" not found`);
    }

    if (job.status === BulkExportStatus.COMPLETED) {
      return {
        transactionTime: job.completedAt?.toISOString(),
        request: `/interop/bulk-fhir/export/${job.id}`,
        requiresAccessToken: true,
        output: job.outputFiles,
        error: [],
      };
    }

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      exportType: job.exportType,
      resourceTypes: job.resourceTypes,
      startedAt: job.startedAt.toISOString(),
      errorMessage: job.errorMessage,
      retryAfter: job.status === BulkExportStatus.IN_PROGRESS ? 5 : undefined,
    };
  }

  async downloadExport(tenantId: string, jobId: string, resourceType?: string) {
    const job = this.jobs.find((j) => j.id === jobId && j.tenantId === tenantId);
    if (!job) {
      throw new NotFoundException(`Export job "${jobId}" not found`);
    }

    if (job.status !== BulkExportStatus.COMPLETED) {
      throw new BadRequestException(`Export job is not yet completed. Status: ${job.status}`);
    }

    // Return NDJSON-compatible summary (in production, would return actual file download)
    const files = resourceType
      ? job.outputFiles.filter((f) => f.type === resourceType)
      : job.outputFiles;

    return {
      jobId: job.id,
      format: job.outputFormat,
      files: files.map((f) => ({
        type: f.type,
        count: f.count,
        url: f.url,
        sampleEntry: {
          resourceType: f.type,
          id: 'sample-id',
          meta: { lastUpdated: new Date().toISOString() },
        },
      })),
      message: 'In production, this would return NDJSON file streams. Currently returning metadata.',
    };
  }

  async cancelExport(tenantId: string, jobId: string) {
    const job = this.jobs.find((j) => j.id === jobId && j.tenantId === tenantId);
    if (!job) {
      throw new NotFoundException(`Export job "${jobId}" not found`);
    }

    if (job.status === BulkExportStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed export');
    }

    job.status = BulkExportStatus.CANCELLED;
    return { message: `Export job "${jobId}" cancelled` };
  }
}
