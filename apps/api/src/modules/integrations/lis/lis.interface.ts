export type LabOrderStatus =
  | 'PENDING'
  | 'RECEIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ERROR';

export interface LabOrder {
  orderId: string;
  patientId: string;
  encounterId: string;
  exams: Array<{
    code: string;
    name: string;
    material: string;
  }>;
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  status: LabOrderStatus;
  orderedAt: string;
  orderedBy: string;
}

export interface LabResult {
  resultId: string;
  orderId: string;
  patientId: string;
  examCode: string;
  examName: string;
  value: string | number;
  unit: string;
  referenceRange: string;
  flag: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL_LOW' | 'CRITICAL_HIGH' | '';
  status: 'PRELIMINARY' | 'FINAL' | 'CORRECTED';
  resultedAt: string;
  performedBy: string;
}

export interface LisService {
  sendOrder(order: Omit<LabOrder, 'orderId' | 'status' | 'orderedAt'>): Promise<LabOrder>;
  getResults(orderId: string): Promise<LabResult[]>;
  cancelOrder(orderId: string): Promise<{ success: boolean; message: string }>;
  getOrderStatus(orderId: string): Promise<{ orderId: string; status: LabOrderStatus }>;
}

export const LIS_SERVICE = Symbol('LIS_SERVICE');
