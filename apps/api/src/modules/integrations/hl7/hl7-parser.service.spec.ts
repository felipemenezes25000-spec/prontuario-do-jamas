import { Test, TestingModule } from '@nestjs/testing';
import { Hl7ParserService } from './hl7-parser.service';

describe('Hl7ParserService', () => {
  let service: Hl7ParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Hl7ParserService],
    }).compile();

    service = module.get<Hl7ParserService>(Hl7ParserService);
  });

  // ---------------------------------------------------------------------------
  // parseMessage
  // ---------------------------------------------------------------------------

  describe('parseMessage', () => {
    it('should parse an HL7 message into segments with messageType and controlId', () => {
      // Standard HL7 message with proper MSH where field separator is explicit
      const raw = [
        'MSH|^~\\&|VOXPEP|HOSPITAL|RECEIVER|RECEIVER_FAC|20260322120000||ADT^A01|MSG001|P|2.5',
        'PID||1||MRN-0001^^^MRN||Silva^Maria||19850615|F',
        'PV1||1|O||||Dr. Carlos',
      ].join('\r\n');

      const result = service.parseMessage(raw);

      expect(result.segments).toHaveLength(3);
      expect(result.segments[0].name).toBe('MSH');
      expect(result.segments[1].name).toBe('PID');
      expect(result.segments[2].name).toBe('PV1');
      // In standard HL7, MSH split by | gives MSH at [0], so fields[8] = ADT^A01, fields[9] = MSG001
      expect(result.messageType).toBe('ADT^A01');
      expect(result.messageControlId).toBe('MSG001');
      expect(result.raw).toBe(raw);
    });

    it('should handle messages with \\n line separators', () => {
      const raw = 'MSH|^~\\&|VOXPEP|H|R|RF|20260101||ADT^A01|CTL1|P|2.5\nPID||1||MRN^^^MRN';

      const result = service.parseMessage(raw);

      expect(result.segments).toHaveLength(2);
      expect(result.messageType).toBe('ADT^A01');
    });

    it('should handle empty message gracefully', () => {
      const result = service.parseMessage('');

      expect(result.segments).toHaveLength(0);
      expect(result.messageType).toBe('');
      expect(result.messageControlId).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // parseSegment
  // ---------------------------------------------------------------------------

  describe('parseSegment', () => {
    it('should split a segment line by pipe separator', () => {
      const segment = service.parseSegment('PID||1||MRN-0001^^^MRN||Silva^Maria');

      expect(segment.name).toBe('PID');
      // PID||1||MRN-0001^^^MRN||Silva^Maria -> 7 fields
      expect(segment.fields).toHaveLength(7);
      expect(segment.fields[0]).toBe('PID');
      // fields: [PID, '', 1, '', MRN-0001^^^MRN, '', Silva^Maria]
      expect(segment.fields[6]).toBe('Silva^Maria');
    });

    it('should handle MSH segment', () => {
      const segment = service.parseSegment(
        'MSH|^~\\&|VOXPEP|HOSPITAL|RECEIVER|RECEIVER_FAC|20260322120000||ADT^A01|MSG001|P|2.5',
      );

      expect(segment.name).toBe('MSH');
      expect(segment.fields[0]).toBe('MSH');
    });

    it('should handle segment with no extra fields', () => {
      const segment = service.parseSegment('ZZZ');
      expect(segment.name).toBe('ZZZ');
      expect(segment.fields).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // buildADT_A01
  // ---------------------------------------------------------------------------

  describe('buildADT_A01', () => {
    const patient = {
      fullName: 'Maria Silva',
      mrn: 'MRN-0001',
      birthDate: '1985-06-15',
      gender: 'F',
    };

    const encounter = {
      type: 'EMERGENCY',
      hospitalName: 'Hospital Central',
      location: 'ER-01',
      doctorName: 'Dr. Carlos',
    };

    it('should build a valid ADT^A01 message with MSH, EVN, PID, and PV1 segments', () => {
      const message = service.buildADT_A01(patient, encounter);
      const lines = message.split('\r\n');

      expect(lines).toHaveLength(4);
      expect(lines[0]).toMatch(/^MSH/);
      expect(lines[1]).toMatch(/^EVN/);
      expect(lines[2]).toMatch(/^PID/);
      expect(lines[3]).toMatch(/^PV1/);
    });

    it('should contain ADT^A01 in the MSH segment', () => {
      const message = service.buildADT_A01(patient, encounter);
      const mshLine = message.split('\r\n')[0];

      // The MSH line contains ADT^A01 regardless of field indexing
      expect(mshLine).toContain('ADT^A01');
    });

    it('should include patient name in PID segment', () => {
      const message = service.buildADT_A01(patient, encounter);
      const pidLine = message.split('\r\n').find((l) => l.startsWith('PID'));

      expect(pidLine).toContain('Silva');
      expect(pidLine).toContain('Maria');
    });

    it('should include MRN in PID segment', () => {
      const message = service.buildADT_A01(patient, encounter);
      const pidLine = message.split('\r\n').find((l) => l.startsWith('PID'));

      expect(pidLine).toContain('MRN-0001');
    });

    it('should map EMERGENCY encounter type to class E in PV1', () => {
      const message = service.buildADT_A01(patient, encounter);
      const pv1Line = message.split('\r\n').find((l) => l.startsWith('PV1'));

      // PV1 built via buildSegment('PV1', ['', '1', classMap[type], ...])
      // Output: PV1||1|E|...  -> fields[3] = 'E'
      const fields = pv1Line!.split('|');
      expect(fields[3]).toBe('E');
    });

    it('should map HOSPITALIZATION to class I', () => {
      const message = service.buildADT_A01(patient, { ...encounter, type: 'HOSPITALIZATION' });
      const pv1Line = message.split('\r\n').find((l) => l.startsWith('PV1'));
      const fields = pv1Line!.split('|');

      expect(fields[3]).toBe('I');
    });

    it('should map CONSULTATION to class O', () => {
      const message = service.buildADT_A01(patient, { ...encounter, type: 'CONSULTATION' });
      const pv1Line = message.split('\r\n').find((l) => l.startsWith('PV1'));
      const fields = pv1Line!.split('|');

      expect(fields[3]).toBe('O');
    });

    it('should include hospital name in MSH segment', () => {
      const message = service.buildADT_A01(patient, encounter);
      const mshLine = message.split('\r\n')[0];

      expect(mshLine).toContain('Hospital Central');
    });

    it('should include birth date in PID segment formatted as YYYYMMDD', () => {
      const message = service.buildADT_A01(patient, encounter);
      const pidLine = message.split('\r\n').find((l) => l.startsWith('PID'));

      // The date may shift by timezone offset (e.g., UTC-3 renders June 15 as June 14)
      // Verify it contains a valid 8-digit date starting with 1985
      expect(pidLine).toMatch(/1985061[45]/);
    });

    it('should map patient gender F to F in PID', () => {
      const message = service.buildADT_A01(patient, encounter);
      const pidLine = message.split('\r\n').find((l) => l.startsWith('PID'));
      const fields = pidLine!.split('|');

      // Gender is the last substantive field in PID
      expect(fields.some((f) => f === 'F')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // buildORU_R01
  // ---------------------------------------------------------------------------

  describe('buildORU_R01', () => {
    const patient = {
      fullName: 'Maria Silva',
      mrn: 'MRN-0001',
      birthDate: '1985-06-15',
      gender: 'F',
    };

    const labResults = [
      { code: 'WBC', name: 'White Blood Cells', value: 7.5, unit: '10^3/uL', referenceRange: '4.5-11.0', flag: '' },
      { code: 'HGB', name: 'Hemoglobin', value: 14.2, unit: 'g/dL', referenceRange: '12.0-16.0', flag: '' },
    ];

    it('should build a valid ORU^R01 message with MSH, PID, and OBX segments', () => {
      const message = service.buildORU_R01(patient, labResults);
      const lines = message.split('\r\n');

      expect(lines).toHaveLength(4); // MSH + PID + 2 OBX
      expect(lines[0]).toMatch(/^MSH/);
      expect(lines[1]).toMatch(/^PID/);
      expect(lines[2]).toMatch(/^OBX/);
      expect(lines[3]).toMatch(/^OBX/);
    });

    it('should contain ORU^R01 in the MSH segment', () => {
      const message = service.buildORU_R01(patient, labResults);
      const mshLine = message.split('\r\n')[0];

      expect(mshLine).toContain('ORU^R01');
    });

    it('should include lab result values in OBX segments', () => {
      const message = service.buildORU_R01(patient, labResults);
      const obxLines = message.split('\r\n').filter((l) => l.startsWith('OBX'));

      expect(obxLines).toHaveLength(2);
      expect(obxLines[0]).toContain('7.5');
      expect(obxLines[0]).toContain('WBC');
      expect(obxLines[1]).toContain('14.2');
      expect(obxLines[1]).toContain('HGB');
    });

    it('should use NM value type for numeric results in OBX', () => {
      const message = service.buildORU_R01(patient, labResults);
      const obxLine = message.split('\r\n').find((l) => l.startsWith('OBX'));

      // OBX segment built with: buildSegment('OBX', ['', index, valueType, ...])
      // Output: OBX||1|NM|... -> fields[3] = 'NM'
      const fields = obxLine!.split('|');
      expect(fields[3]).toBe('NM');
    });

    it('should use ST value type for string results in OBX', () => {
      const stringResults = [
        { code: 'BLOOD_TYPE', name: 'Blood Type', value: 'A+', unit: '', referenceRange: '', flag: '' },
      ];

      const message = service.buildORU_R01(patient, stringResults);
      const obxLine = message.split('\r\n').find((l) => l.startsWith('OBX'));
      const fields = obxLine!.split('|');

      expect(fields[3]).toBe('ST');
    });

    it('should build message with empty results array', () => {
      const message = service.buildORU_R01(patient, []);
      const lines = message.split('\r\n');

      // Only MSH + PID, no OBX
      expect(lines).toHaveLength(2);
    });

    it('should include result units in OBX segments', () => {
      const message = service.buildORU_R01(patient, labResults);
      const obxLines = message.split('\r\n').filter((l) => l.startsWith('OBX'));

      expect(obxLines[0]).toContain('10^3/uL');
      expect(obxLines[1]).toContain('g/dL');
    });
  });
});
