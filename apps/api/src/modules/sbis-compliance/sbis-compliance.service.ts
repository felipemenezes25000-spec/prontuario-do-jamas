import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ComplianceLevel,
  ComplianceStatus,
  SbisChecklistResponseDto,
  SbisStatusResponseDto,
  ComplianceGapsResponseDto,
  CfmResolutionsResponseDto,
  EvidenceResponseDto,
} from './dto/sbis-compliance.dto';

@Injectable()
export class SbisComplianceService {
  private readonly logger = new Logger(SbisComplianceService.name);

  async getChecklist(_tenantId: string): Promise<SbisChecklistResponseDto> {
    return {
      items: [
        {
          requirementId: 'NGS1-SEG-001',
          category: 'Segurança',
          requirement: 'Autenticação de usuários com controle de acesso baseado em perfis',
          level: ComplianceLevel.NGS1,
          status: ComplianceStatus.COMPLIANT,
          lastVerifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          mandatory: true,
        },
        {
          requirementId: 'NGS1-SEG-002',
          category: 'Segurança',
          requirement: 'Trilha de auditoria com registro de todas as ações do usuário',
          level: ComplianceLevel.NGS1,
          status: ComplianceStatus.COMPLIANT,
          lastVerifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          mandatory: true,
        },
        {
          requirementId: 'NGS1-SEG-003',
          category: 'Segurança',
          requirement: 'Backup e recuperação de dados com periodicidade mínima diária',
          level: ComplianceLevel.NGS1,
          status: ComplianceStatus.COMPLIANT,
          mandatory: true,
        },
        {
          requirementId: 'NGS2-CERT-001',
          category: 'Certificação Digital',
          requirement: 'Assinatura digital ICP-Brasil para documentos clínicos',
          level: ComplianceLevel.NGS2,
          status: ComplianceStatus.COMPLIANT,
          mandatory: true,
        },
        {
          requirementId: 'NGS2-CERT-002',
          category: 'Certificação Digital',
          requirement: 'Carimbo de tempo (timestamp) em documentos assinados',
          level: ComplianceLevel.NGS2,
          status: ComplianceStatus.PARTIALLY_COMPLIANT,
          mandatory: true,
        },
        {
          requirementId: 'NGS1-EST-001',
          category: 'Estrutura',
          requirement: 'Uso de terminologias padronizadas (CID-10, TUSS, TISS)',
          level: ComplianceLevel.NGS1,
          status: ComplianceStatus.COMPLIANT,
          mandatory: true,
        },
        {
          requirementId: 'NGS1-FUNC-001',
          category: 'Funcionalidade',
          requirement: 'Prontuário orientado a problemas com SOAP',
          level: ComplianceLevel.NGS1,
          status: ComplianceStatus.COMPLIANT,
          mandatory: false,
        },
        {
          requirementId: 'NGS2-GED-001',
          category: 'GED',
          requirement: 'Gestão eletrônica de documentos com versionamento',
          level: ComplianceLevel.NGS2,
          status: ComplianceStatus.NON_COMPLIANT,
          mandatory: false,
        },
      ],
      totalRequirements: 8,
      compliantCount: 5,
      targetLevel: ComplianceLevel.NGS2,
    };
  }

  async getStatus(_tenantId: string): Promise<SbisStatusResponseDto> {
    return {
      currentLevel: 'NGS1',
      targetLevel: 'NGS2',
      overallCompliance: 0.75,
      mandatoryCompliance: 0.83,
      totalRequirements: 42,
      compliant: 30,
      partiallyCompliant: 5,
      nonCompliant: 7,
      lastAuditDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      nextAuditDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    };
  }

  async submitEvidence(
    _tenantId: string,
    userId: string,
    requirementId: string,
    description: string,
    documentUrl?: string,
    _notes?: string,
  ): Promise<EvidenceResponseDto> {
    this.logger.log(`Evidence submitted for requirement ${requirementId}`);
    return {
      id: randomUUID(),
      requirementId,
      description,
      documentUrl,
      submittedById: userId,
      submittedAt: new Date(),
    };
  }

  async getGaps(_tenantId: string): Promise<ComplianceGapsResponseDto> {
    return {
      gaps: [
        {
          requirementId: 'NGS2-CERT-002',
          requirement: 'Carimbo de tempo (timestamp) em documentos assinados',
          category: 'Certificação Digital',
          severity: 'HIGH',
          recommendation: 'Integrar com autoridade de carimbo de tempo ICP-Brasil',
          estimatedEffort: '2 semanas',
        },
        {
          requirementId: 'NGS2-GED-001',
          requirement: 'Gestão eletrônica de documentos com versionamento',
          category: 'GED',
          severity: 'MEDIUM',
          recommendation: 'Implementar sistema de versionamento para documentos clínicos',
          estimatedEffort: '4 semanas',
        },
      ],
      totalGaps: 7,
      criticalGaps: 2,
    };
  }

  async getCfmResolutions(_tenantId: string): Promise<CfmResolutionsResponseDto> {
    return {
      resolutions: [
        {
          resolutionNumber: 'CFM 1.821/2007',
          description: 'Normas técnicas para uso de sistemas informatizados para guarda e manuseio do prontuário',
          status: ComplianceStatus.COMPLIANT,
          details: 'Sistema atende requisitos de segurança, integridade e disponibilidade',
          lastReviewedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        },
        {
          resolutionNumber: 'CFM 2.217/2018',
          description: 'Regulamenta a telemedicina no Brasil',
          status: ComplianceStatus.COMPLIANT,
          details: 'Módulo de telemedicina com consentimento, gravação e assinatura digital',
        },
        {
          resolutionNumber: 'CFM 2.218/2018',
          description: 'Prontuário médico eletrônico — requisitos mínimos',
          status: ComplianceStatus.PARTIALLY_COMPLIANT,
          details: 'Pendente: carimbo de tempo ICP-Brasil em todas as assinaturas',
        },
        {
          resolutionNumber: 'CFM 2.314/2022',
          description: 'Atualização da regulamentação de telemedicina',
          status: ComplianceStatus.COMPLIANT,
        },
      ],
      overallCompliance: 0.85,
    };
  }
}
