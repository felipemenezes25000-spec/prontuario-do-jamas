import { Test, TestingModule } from '@nestjs/testing';
import { SoapGeneratorService } from './soap-generator.service';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

describe('SoapGeneratorService', () => {
  let service: SoapGeneratorService;
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
        SoapGeneratorService,
        { provide: OPENAI_CLIENT, useValue: mockOpenAI },
        { provide: GeminiProvider, useValue: { generateText: jest.fn().mockRejectedValue(new Error('Gemini not configured')), generateJson: jest.fn().mockRejectedValue(new Error('Gemini not configured')) } },
      ],
    }).compile();

    service = module.get<SoapGeneratorService>(SoapGeneratorService);
    jest.clearAllMocks();
  });

  describe('generateSOAP', () => {
    const mockSoapResponse = {
      subjective: 'Paciente relata dor de cabeca ha 3 dias',
      objective: 'PA 120/80, FC 72, Tax 36.5',
      assessment: 'Cefaleia tensional - G44.2',
      plan: 'Prescrever paracetamol 750mg 6/6h, retorno em 7 dias',
      diagnosisCodes: ['G44.2'],
      suggestedExams: ['Hemograma completo'],
      suggestedMedications: [
        {
          name: 'Paracetamol',
          dose: '750mg',
          route: 'VO',
          frequency: '6/6h',
          duration: '5 dias',
        },
      ],
    };

    it('should include patient context in prompt', async () => {
      const mockResponse = {
        choices: [
          { message: { content: JSON.stringify(mockSoapResponse) } },
        ],
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const patientContext = {
        name: 'Maria Silva',
        age: 40,
        gender: 'Feminino',
        allergies: ['Dipirona'],
        conditions: ['HAS'],
        medications: ['Losartan 50mg'],
      };

      await service.generateSOAP(
        'Paciente relata dor de cabeca',
        patientContext,
        'Clinica Medica',
      );

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('Maria Silva'),
            }),
          ]),
          response_format: { type: 'json_object' },
        }),
      );

      // Verify patient context is in the system prompt
      const call = mockOpenAI.chat.completions.create.mock.calls[0][0];
      const systemMsg = call.messages.find((m: any) => m.role === 'system');
      expect(systemMsg.content).toContain('Dipirona');
      expect(systemMsg.content).toContain('HAS');
      expect(systemMsg.content).toContain('Losartan 50mg');
      expect(systemMsg.content).toContain('Clinica Medica');
    });

    it('should return all four SOAP sections', async () => {
      const mockResponse = {
        choices: [
          { message: { content: JSON.stringify(mockSoapResponse) } },
        ],
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.generateSOAP(
        'Paciente relata dor de cabeca',
      );

      expect(result.subjective).toBe(mockSoapResponse.subjective);
      expect(result.objective).toBe(mockSoapResponse.objective);
      expect(result.assessment).toBe(mockSoapResponse.assessment);
      expect(result.plan).toBe(mockSoapResponse.plan);
      expect(result.diagnosisCodes).toEqual(['G44.2']);
      expect(result.suggestedExams).toEqual(['Hemograma completo']);
      expect(result.suggestedMedications).toHaveLength(1);
    });

    it('should handle error with default response', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('API error'),
      );

      const result = await service.generateSOAP(
        'Paciente relata dor de cabeca',
      );

      expect(result.subjective).toBe('');
      expect(result.objective).toBe('');
      expect(result.assessment).toBe('');
      expect(result.plan).toBe('');
      expect(result.diagnosisCodes).toEqual([]);
      expect(result.suggestedExams).toEqual([]);
      expect(result.suggestedMedications).toEqual([]);
    });

    it('should handle empty patient context', async () => {
      const mockResponse = {
        choices: [
          { message: { content: JSON.stringify(mockSoapResponse) } },
        ],
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await service.generateSOAP('test transcription', {});

      const call = mockOpenAI.chat.completions.create.mock.calls[0][0];
      const systemMsg = call.messages.find((m: any) => m.role === 'system');
      expect(systemMsg.content).toContain('não disponíveis');
    });
  });
});
