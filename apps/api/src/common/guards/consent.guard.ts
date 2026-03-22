import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentType } from '@prisma/client';
import { REQUIRES_CONSENT_KEY } from '../decorators/requires-consent.decorator';

/**
 * Consent Guard — LGPD Art. 7, I / Art. 8
 *
 * Checks whether a patient has active consent for the required consent type
 * before allowing the request to proceed.
 *
 * The patientId is extracted from request params or body.
 * If no consent is found, returns HTTP 403 with a clear message in Portuguese.
 */
@Injectable()
export class ConsentGuard implements CanActivate {
  private readonly logger = new Logger(ConsentGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredConsent = this.reflector.getAllAndOverride<
      ConsentType | undefined
    >(REQUIRES_CONSENT_KEY, [context.getHandler(), context.getClass()]);

    // If no @RequiresConsent decorator, allow through
    if (!requiredConsent) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const { params, body } = request;

    // Extract patientId from multiple possible locations
    const patientId: string | undefined =
      params?.patientId ?? body?.patientId ?? params?.id;

    if (!patientId) {
      this.logger.warn(
        `ConsentGuard: Could not extract patientId from request for consent type ${requiredConsent}`,
      );
      throw new ForbiddenException(
        'Nao foi possivel verificar o consentimento: ID do paciente nao encontrado na requisicao',
      );
    }

    const tenantId: string | undefined = user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException(
        'Nao foi possivel verificar o consentimento: tenant nao identificado',
      );
    }

    // Check for active, non-revoked, non-expired consent
    const consent = await this.prisma.consentRecord.findFirst({
      where: {
        patientId,
        tenantId,
        type: requiredConsent,
        granted: true,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!consent) {
      const consentTypeLabels: Record<string, string> = {
        VOICE_RECORDING: 'gravacao de voz',
        AI_PROCESSING: 'processamento por inteligencia artificial',
        DATA_COLLECTION: 'coleta de dados',
        DATA_PROCESSING: 'processamento de dados',
        DATA_SHARING: 'compartilhamento de dados',
        RESEARCH: 'pesquisa',
        MARKETING: 'marketing',
        RECORDING: 'gravacao',
        LGPD_GENERAL: 'tratamento geral de dados',
        LGPD_SENSITIVE: 'tratamento de dados sensiveis',
        TELEMEDICINE: 'telemedicina',
        TREATMENT: 'tratamento medico',
      };

      const label = consentTypeLabels[requiredConsent] ?? requiredConsent;

      throw new ForbiddenException(
        `Consentimento obrigatorio ausente: o paciente nao possui consentimento ativo para ${label}. ` +
          `Registre o consentimento antes de prosseguir (LGPD Art. 7, I / Art. 8).`,
      );
    }

    return true;
  }
}
