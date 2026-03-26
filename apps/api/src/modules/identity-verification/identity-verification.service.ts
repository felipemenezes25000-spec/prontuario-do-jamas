import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VerifyIdentityDto, VerificationType } from './identity-verification.dto';

export interface LivenessResult {
  isLive: boolean;
  confidence: number;
  antiSpoofScore: number;
}

export interface FaceMatchResult {
  isMatch: boolean;
  similarity: number;
  threshold: number;
}

export interface VerificationResult {
  id: string;
  patientId: string;
  verificationType: VerificationType;
  liveness: LivenessResult | null;
  faceMatch: FaceMatchResult | null;
  overallStatus: 'VERIFIED' | 'FAILED' | 'NEEDS_REVIEW';
  verifiedAt: string;
  documentId: string;
}

export interface VerificationStatus {
  patientId: string;
  isVerified: boolean;
  lastVerification: VerificationResult | null;
  verificationCount: number;
}

@Injectable()
export class IdentityVerificationService {
  private readonly logger = new Logger(IdentityVerificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async verifyIdentity(
    tenantId: string,
    userId: string,
    dto: VerifyIdentityDto,
  ): Promise<VerificationResult> {
    this.logger.log(
      `Identity verification (${dto.verificationType}) for patient ${dto.patientId}`,
    );

    // NOTE: Production would use AWS Rekognition, Azure Face API, or FaceTec
    let liveness: LivenessResult | null = null;
    let faceMatch: FaceMatchResult | null = null;

    if (
      dto.verificationType === VerificationType.LIVENESS_CHECK ||
      dto.verificationType === VerificationType.FULL_VERIFICATION
    ) {
      liveness = this.simulateLivenessCheck();
    }

    if (
      dto.verificationType === VerificationType.FACE_MATCH ||
      dto.verificationType === VerificationType.FULL_VERIFICATION
    ) {
      faceMatch = this.simulateFaceMatch();
    }

    const overallStatus = this.determineOverallStatus(
      dto.verificationType,
      liveness,
      faceMatch,
    );

    const verificationId = crypto.randomUUID();

    // Store result in ClinicalDocument with [IDENTITY_VERIFY] prefix
    const document = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        authorId: userId,
        tenantId,
        type: 'CUSTOM',
        title: `[IDENTITY_VERIFY] ${this.getVerificationLabel(dto.verificationType)}`,
        content: JSON.stringify({
          verificationId,
          verificationType: dto.verificationType,
          liveness,
          faceMatch,
          overallStatus,
          verifiedAt: new Date().toISOString(),
          // selfie/document images not stored — only metadata
          selfieHash: this.simulateHash(dto.selfieBase64),
          documentPhotoHash: dto.documentPhotoBase64
            ? this.simulateHash(dto.documentPhotoBase64)
            : null,
        }),
        generatedByAI: true,
      },
    });

    return {
      id: verificationId,
      patientId: dto.patientId,
      verificationType: dto.verificationType,
      liveness,
      faceMatch,
      overallStatus,
      verifiedAt: new Date().toISOString(),
      documentId: document.id,
    };
  }

  async getVerificationHistory(
    tenantId: string,
    patientId: string,
  ): Promise<VerificationResult[]> {
    const documents = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[IDENTITY_VERIFY]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((doc) => {
      const content = doc.content
        ? (JSON.parse(doc.content) as {
            verificationId: string;
            verificationType: VerificationType;
            liveness: LivenessResult | null;
            faceMatch: FaceMatchResult | null;
            overallStatus: 'VERIFIED' | 'FAILED' | 'NEEDS_REVIEW';
            verifiedAt: string;
          })
        : null;

      return {
        id: content?.verificationId ?? doc.id,
        patientId: doc.patientId,
        verificationType: content?.verificationType ?? VerificationType.LIVENESS_CHECK,
        liveness: content?.liveness ?? null,
        faceMatch: content?.faceMatch ?? null,
        overallStatus: content?.overallStatus ?? 'FAILED',
        verifiedAt: content?.verifiedAt ?? doc.createdAt.toISOString(),
        documentId: doc.id,
      };
    });
  }

  async getVerificationStatus(
    tenantId: string,
    patientId: string,
  ): Promise<VerificationStatus> {
    const history = await this.getVerificationHistory(tenantId, patientId);
    const latest = history.length > 0 ? history[0] : null;

    return {
      patientId,
      isVerified: latest?.overallStatus === 'VERIFIED',
      lastVerification: latest,
      verificationCount: history.length,
    };
  }

  private simulateLivenessCheck(): LivenessResult {
    const isLive = Math.random() > 0.15; // 85% chance of being live
    return {
      isLive,
      confidence: parseFloat((0.80 + Math.random() * 0.19).toFixed(2)),
      antiSpoofScore: parseFloat((isLive ? 0.75 + Math.random() * 0.24 : 0.10 + Math.random() * 0.30).toFixed(2)),
    };
  }

  private simulateFaceMatch(): FaceMatchResult {
    const similarity = parseFloat((0.70 + Math.random() * 0.29).toFixed(2));
    const threshold = 0.85;
    return {
      isMatch: similarity >= threshold,
      similarity,
      threshold,
    };
  }

  private determineOverallStatus(
    type: VerificationType,
    liveness: LivenessResult | null,
    faceMatch: FaceMatchResult | null,
  ): 'VERIFIED' | 'FAILED' | 'NEEDS_REVIEW' {
    if (type === VerificationType.LIVENESS_CHECK) {
      if (!liveness) return 'FAILED';
      return liveness.isLive ? 'VERIFIED' : 'FAILED';
    }

    if (type === VerificationType.FACE_MATCH) {
      if (!faceMatch) return 'FAILED';
      return faceMatch.isMatch ? 'VERIFIED' : 'FAILED';
    }

    // FULL_VERIFICATION
    if (!liveness || !faceMatch) return 'FAILED';
    if (liveness.isLive && faceMatch.isMatch) return 'VERIFIED';
    if (liveness.isLive || faceMatch.isMatch) return 'NEEDS_REVIEW';
    return 'FAILED';
  }

  private getVerificationLabel(type: VerificationType): string {
    const labels: Record<VerificationType, string> = {
      [VerificationType.LIVENESS_CHECK]: 'Verificação de Vivacidade',
      [VerificationType.FACE_MATCH]: 'Comparação Facial',
      [VerificationType.FULL_VERIFICATION]: 'Verificação Completa',
    };
    return labels[type];
  }

  private simulateHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < Math.min(data.length, 100); i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}`;
  }
}
