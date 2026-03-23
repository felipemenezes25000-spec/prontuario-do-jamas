import { NEWSScoreService } from './news-score.service';

describe('NEWSScoreService', () => {
  let service: NEWSScoreService;

  beforeEach(() => {
    service = new NEWSScoreService();
  });

  describe('calculateNEWS', () => {
    it('should return score 0 for all-normal vitals', () => {
      const result = service.calculateNEWS({
        respiratoryRate: 16,
        oxygenSaturation: 98,
        oxygenSupplementation: 'ROOM_AIR',
        temperature: 37.0,
        systolicBP: 120,
        heartRate: 70,
        gcs: 15,
      });
      expect(result.totalScore).toBe(0);
      expect(result.classification).toBe('LOW');
      expect(result.alert).toBeUndefined();
    });

    it('should classify HIGH for score >= 7', () => {
      const result = service.calculateNEWS({
        respiratoryRate: 25, // 3
        oxygenSaturation: 91, // 3
        oxygenSupplementation: 'NASAL_CANNULA', // 2
        temperature: 35.0, // 3
        systolicBP: 90, // 3
        heartRate: 131, // 3
        gcs: 10, // 3
      });
      expect(result.totalScore).toBeGreaterThanOrEqual(7);
      expect(result.classification).toBe('HIGH');
      expect(result.alert).toContain('Time de Resposta Rápida');
    });

    it('should classify MEDIUM for score 5-6', () => {
      const result = service.calculateNEWS({
        respiratoryRate: 22, // 2
        oxygenSaturation: 94, // 1
        oxygenSupplementation: 'NASAL_CANNULA', // 2
        temperature: 37.0, // 0
        systolicBP: 120, // 0
        heartRate: 70, // 0
        gcs: 15, // 0
      });
      expect(result.totalScore).toBe(5);
      expect(result.classification).toBe('MEDIUM');
    });

    it('should classify MEDIUM when any single parameter = 3', () => {
      const result = service.calculateNEWS({
        respiratoryRate: 16, // 0
        oxygenSaturation: 98, // 0
        oxygenSupplementation: 'ROOM_AIR', // 0
        temperature: 37.0, // 0
        systolicBP: 85, // 3 (single score of 3)
        heartRate: 70, // 0
        gcs: 15, // 0
      });
      expect(result.totalScore).toBe(3);
      expect(result.classification).toBe('MEDIUM');
    });

    it('should handle null/missing vitals as score 0', () => {
      const result = service.calculateNEWS({});
      expect(result.totalScore).toBe(0);
      expect(result.classification).toBe('LOW');
      expect(result.parameters).toHaveLength(7);
    });

    it('should return correct parameter breakdown', () => {
      const result = service.calculateNEWS({
        respiratoryRate: 8, // 3
        oxygenSaturation: 92, // 2
        temperature: 38.5, // 1
        systolicBP: 105, // 1
        heartRate: 95, // 1
      });

      const rrParam = result.parameters.find((p) => p.name === 'Frequência Respiratória');
      expect(rrParam?.score).toBe(3);
      expect(rrParam?.value).toBe(8);

      const spo2Param = result.parameters.find((p) => p.name === 'SpO2');
      expect(spo2Param?.score).toBe(2);

      const tempParam = result.parameters.find((p) => p.name === 'Temperatura');
      expect(tempParam?.score).toBe(1);
    });

    // Respiratory Rate boundary tests
    it.each([
      [7, 3], [8, 3], [9, 1], [11, 1], [12, 0], [20, 0], [21, 2], [24, 2], [25, 3], [30, 3],
    ])('respiratory rate %d should score %d', (rr, expectedScore) => {
      const result = service.calculateNEWS({ respiratoryRate: rr });
      const param = result.parameters.find((p) => p.name === 'Frequência Respiratória');
      expect(param?.score).toBe(expectedScore);
    });

    // SpO2 boundary tests
    it.each([
      [90, 3], [91, 3], [92, 2], [93, 2], [94, 1], [95, 1], [96, 0], [99, 0],
    ])('SpO2 %d should score %d', (spo2, expectedScore) => {
      const result = service.calculateNEWS({ oxygenSaturation: spo2 });
      const param = result.parameters.find((p) => p.name === 'SpO2');
      expect(param?.score).toBe(expectedScore);
    });

    // Temperature boundary tests
    it.each([
      [34.5, 3], [35.0, 3], [35.5, 1], [36.0, 1], [36.5, 0], [38.0, 0], [38.5, 1], [39.0, 1], [39.5, 2],
    ])('temperature %d should score %d', (temp, expectedScore) => {
      const result = service.calculateNEWS({ temperature: temp });
      const param = result.parameters.find((p) => p.name === 'Temperatura');
      expect(param?.score).toBe(expectedScore);
    });

    // Systolic BP boundary tests
    it.each([
      [85, 3], [90, 3], [95, 2], [100, 2], [105, 1], [110, 1], [115, 0], [219, 0], [220, 3],
    ])('systolic BP %d should score %d', (sbp, expectedScore) => {
      const result = service.calculateNEWS({ systolicBP: sbp });
      const param = result.parameters.find((p) => p.name === 'PA Sistólica');
      expect(param?.score).toBe(expectedScore);
    });

    // Heart Rate boundary tests
    it.each([
      [35, 3], [40, 3], [45, 1], [50, 1], [60, 0], [90, 0], [95, 1], [110, 1], [115, 2], [130, 2], [135, 3],
    ])('heart rate %d should score %d', (hr, expectedScore) => {
      const result = service.calculateNEWS({ heartRate: hr });
      const param = result.parameters.find((p) => p.name === 'Frequência Cardíaca');
      expect(param?.score).toBe(expectedScore);
    });

    // Consciousness
    it('should score 0 for GCS 15 (Alert)', () => {
      const result = service.calculateNEWS({ gcs: 15 });
      const param = result.parameters.find((p) => p.name === 'Nível de Consciência');
      expect(param?.score).toBe(0);
    });

    it('should score 3 for GCS < 15 (impaired)', () => {
      const result = service.calculateNEWS({ gcs: 12 });
      const param = result.parameters.find((p) => p.name === 'Nível de Consciência');
      expect(param?.score).toBe(3);
    });
  });
});
