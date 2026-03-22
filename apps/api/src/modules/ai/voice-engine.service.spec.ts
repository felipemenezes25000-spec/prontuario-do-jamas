import { Test, TestingModule } from '@nestjs/testing';
import { VoiceEngineService } from './voice-engine.service';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

describe('VoiceEngineService', () => {
  let service: VoiceEngineService;
  let mockOpenAI: any;

  beforeEach(async () => {
    mockOpenAI = {
      audio: {
        transcriptions: {
          create: jest.fn(),
        },
      },
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceEngineService,
        { provide: OPENAI_CLIENT, useValue: mockOpenAI },
        { provide: GeminiProvider, useValue: { generateText: jest.fn(), generateJson: jest.fn() } },
      ],
    }).compile();

    service = module.get<VoiceEngineService>(VoiceEngineService);
    jest.clearAllMocks();
  });

  describe('transcribeAudio', () => {
    it('should call Whisper with correct params', async () => {
      const mockTranscription = {
        text: 'Paciente relata dor de cabeca',
        language: 'pt',
        duration: 15.5,
        segments: [
          {
            text: 'Paciente relata dor de cabeca',
            start: 0,
            end: 15.5,
            avg_logprob: -0.2,
          },
        ],
      };

      mockOpenAI.audio.transcriptions.create.mockResolvedValue(
        mockTranscription,
      );

      const audioBuffer = Buffer.from('fake-audio-data');
      await service.transcribeAudio(
        audioBuffer,
        'anamnesis',
        'pt',
      );

      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith({
        file: expect.any(File),
        model: 'whisper-1',
        language: 'pt',
        prompt: expect.stringContaining('anamnese'),
        response_format: 'verbose_json',
      });
    });

    it('should return text and duration', async () => {
      const mockTranscription = {
        text: 'Paciente relata dor de cabeca',
        language: 'pt',
        duration: 15.5,
        segments: [
          {
            text: 'Paciente relata dor de cabeca',
            start: 0,
            end: 15.5,
            avg_logprob: -0.1,
          },
        ],
      };

      mockOpenAI.audio.transcriptions.create.mockResolvedValue(
        mockTranscription,
      );

      const audioBuffer = Buffer.from('fake-audio-data');
      const result = await service.transcribeAudio(audioBuffer, 'anamnesis');

      expect(result.text).toBe('Paciente relata dor de cabeca');
      expect(result.duration).toBe(15.5);
      expect(result.language).toBe('pt');
      expect(result.segments).toHaveLength(1);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return correct context prompt for each context', async () => {
      const mockTranscription = {
        text: 'test',
        language: 'pt',
        duration: 1,
        segments: [],
      };

      mockOpenAI.audio.transcriptions.create.mockResolvedValue(
        mockTranscription,
      );

      const audioBuffer = Buffer.from('fake-audio-data');

      // Test 'prescription' context
      await service.transcribeAudio(audioBuffer, 'prescription');
      expect(
        mockOpenAI.audio.transcriptions.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('prescrição'),
        }),
      );

      jest.clearAllMocks();

      // Test 'triage' context
      await service.transcribeAudio(audioBuffer, 'triage');
      expect(
        mockOpenAI.audio.transcriptions.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('triagem'),
        }),
      );
    });

    it('should handle OpenAI error gracefully', async () => {
      mockOpenAI.audio.transcriptions.create.mockRejectedValue(
        new Error('OpenAI API error'),
      );

      const audioBuffer = Buffer.from('fake-audio-data');
      const result = await service.transcribeAudio(audioBuffer, 'anamnesis');

      expect(result.text).toBe('');
      expect(result.confidence).toBe(0);
      expect(result.duration).toBe(0);
      expect(result.segments).toEqual([]);
    });
  });
});
