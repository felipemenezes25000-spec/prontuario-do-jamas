import { Injectable, Logger } from '@nestjs/common';
import type { PacsService, DicomStudy, DicomImage } from './pacs.interface';

@Injectable()
export class PacsStubService implements PacsService {
  private readonly logger = new Logger(PacsStubService.name);

  async queryStudies(patientId: string, modality?: string): Promise<DicomStudy[]> {
    this.logger.debug(`[STUB] queryStudies patientId=${patientId} modality=${modality}`);

    const mockStudies: DicomStudy[] = [
      {
        studyInstanceUid: '1.2.826.0.1.3680043.8.1055.1.20111103111148288.98361414.79379639',
        patientId,
        patientName: 'Paciente Exemplo',
        studyDate: '2026-03-20',
        modality: 'CR',
        description: 'Radiografia de Torax PA e Perfil',
        accessionNumber: 'ACC-2026-001',
        seriesCount: 2,
        imageCount: 4,
      },
      {
        studyInstanceUid: '1.2.826.0.1.3680043.8.1055.1.20111103111148288.98361414.79379640',
        patientId,
        patientName: 'Paciente Exemplo',
        studyDate: '2026-03-18',
        modality: 'CT',
        description: 'Tomografia de Abdomen Total com Contraste',
        accessionNumber: 'ACC-2026-002',
        seriesCount: 5,
        imageCount: 320,
      },
    ];

    if (modality) {
      return mockStudies.filter((s) => s.modality === modality);
    }
    return mockStudies;
  }

  async getStudy(studyInstanceUid: string): Promise<DicomStudy | null> {
    this.logger.debug(`[STUB] getStudy uid=${studyInstanceUid}`);

    return {
      studyInstanceUid,
      patientId: 'mock-patient-id',
      patientName: 'Paciente Exemplo',
      studyDate: '2026-03-20',
      modality: 'CR',
      description: 'Radiografia de Torax PA e Perfil',
      accessionNumber: 'ACC-2026-001',
      seriesCount: 2,
      imageCount: 4,
    };
  }

  async getImage(sopInstanceUid: string): Promise<DicomImage | null> {
    this.logger.debug(`[STUB] getImage uid=${sopInstanceUid}`);

    return {
      sopInstanceUid,
      seriesInstanceUid: '1.2.826.0.1.3680043.8.1055.1.series.001',
      instanceNumber: 1,
      imageUrl: `https://pacs-stub.local/wado?objectUID=${sopInstanceUid}`,
      rows: 2048,
      columns: 2048,
    };
  }

  async storeStudy(study: Partial<DicomStudy>): Promise<DicomStudy> {
    this.logger.debug(`[STUB] storeStudy description=${study.description}`);

    return {
      studyInstanceUid: `1.2.826.0.1.3680043.8.1055.1.${Date.now()}`,
      patientId: study.patientId ?? 'unknown',
      patientName: study.patientName ?? 'Desconhecido',
      studyDate: study.studyDate ?? new Date().toISOString().split('T')[0],
      modality: study.modality ?? 'OT',
      description: study.description ?? '',
      accessionNumber: study.accessionNumber ?? `ACC-${Date.now()}`,
      seriesCount: study.seriesCount ?? 0,
      imageCount: study.imageCount ?? 0,
    };
  }
}
