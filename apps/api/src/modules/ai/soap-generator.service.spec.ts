import { Test, TestingModule } from '@nestjs/testing';
import { SoapGeneratorService } from './soap-generator.service';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { PatientContextBuilder } from './patient-context.builder';
import { AiCacheService } from './ai-cache.service';

describe('SoapGeneratorService', () => {
  let service: SoapGeneratorService;
  let mockOpenAI: Record<string, unknown>;

  const mockPatientContextBuilder = {
    build: jest.fn().mockResolvedValue('Dados do paciente:\nNome: Maria Silva\nAlergias: Dipirona'),
  };

  const mockAiCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
  };

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
        {
          provide: GeminiProvider,
          useValue: {
            generateText: jest.fn().mockRejectedValue(new Error('Gemini not configured')),
            generateJson: jest.fn().mockRejectedValue(new Error('Gemini not configured')),
          },
        },
        { provide: PatientContextBuilder, useValue: mockPatientContextBuilder },
        { provide: AiCacheService, useValue: mockAiCache },
      ],
    }).compile();

    service = module.get<SoapGeneratorService>(SoapGeneratorService);
    jest.clearAllMocks();
    // Default: cache miss
    mockAiCache.get.mockResolvedValue(null);
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
      (mockOpenAI.chat as Record<string, unknown> & { completions: { create: jest.Mock } }).completions.create.mockResolvedValue(mockResponse);

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

      const create = (mockOpenAI.chat as Record<string, unknown> & { completions: { create: jest.Mock } }).completions.create;
      expect(create).toHaveBeenCalledWith(
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
      const call = create.mock.calls[0][0];
      const systemMsg = call.messages.find((m: { role: string }) => m.role === 'system');
      expect(systemMsg.content).toContain('Dipirona');
      expect(systemMsg.content).toContain('HAS');
      expect(systemMsg.content).toContain('Losartan 50mg');
      expect(systemMsg.content).toContain('Especialidade:');
    });

    it('should return all four SOAP sections', async () => {
      const mockResponse = {
        choices: [
          { message: { content: JSON.stringify(mockSoapResponse) } },
        ],
      };
      (mockOpenAI.chat as Record<string, unknown> & { completions: { create: jest.Mock } }).completions.create.mockResolvedValue(mockResponse);

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

    it('should handle error with offline fallback response', async () => {
      (mockOpenAI.chat as Record<string, unknown> & { completions: { create: jest.Mock } }).completions.create.mockRejectedValue(
        new Error('API error'),
      );

      const result = await service.generateSOAP(
        'Paciente relata dor de cabeca',
      );

      // When both AI providers fail, the service falls back to offline rule-based SOAP generation
      // which extracts content from the transcription text
      expect(result.subjective).toBeDefined();
      expect(result.objective).toBeDefined();
      expect(result.assessment).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.diagnosisCodes).toBeDefined();
      expect(result.suggestedExams).toBeDefined();
      expect(result.suggestedMedications).toBeDefined();
    });

    it('should handle empty patient context', async () => {
      const mockResponse = {
        choices: [
          { message: { content: JSON.stringify(mockSoapResponse) } },
        ],
      };
      (mockOpenAI.chat as Record<string, unknown> & { completions: { create: jest.Mock } }).completions.create.mockResolvedValue(mockResponse);

      await service.generateSOAP('test transcription', {});

      const create = (mockOpenAI.chat as Record<string, unknown> & { completions: { create: jest.Mock } }).completions.create;
      const call = create.mock.calls[0][0];
      const systemMsg = call.messages.find((m: { role: string }) => m.role === 'system');
      expect(systemMsg.content).toContain('nao disponiveis');
    });

    it('should return cached result when available', async () => {
      mockAiCache.get.mockResolvedValue(mockSoapResponse);

      const result = await service.generateSOAP('Paciente relata dor de cabeca');

      expect(result).toEqual(mockSoapResponse);
      const create = (mockOpenAI.chat as Record<string, unknown> & { completions: { create: jest.Mock } }).completions.create;
      expect(create).not.toHaveBeenCalled();
    });

    it('should use PatientContextBuilder when patientId is provided', async () => {
      const mockResponse = {
        choices: [
          { message: { content: JSON.stringify(mockSoapResponse) } },
        ],
      };
      (mockOpenAI.chat as Record<string, unknown> & { completions: { create: jest.Mock } }).completions.create.mockResolvedValue(mockResponse);

      await service.generateSOAP('transcricao', undefined, undefined, 'patient-123');

      expect(mockPatientContextBuilder.build).toHaveBeenCalledWith('patient-123');
    });
  });
});
