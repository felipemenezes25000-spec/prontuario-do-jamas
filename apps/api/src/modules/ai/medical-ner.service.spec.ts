import { Test, TestingModule } from '@nestjs/testing';
import { MedicalNerService } from './medical-ner.service';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

describe('MedicalNerService', () => {
  let service: MedicalNerService;
  let mockOpenAI: any;

  beforeEach(async () => {
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalNerService,
        { provide: OPENAI_CLIENT, useValue: mockOpenAI },
        { provide: GeminiProvider, useValue: { generateText: jest.fn().mockRejectedValue(new Error('Gemini not configured')), generateJson: jest.fn().mockRejectedValue(new Error('Gemini not configured')) } },
      ],
    }).compile();

    service = module.get<MedicalNerService>(MedicalNerService);
    jest.clearAllMocks();
  });

  describe('extractEntities', () => {
    it('should parse JSON response correctly', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                symptoms: [
                  { name: 'headache', severity: 'moderate', duration: '3 days' },
                ],
                negatives: ['fever', 'vomiting'],
                medications: [
                  {
                    name: 'Ibuprofen',
                    dose: '400',
                    doseUnit: 'mg',
                    route: 'VO',
                    frequency: '8/8h',
                  },
                ],
                diagnoses: [
                  { name: 'Migraine', icdCode: 'G43.9', confidence: 0.85 },
                ],
                procedures: [],
                vitalSigns: { systolicBP: 120, diastolicBP: 80 },
                allergies: [{ substance: 'Penicillin', reaction: 'rash' }],
                labValues: [],
                exams: [{ name: 'CT scan', urgency: 'ROUTINE' }],
                redFlags: [],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.extractEntities(
        'Paciente com cefaleia moderada ha 3 dias',
      );

      expect(result.symptoms).toHaveLength(1);
      expect(result.symptoms[0].name).toBe('headache');
      expect(result.negatives).toEqual(['fever', 'vomiting']);
      expect(result.medications).toHaveLength(1);
      expect(result.diagnoses).toHaveLength(1);
      expect(result.diagnoses[0].icdCode).toBe('G43.9');
      expect(result.vitalSigns).toEqual({ systolicBP: 120, diastolicBP: 80 });
      expect(result.allergies).toHaveLength(1);
      expect(result.exams).toHaveLength(1);
    });

    it('should return empty arrays on error', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('API error'),
      );

      const result = await service.extractEntities('some text');

      expect(result.symptoms).toEqual([]);
      expect(result.negatives).toEqual([]);
      expect(result.medications).toEqual([]);
      expect(result.diagnoses).toEqual([]);
      expect(result.procedures).toEqual([]);
      expect(result.vitalSigns).toEqual({});
      expect(result.allergies).toEqual([]);
      expect(result.labValues).toEqual([]);
      expect(result.exams).toEqual([]);
      expect(result.redFlags).toEqual([]);
    });

    it('should handle malformed JSON gracefully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'this is not valid json',
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.extractEntities('some text');

      // JSON.parse will throw and the catch block returns empty arrays
      expect(result.symptoms).toEqual([]);
      expect(result.medications).toEqual([]);
      expect(result.diagnoses).toEqual([]);
    });
  });
});
