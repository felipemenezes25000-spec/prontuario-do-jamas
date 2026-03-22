import { Test, TestingModule } from '@nestjs/testing';
import { TranscriptionProcessor, TranscriptionJobData } from './transcription.processor';
import { VoiceEngineService } from '../../ai/voice-engine.service';
import { MedicalNerService } from '../../ai/medical-ner.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { StorageService } from '../../storage/storage.service';
import { Job } from 'bullmq';

describe('TranscriptionProcessor', () => {
  let processor: TranscriptionProcessor;

  const mockVoiceEngine = {
    transcribeAudio: jest.fn(),
    processTranscription: jest.fn(),
  };

  const mockMedicalNer = {
    extractEntities: jest.fn(),
  };

  const mockPrisma = {
    voiceTranscription: {
      update: jest.fn(),
    },
  };

  const mockRealtime = {
    emitTranscriptionComplete: jest.fn(),
  };

  const mockStorage = {
    getSignedDownloadUrl: jest.fn(),
  };

  const createMockJob = (data: TranscriptionJobData): Job<TranscriptionJobData> =>
    ({
      id: 'job-1',
      data,
      updateProgress: jest.fn(),
    }) as unknown as Job<TranscriptionJobData>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptionProcessor,
        { provide: VoiceEngineService, useValue: mockVoiceEngine },
        { provide: MedicalNerService, useValue: mockMedicalNer },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RealtimeGateway, useValue: mockRealtime },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();

    processor = module.get<TranscriptionProcessor>(TranscriptionProcessor);
    jest.clearAllMocks();

    // Mock global fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const jobData: TranscriptionJobData = {
    transcriptionId: 'trans-1',
    audioUrl: 's3://bucket/audio/recording.wav',
    context: 'encounter',
    language: 'pt-BR',
    userId: 'user-1',
    tenantId: 'tenant-1',
    encounterId: 'enc-1',
  };

  it('should process transcription job successfully', async () => {
    mockStorage.getSignedDownloadUrl.mockResolvedValue('https://presigned-url.com/audio.wav');
    mockVoiceEngine.transcribeAudio.mockResolvedValue({
      text: 'Paciente relata dor de cabeça',
      confidence: 0.95,
      language: 'pt-BR',
      duration: 30,
    });
    mockMedicalNer.extractEntities.mockResolvedValue([
      { entity: 'SYMPTOM', value: 'dor de cabeça' },
    ]);
    mockVoiceEngine.processTranscription.mockResolvedValue({
      processedText: 'Paciente relata cefaleia',
      structuredData: { symptoms: ['cefaleia'] },
    });
    mockPrisma.voiceTranscription.update.mockResolvedValue({});

    const job = createMockJob(jobData);
    await processor.process(job);

    expect(mockPrisma.voiceTranscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'trans-1' },
        data: expect.objectContaining({ processingStatus: 'PROCESSING' }),
      }),
    );
    expect(mockVoiceEngine.transcribeAudio).toHaveBeenCalled();
    expect(mockMedicalNer.extractEntities).toHaveBeenCalledWith('Paciente relata dor de cabeça');
    expect(mockRealtime.emitTranscriptionComplete).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        transcriptionId: 'trans-1',
        text: 'Paciente relata cefaleia',
        confidence: 0.95,
      }),
    );
    expect(job.updateProgress).toHaveBeenCalledWith(100);
  });

  it('should update status to FAILED and notify user on error', async () => {
    mockStorage.getSignedDownloadUrl.mockResolvedValue('https://presigned-url.com/audio.wav');
    mockPrisma.voiceTranscription.update.mockResolvedValue({});
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Forbidden',
    });

    const job = createMockJob(jobData);

    await expect(processor.process(job)).rejects.toThrow('Failed to download audio from S3');

    expect(mockPrisma.voiceTranscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'trans-1' },
        data: { processingStatus: 'FAILED' },
      }),
    );
    expect(mockRealtime.emitTranscriptionComplete).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        transcriptionId: 'trans-1',
        error: expect.any(String),
      }),
    );
  });

  it('should throw on invalid S3 URL', async () => {
    const invalidJob = createMockJob({
      ...jobData,
      audioUrl: 'https://not-an-s3-url.com/file.wav',
    });
    mockPrisma.voiceTranscription.update.mockResolvedValue({});

    await expect(processor.process(invalidJob)).rejects.toThrow('Invalid S3 URL');
  });

  it('should update progress through the pipeline stages', async () => {
    mockStorage.getSignedDownloadUrl.mockResolvedValue('https://url.com');
    mockVoiceEngine.transcribeAudio.mockResolvedValue({
      text: 'text', confidence: 0.9, language: 'pt-BR', duration: 10,
    });
    mockMedicalNer.extractEntities.mockResolvedValue([]);
    mockVoiceEngine.processTranscription.mockResolvedValue({
      processedText: 'text', structuredData: {},
    });
    mockPrisma.voiceTranscription.update.mockResolvedValue({});

    const job = createMockJob(jobData);
    await processor.process(job);

    expect(job.updateProgress).toHaveBeenCalledWith(10);
    expect(job.updateProgress).toHaveBeenCalledWith(20);
    expect(job.updateProgress).toHaveBeenCalledWith(50);
    expect(job.updateProgress).toHaveBeenCalledWith(75);
    expect(job.updateProgress).toHaveBeenCalledWith(90);
    expect(job.updateProgress).toHaveBeenCalledWith(100);
  });
});
