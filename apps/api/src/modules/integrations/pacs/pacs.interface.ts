export interface DicomStudy {
  studyInstanceUid: string;
  patientId: string;
  patientName: string;
  studyDate: string;
  modality: string;
  description: string;
  accessionNumber: string;
  seriesCount: number;
  imageCount: number;
}

export interface DicomSeries {
  seriesInstanceUid: string;
  studyInstanceUid: string;
  seriesNumber: number;
  modality: string;
  description: string;
  imageCount: number;
}

export interface DicomImage {
  sopInstanceUid: string;
  seriesInstanceUid: string;
  instanceNumber: number;
  imageUrl: string;
  rows: number;
  columns: number;
}

export interface PacsService {
  queryStudies(patientId: string, modality?: string): Promise<DicomStudy[]>;
  getStudy(studyInstanceUid: string): Promise<DicomStudy | null>;
  getImage(sopInstanceUid: string): Promise<DicomImage | null>;
  storeStudy(study: Partial<DicomStudy>): Promise<DicomStudy>;
}

export const PACS_SERVICE = Symbol('PACS_SERVICE');
