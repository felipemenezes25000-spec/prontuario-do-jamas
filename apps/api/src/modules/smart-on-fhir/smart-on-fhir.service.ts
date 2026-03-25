import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterSmartAppDto, SmartLaunchDto } from './dto/smart-on-fhir.dto';

export interface SmartApp {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string | null;
  redirectUris: string[];
  launchUrl: string;
  scopes: string[];
  description: string | null;
  logoUrl: string | null;
  vendor: string | null;
  tenantId: string;
  isActive: boolean;
  registeredById: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SmartOnFhirService {
  private apps: SmartApp[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async registerApp(tenantId: string, userId: string, dto: RegisterSmartAppDto) {
    const existingApp = this.apps.find(
      (a) => a.clientId === dto.clientId && a.tenantId === tenantId,
    );
    if (existingApp) {
      throw new BadRequestException(`App with clientId "${dto.clientId}" already registered`);
    }

    const app: SmartApp = {
      id: crypto.randomUUID(),
      name: dto.name,
      clientId: dto.clientId,
      clientSecret: dto.clientSecret ?? null,
      redirectUris: dto.redirectUris,
      launchUrl: dto.launchUrl,
      scopes: dto.scopes,
      description: dto.description ?? null,
      logoUrl: dto.logoUrl ?? null,
      vendor: dto.vendor ?? null,
      tenantId,
      isActive: true,
      registeredById: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.apps.push(app);
    return app;
  }

  async listApps(tenantId: string) {
    return this.apps
      .filter((a) => a.tenantId === tenantId && a.isActive)
      .map((a) => ({
        id: a.id,
        name: a.name,
        clientId: a.clientId,
        launchUrl: a.launchUrl,
        scopes: a.scopes,
        description: a.description,
        logoUrl: a.logoUrl,
        vendor: a.vendor,
        createdAt: a.createdAt,
      }));
  }

  async launchApp(tenantId: string, userId: string, dto: SmartLaunchDto) {
    const app = this.apps.find((a) => a.id === dto.appId && a.tenantId === tenantId);
    if (!app) {
      throw new NotFoundException(`SMART app "${dto.appId}" not found`);
    }

    if (!app.isActive) {
      throw new BadRequestException('App is not active');
    }

    // Generate launch context token
    const launchToken = crypto.randomUUID();

    // Build FHIR server metadata
    const fhirServerUrl = '/fhir/r4';

    // Build launch URL with parameters
    const launchParams = new URLSearchParams({
      launch: launchToken,
      iss: fhirServerUrl,
    });

    const context: Record<string, string> = {};
    if (dto.patientId) {
      context.patient = dto.patientId;
      // Validate patient exists
      const patient = await this.prisma.patient.findFirst({
        where: { id: dto.patientId, tenantId },
      });
      if (!patient) {
        throw new NotFoundException(`Patient "${dto.patientId}" not found`);
      }
    }
    if (dto.encounterId) {
      context.encounter = dto.encounterId;
    }

    return {
      launchUrl: `${app.launchUrl}?${launchParams.toString()}`,
      launchToken,
      fhirServerUrl,
      context,
      app: {
        id: app.id,
        name: app.name,
        scopes: app.scopes,
      },
      tokenEndpoint: `${fhirServerUrl}/auth/token`,
      authorizationEndpoint: `${fhirServerUrl}/auth/authorize`,
    };
  }

  async unregisterApp(tenantId: string, appId: string) {
    const app = this.apps.find((a) => a.id === appId && a.tenantId === tenantId);
    if (!app) {
      throw new NotFoundException(`SMART app "${appId}" not found`);
    }

    app.isActive = false;
    app.updatedAt = new Date();

    return { message: `App "${app.name}" unregistered successfully` };
  }

  async getAppContext(tenantId: string, appId: string) {
    const app = this.apps.find((a) => a.id === appId && a.tenantId === tenantId);
    if (!app) {
      throw new NotFoundException(`SMART app "${appId}" not found`);
    }

    return {
      app: {
        id: app.id,
        name: app.name,
        clientId: app.clientId,
        scopes: app.scopes,
        launchUrl: app.launchUrl,
        redirectUris: app.redirectUris,
      },
      smartConfiguration: {
        authorization_endpoint: '/fhir/r4/auth/authorize',
        token_endpoint: '/fhir/r4/auth/token',
        capabilities: [
          'launch-ehr',
          'client-public',
          'client-confidential-symmetric',
          'context-ehr-patient',
          'context-ehr-encounter',
          'sso-openid-connect',
          'permission-offline',
          'permission-patient',
          'permission-user',
        ],
        scopes_supported: app.scopes,
        response_types_supported: ['code'],
        code_challenge_methods_supported: ['S256'],
      },
    };
  }
}
