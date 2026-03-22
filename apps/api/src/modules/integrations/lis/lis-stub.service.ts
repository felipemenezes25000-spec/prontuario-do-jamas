import { Injectable, Logger } from '@nestjs/common';
import type { LisService, LabOrder, LabResult, LabOrderStatus } from './lis.interface';

@Injectable()
export class LisStubService implements LisService {
  private readonly logger = new Logger(LisStubService.name);

  async sendOrder(
    order: Omit<LabOrder, 'orderId' | 'status' | 'orderedAt'>,
  ): Promise<LabOrder> {
    this.logger.debug(`[STUB] sendOrder patientId=${order.patientId} exams=${order.exams.length}`);

    return {
      orderId: `LAB-${Date.now()}`,
      patientId: order.patientId,
      encounterId: order.encounterId,
      exams: order.exams,
      priority: order.priority,
      orderedBy: order.orderedBy,
      status: 'RECEIVED',
      orderedAt: new Date().toISOString(),
    };
  }

  async getResults(orderId: string): Promise<LabResult[]> {
    this.logger.debug(`[STUB] getResults orderId=${orderId}`);

    return [
      {
        resultId: `RES-${Date.now()}-1`,
        orderId,
        patientId: 'mock-patient-id',
        examCode: 'CBC',
        examName: 'Hemograma Completo',
        value: 14.2,
        unit: 'g/dL',
        referenceRange: '12.0-16.0',
        flag: 'NORMAL',
        status: 'FINAL',
        resultedAt: new Date().toISOString(),
        performedBy: 'Dr. Lab Automacao',
      },
      {
        resultId: `RES-${Date.now()}-2`,
        orderId,
        patientId: 'mock-patient-id',
        examCode: 'WBC',
        examName: 'Leucocitos',
        value: 15800,
        unit: '/uL',
        referenceRange: '4500-11000',
        flag: 'HIGH',
        status: 'FINAL',
        resultedAt: new Date().toISOString(),
        performedBy: 'Dr. Lab Automacao',
      },
      {
        resultId: `RES-${Date.now()}-3`,
        orderId,
        patientId: 'mock-patient-id',
        examCode: 'CRP',
        examName: 'Proteina C Reativa',
        value: 48.5,
        unit: 'mg/L',
        referenceRange: '<5.0',
        flag: 'CRITICAL_HIGH',
        status: 'FINAL',
        resultedAt: new Date().toISOString(),
        performedBy: 'Dr. Lab Automacao',
      },
    ];
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    this.logger.debug(`[STUB] cancelOrder orderId=${orderId}`);

    return {
      success: true,
      message: `Pedido ${orderId} cancelado com sucesso (stub)`,
    };
  }

  async getOrderStatus(orderId: string): Promise<{ orderId: string; status: LabOrderStatus }> {
    this.logger.debug(`[STUB] getOrderStatus orderId=${orderId}`);

    return {
      orderId,
      status: 'COMPLETED',
    };
  }
}
