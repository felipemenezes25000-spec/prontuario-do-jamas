import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeGateway } from './realtime.gateway';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;

  const mockEmit = jest.fn();
  const mockTo = jest.fn(() => ({ emit: mockEmit }));

  const mockServer = {
    to: mockTo,
  };

  const mockClient = {
    id: 'client-1',
    handshake: {
      query: {
        tenantId: 'tenant-1',
        userId: 'user-1',
      },
    },
    join: jest.fn(),
    leave: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RealtimeGateway],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    (gateway as any).server = mockServer;
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should join tenant and user rooms', () => {
      gateway.handleConnection(mockClient as any);

      expect(mockClient.join).toHaveBeenCalledWith('tenant:tenant-1');
      expect(mockClient.join).toHaveBeenCalledWith('user:user-1');
    });

    it('should not join rooms when query params are missing', () => {
      const clientNoParams = {
        ...mockClient,
        handshake: { query: {} },
      };

      gateway.handleConnection(clientNoParams as any);

      expect(clientNoParams.join).not.toHaveBeenCalled();
    });
  });

  describe('handleJoinEncounter', () => {
    it('should join encounter room', () => {
      gateway.handleJoinEncounter(mockClient as any, { encounterId: 'enc-1' });
      expect(mockClient.join).toHaveBeenCalledWith('encounter:enc-1');
    });
  });

  describe('handleLeaveEncounter', () => {
    it('should leave encounter room', () => {
      gateway.handleLeaveEncounter(mockClient as any, { encounterId: 'enc-1' });
      expect(mockClient.leave).toHaveBeenCalledWith('encounter:enc-1');
    });
  });

  describe('handleJoinPatient', () => {
    it('should join patient room', () => {
      gateway.handleJoinPatient(mockClient as any, { patientId: 'patient-1' });
      expect(mockClient.join).toHaveBeenCalledWith('patient:patient-1');
    });
  });

  describe('handleJoinWard', () => {
    it('should join ward room', () => {
      gateway.handleJoinWard(mockClient as any, { ward: 'Ward A' });
      expect(mockClient.join).toHaveBeenCalledWith('ward:Ward A');
    });
  });

  describe('emitVitalSigns', () => {
    it('should emit to patient and encounter rooms', () => {
      const vitals = { heartRate: 72 };
      gateway.emitVitalSigns('patient-1', 'enc-1', vitals);

      expect(mockTo).toHaveBeenCalledWith('patient:patient-1');
      expect(mockTo).toHaveBeenCalledWith('encounter:enc-1');
      expect(mockEmit).toHaveBeenCalledWith('vitals:new', vitals);
    });
  });

  describe('emitAlert', () => {
    it('should emit to tenant and patient rooms', () => {
      const alert = { type: 'CRITICAL', message: 'High BP' };
      gateway.emitAlert('tenant-1', 'patient-1', alert);

      expect(mockTo).toHaveBeenCalledWith('tenant:tenant-1');
      expect(mockTo).toHaveBeenCalledWith('patient:patient-1');
      expect(mockEmit).toHaveBeenCalledWith('alert:new', alert);
    });
  });

  describe('emitNotification', () => {
    it('should emit to user room', () => {
      const notification = { title: 'New prescription' };
      gateway.emitNotification('user-1', notification);

      expect(mockTo).toHaveBeenCalledWith('user:user-1');
      expect(mockEmit).toHaveBeenCalledWith('notification:new', notification);
    });
  });

  describe('emitBedUpdate', () => {
    it('should emit to ward and tenant rooms', () => {
      const bed = { id: 'bed-1', status: 'OCCUPIED' };
      gateway.emitBedUpdate('tenant-1', 'Ward A', bed);

      expect(mockTo).toHaveBeenCalledWith('ward:Ward A');
      expect(mockTo).toHaveBeenCalledWith('tenant:tenant-1');
      expect(mockEmit).toHaveBeenCalledWith('bed:updated', bed);
    });
  });

  describe('emitTranscriptionPartial', () => {
    it('should emit partial transcription to user', () => {
      gateway.emitTranscriptionPartial('user-1', 'O paciente relata...');

      expect(mockTo).toHaveBeenCalledWith('user:user-1');
      expect(mockEmit).toHaveBeenCalledWith('transcription:partial', {
        text: 'O paciente relata...',
      });
    });
  });
});
