import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface DeviceRegistration {
  id: string;
  tenantId: string;
  deviceType: string;
  serialNumber: string;
  ieee11073DeviceId: string;
  bedId: string;
  manufacturer: string;
  status: 'ACTIVE' | 'DISCONNECTED' | 'ERROR';
  lastHeartbeat?: string;
  registeredAt: string;
}

export interface VitalReading {
  deviceId: string;
  tenantId: string;
  metrics: Array<{
    code: string;
    value: number;
    unit: string;
    timestamp: string;
  }>;
  receivedAt: string;
}

export interface RemoteDevice {
  id: string;
  tenantId: string;
  platform: 'TYTO_CARE' | 'EKO' | 'OTHER';
  deviceModel: string;
  patientId: string;
  status: 'ACTIVE' | 'DISCONNECTED';
  registeredAt: string;
}

export interface RemoteExamData {
  id: string;
  deviceId: string;
  tenantId: string;
  patientId: string;
  examType: string;
  rawData: string;
  interpretation?: string;
  recordedAt: string;
}

@Injectable()
export class DeviceIntegrationService {
  private readonly logger = new Logger(DeviceIntegrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // IEEE 11073 Multiparametric Monitor Integration
  // =========================================================================

  async registerDevice(
    tenantId: string,
    dto: {
      deviceType: string;
      serialNumber: string;
      ieee11073DeviceId: string;
      bedId: string;
      manufacturer: string;
    },
  ) {
    // Check for duplicate serial number in tenant
    const existing = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: '[DEVICE_REG]' },
        content: { contains: dto.serialNumber },
        status: 'SIGNED',
      },
    });

    if (existing) {
      const parsed = JSON.parse(existing.content ?? '{}') as DeviceRegistration;
      if (parsed.serialNumber === dto.serialNumber && parsed.status === 'ACTIVE') {
        throw new ConflictException(`Dispositivo com serial ${dto.serialNumber} já está registrado e ativo.`);
      }
    }

    const firstUser = await this.prisma.user.findFirst({
      where: { tenantId },
      select: { id: true },
    });

    const firstPatient = await this.prisma.patient.findFirst({
      where: { tenantId, isActive: true },
      select: { id: true },
    });

    const device: DeviceRegistration = {
      id: crypto.randomUUID(),
      tenantId,
      deviceType: dto.deviceType,
      serialNumber: dto.serialNumber,
      ieee11073DeviceId: dto.ieee11073DeviceId,
      bedId: dto.bedId,
      manufacturer: dto.manufacturer,
      status: 'ACTIVE',
      lastHeartbeat: new Date().toISOString(),
      registeredAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: firstPatient?.id ?? firstUser!.id,
        authorId: firstUser!.id,
        type: 'CUSTOM',
        title: `[DEVICE_REG] ${dto.deviceType} - ${dto.serialNumber}`,
        content: JSON.stringify(device),
        status: 'SIGNED',
      },
    });

    this.logger.log(`Device registered: ${dto.deviceType} (${dto.serialNumber}) on bed ${dto.bedId}`);

    return { deviceId: doc.id, status: 'ACTIVE', serialNumber: dto.serialNumber };
  }

  async receiveVitals(
    tenantId: string,
    deviceId: string,
    dto: { metrics: Array<{ code: string; value: number; unit: string; timestamp: string }> },
  ) {
    const deviceDoc = await this.prisma.clinicalDocument.findFirst({
      where: { id: deviceId, tenantId, type: 'CUSTOM', title: { startsWith: '[DEVICE_REG]' } },
    });
    if (!deviceDoc) throw new NotFoundException('Dispositivo não encontrado.');

    const device = JSON.parse(deviceDoc.content ?? '{}') as DeviceRegistration;
    if (device.status !== 'ACTIVE') {
      throw new ConflictException('Dispositivo não está ativo. Reconecte antes de enviar dados.');
    }

    // Update heartbeat
    device.lastHeartbeat = new Date().toISOString();
    await this.prisma.clinicalDocument.update({
      where: { id: deviceId },
      data: { content: JSON.stringify(device) },
    });

    const reading: VitalReading = {
      deviceId,
      tenantId,
      metrics: dto.metrics,
      receivedAt: new Date().toISOString(),
    };

    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: deviceDoc.patientId,
        authorId: deviceDoc.authorId,
        type: 'CUSTOM',
        title: `[DEVICE_VITALS] ${device.serialNumber} - ${dto.metrics.length} metrics`,
        content: JSON.stringify(reading),
        status: 'SIGNED',
      },
    });

    this.logger.log(`Vitals received from device ${device.serialNumber}: ${dto.metrics.length} metrics`);

    return {
      deviceId,
      metricsReceived: dto.metrics.length,
      receivedAt: reading.receivedAt,
    };
  }

  async listDevices(
    tenantId: string,
    filters: { deviceType?: string; bedId?: string; status?: string },
  ) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: '[DEVICE_REG]' },
        status: 'SIGNED',
      },
      orderBy: { createdAt: 'desc' },
    });

    let devices = docs.map((d) => {
      const dev = JSON.parse(d.content ?? '{}') as DeviceRegistration;
      return {
        deviceId: d.id,
        deviceType: dev.deviceType,
        serialNumber: dev.serialNumber,
        ieee11073DeviceId: dev.ieee11073DeviceId,
        bedId: dev.bedId,
        manufacturer: dev.manufacturer,
        status: dev.status,
        lastHeartbeat: dev.lastHeartbeat,
        registeredAt: dev.registeredAt,
      };
    });

    if (filters.deviceType) {
      devices = devices.filter((d) => d.deviceType === filters.deviceType);
    }
    if (filters.bedId) {
      devices = devices.filter((d) => d.bedId === filters.bedId);
    }
    if (filters.status) {
      devices = devices.filter((d) => d.status === filters.status);
    }

    return { data: devices, total: devices.length };
  }

  async getDeviceStatus(tenantId: string, deviceId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: deviceId, tenantId, type: 'CUSTOM', title: { startsWith: '[DEVICE_REG]' } },
    });
    if (!doc) throw new NotFoundException('Dispositivo não encontrado.');

    const device = JSON.parse(doc.content ?? '{}') as DeviceRegistration;

    // Check heartbeat staleness (>5 min = possibly disconnected)
    const lastHeartbeat = device.lastHeartbeat ? new Date(device.lastHeartbeat) : null;
    const staleMinutes = lastHeartbeat
      ? Math.round((Date.now() - lastHeartbeat.getTime()) / 60000)
      : null;

    return {
      deviceId: doc.id,
      deviceType: device.deviceType,
      serialNumber: device.serialNumber,
      manufacturer: device.manufacturer,
      bedId: device.bedId,
      status: device.status,
      lastHeartbeat: device.lastHeartbeat,
      heartbeatStaleMinutes: staleMinutes,
      registeredAt: device.registeredAt,
    };
  }

  async disconnectDevice(tenantId: string, deviceId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: deviceId, tenantId, type: 'CUSTOM', title: { startsWith: '[DEVICE_REG]' } },
    });
    if (!doc) throw new NotFoundException('Dispositivo não encontrado.');

    const device = JSON.parse(doc.content ?? '{}') as DeviceRegistration;
    device.status = 'DISCONNECTED';

    await this.prisma.clinicalDocument.update({
      where: { id: deviceId },
      data: { content: JSON.stringify(device) },
    });

    this.logger.log(`Device disconnected: ${device.serialNumber}`);

    return { deviceId, status: 'DISCONNECTED', serialNumber: device.serialNumber };
  }

  // =========================================================================
  // Remote Exam Devices (Tyto Care / Eko)
  // =========================================================================

  async registerRemoteDevice(
    tenantId: string,
    dto: { platform: string; deviceModel: string; patientId: string },
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId, isActive: true },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const firstUser = await this.prisma.user.findFirst({
      where: { tenantId },
      select: { id: true },
    });

    const remoteDevice: RemoteDevice = {
      id: crypto.randomUUID(),
      tenantId,
      platform: dto.platform as RemoteDevice['platform'],
      deviceModel: dto.deviceModel,
      patientId: dto.patientId,
      status: 'ACTIVE',
      registeredAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: firstUser!.id,
        type: 'CUSTOM',
        title: `[REMOTE_DEVICE] ${dto.platform} - ${dto.deviceModel}`,
        content: JSON.stringify(remoteDevice),
        status: 'SIGNED',
      },
    });

    this.logger.log(`Remote device registered: ${dto.platform} ${dto.deviceModel} for patient ${dto.patientId}`);

    return { deviceId: doc.id, platform: dto.platform, status: 'ACTIVE' };
  }

  async receiveRemoteExamData(
    tenantId: string,
    deviceId: string,
    dto: { examType: string; rawData: string; interpretation?: string },
  ) {
    const deviceDoc = await this.prisma.clinicalDocument.findFirst({
      where: { id: deviceId, tenantId, type: 'CUSTOM', title: { startsWith: '[REMOTE_DEVICE]' } },
    });
    if (!deviceDoc) throw new NotFoundException('Dispositivo remoto não encontrado.');

    const device = JSON.parse(deviceDoc.content ?? '{}') as RemoteDevice;

    const examData: RemoteExamData = {
      id: crypto.randomUUID(),
      deviceId,
      tenantId,
      patientId: device.patientId,
      examType: dto.examType,
      rawData: dto.rawData,
      interpretation: dto.interpretation,
      recordedAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: device.patientId,
        authorId: deviceDoc.authorId,
        type: 'CUSTOM',
        title: `[REMOTE_EXAM:${dto.examType}] ${device.platform} - ${device.deviceModel}`,
        content: JSON.stringify(examData),
        status: 'SIGNED',
      },
    });

    this.logger.log(`Remote exam received: ${dto.examType} from ${device.platform} for patient ${device.patientId}`);

    return {
      examId: doc.id,
      examType: dto.examType,
      platform: device.platform,
      hasInterpretation: !!dto.interpretation,
      recordedAt: examData.recordedAt,
    };
  }

  async listRemoteExams(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId, isActive: true },
      select: { id: true, fullName: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        type: 'CUSTOM',
        title: { startsWith: '[REMOTE_EXAM:' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const exams = docs.map((d) => {
      const exam = JSON.parse(d.content ?? '{}') as RemoteExamData;
      return {
        examId: d.id,
        examType: exam.examType,
        deviceId: exam.deviceId,
        hasInterpretation: !!exam.interpretation,
        recordedAt: exam.recordedAt,
      };
    });

    return { data: exams, total: exams.length, patientId, patientName: patient.fullName };
  }
}
