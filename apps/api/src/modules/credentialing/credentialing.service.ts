import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CredentialStatus,
  CredentialType,
  CredentialResponseDto,
  ExpiringCredentialsResponseDto,
  CrmVerificationResponseDto,
} from './dto/credentialing.dto';

interface Credential {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  type: CredentialType;
  number: string;
  state?: string;
  issuingBody?: string;
  status: CredentialStatus;
  issuedAt: Date;
  expiresAt?: Date;
  specialty?: string;
  documentUrl?: string;
  lastVerifiedAt?: Date;
  createdAt: Date;
}

@Injectable()
export class CredentialingService {
  private readonly logger = new Logger(CredentialingService.name);
  private readonly credentials = new Map<string, Credential>();

  async register(
    tenantId: string,
    dto: {
      userId: string;
      type: CredentialType;
      number: string;
      state?: string;
      issuingBody?: string;
      issuedAt: string;
      expiresAt?: string;
      specialty?: string;
      documentUrl?: string;
    },
  ): Promise<CredentialResponseDto> {
    const cred: Credential = {
      id: randomUUID(),
      tenantId,
      userId: dto.userId,
      userName: 'Profissional (stub)',
      type: dto.type,
      number: dto.number,
      state: dto.state,
      issuingBody: dto.issuingBody,
      status: CredentialStatus.PENDING_VERIFICATION,
      issuedAt: new Date(dto.issuedAt),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      specialty: dto.specialty,
      documentUrl: dto.documentUrl,
      createdAt: new Date(),
    };
    this.credentials.set(cred.id, cred);
    this.logger.log(`Credential registered: ${cred.type} ${cred.number}`);
    return this.toResponse(cred);
  }

  async list(tenantId: string): Promise<CredentialResponseDto[]> {
    return Array.from(this.credentials.values())
      .filter((c) => c.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((c) => this.toResponse(c));
  }

  async getById(tenantId: string, id: string): Promise<CredentialResponseDto> {
    const cred = this.credentials.get(id);
    if (!cred || cred.tenantId !== tenantId) {
      throw new NotFoundException(`Credential ${id} not found`);
    }
    return this.toResponse(cred);
  }

  async update(
    tenantId: string,
    id: string,
    dto: { status?: CredentialStatus; expiresAt?: string; documentUrl?: string; notes?: string },
  ): Promise<CredentialResponseDto> {
    const cred = this.credentials.get(id);
    if (!cred || cred.tenantId !== tenantId) {
      throw new NotFoundException(`Credential ${id} not found`);
    }
    if (dto.status) cred.status = dto.status;
    if (dto.expiresAt) cred.expiresAt = new Date(dto.expiresAt);
    if (dto.documentUrl) cred.documentUrl = dto.documentUrl;
    return this.toResponse(cred);
  }

  async getExpiring(_tenantId: string): Promise<ExpiringCredentialsResponseDto> {
    return {
      credentials: [
        {
          credentialId: randomUUID(),
          userId: randomUUID(),
          userName: 'Dr. Carlos Mendes',
          type: CredentialType.CRM,
          number: 'CRM-SP 123456',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          daysUntilExpiry: 30,
        },
        {
          credentialId: randomUUID(),
          userId: randomUUID(),
          userName: 'Enf. Maria Santos',
          type: CredentialType.BLS_ACLS,
          number: 'ACLS-2024-7890',
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          daysUntilExpiry: 15,
        },
      ],
      totalExpiring: 2,
    };
  }

  async verifyCrm(
    tenantId: string,
    credentialId: string,
  ): Promise<CrmVerificationResponseDto> {
    const cred = this.credentials.get(credentialId);
    if (!cred || cred.tenantId !== tenantId) {
      throw new NotFoundException(`Credential ${credentialId} not found`);
    }

    // Stub — in production would call CFM API
    cred.status = CredentialStatus.ACTIVE;
    cred.lastVerifiedAt = new Date();

    this.logger.log(`CRM verified: ${cred.number}`);

    return {
      credentialId: cred.id,
      crmNumber: cred.number,
      verified: true,
      doctorName: cred.userName,
      specialty: cred.specialty ?? 'Clínica Geral',
      status: 'Ativo',
      verifiedAt: new Date(),
    };
  }

  private toResponse(cred: Credential): CredentialResponseDto {
    return {
      id: cred.id,
      userId: cred.userId,
      userName: cred.userName,
      type: cred.type,
      number: cred.number,
      state: cred.state,
      issuingBody: cred.issuingBody,
      status: cred.status,
      issuedAt: cred.issuedAt,
      expiresAt: cred.expiresAt,
      specialty: cred.specialty,
      documentUrl: cred.documentUrl,
      lastVerifiedAt: cred.lastVerifiedAt,
      createdAt: cred.createdAt,
    };
  }
}
