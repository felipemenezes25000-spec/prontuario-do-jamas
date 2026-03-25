import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ============================================================================
// Phonetic search helpers (Soundex adaptation for pt-BR)
// ============================================================================

function soundexPtBr(name: string): string {
  if (!name) return '';
  const normalized = name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');

  if (normalized.length === 0) return '';

  const firstLetter = normalized[0];
  const map: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  };

  let code = firstLetter;
  let lastCode = map[firstLetter] ?? '0';

  for (let i = 1; i < normalized.length && code.length < 4; i++) {
    const currentCode = map[normalized[i]] ?? '0';
    if (currentCode !== '0' && currentCode !== lastCode) {
      code += currentCode;
    }
    lastCode = currentCode;
  }

  return code.padEnd(4, '0');
}

// ============================================================================
// MPI scoring helpers
// ============================================================================

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function nameSimilarity(a: string, b: string): number {
  const na = a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nb = b.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(na, nb) / maxLen;
}

// ============================================================================
// Interfaces
// ============================================================================

export interface MpiCandidate {
  id: string;
  fullName: string;
  cpf: string | null;
  birthDate: Date | null;
  mrn: string;
  matchScore: number;
  matchDetails: {
    cpfMatch: boolean;
    nameScore: number;
    birthDateMatch: boolean;
    phoneticMatch: boolean;
  };
}

export interface NewbornRegistrationDto {
  motherId: string;
  fullName: string;
  birthDate: string;
  birthTime?: string;
  gender: string;
  weight?: number;
  length?: number;
  apgar1?: number;
  apgar5?: number;
  notes?: string;
}

export interface AddressDto {
  patientId: string;
  type: 'RESIDENTIAL' | 'WORK' | 'TEMPORARY';
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  isPrimary?: boolean;
}

export interface LegacyImportDto {
  format: 'CSV' | 'HL7' | 'FHIR';
  data: string;
}

@Injectable()
export class PatientsEnhancedService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // MPI - Master Patient Index with probabilistic matching
  // =========================================================================

  async mpiSearch(tenantId: string, params: {
    fullName?: string;
    cpf?: string;
    birthDate?: string;
    phone?: string;
  }): Promise<MpiCandidate[]> {
    // Broad search to find candidates
    const where: Record<string, unknown> = { tenantId };

    const candidates = await this.prisma.patient.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        cpf: true,
        birthDate: true,
        mrn: true,
        phone: true,
      },
      take: 500,
    });

    const scored: MpiCandidate[] = [];

    for (const candidate of candidates) {
      let totalScore = 0;
      const details = {
        cpfMatch: false,
        nameScore: 0,
        birthDateMatch: false,
        phoneticMatch: false,
      };

      // CPF exact match (highest weight)
      if (params.cpf && candidate.cpf) {
        const cpfClean = params.cpf.replace(/\D/g, '');
        const candidateCpf = candidate.cpf.replace(/\D/g, '');
        if (cpfClean === candidateCpf) {
          details.cpfMatch = true;
          totalScore += 50;
        }
      }

      // Name similarity (Levenshtein + phonetic)
      if (params.fullName && candidate.fullName) {
        details.nameScore = nameSimilarity(params.fullName, candidate.fullName);
        totalScore += details.nameScore * 25;

        // Phonetic match
        const inputSoundex = soundexPtBr(params.fullName.split(' ')[0]);
        const candidateSoundex = soundexPtBr(candidate.fullName.split(' ')[0]);
        if (inputSoundex === candidateSoundex && inputSoundex !== '') {
          details.phoneticMatch = true;
          totalScore += 10;
        }
      }

      // Birth date match
      if (params.birthDate && candidate.birthDate) {
        const inputDate = new Date(params.birthDate).toISOString().split('T')[0];
        const candidateDate = candidate.birthDate.toISOString().split('T')[0];
        if (inputDate === candidateDate) {
          details.birthDateMatch = true;
          totalScore += 15;
        }
      }

      if (totalScore > 20) {
        scored.push({
          id: candidate.id,
          fullName: candidate.fullName,
          cpf: candidate.cpf,
          birthDate: candidate.birthDate,
          mrn: candidate.mrn,
          matchScore: Math.min(totalScore, 100),
          matchDetails: details,
        });
      }
    }

    return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 20);
  }

  // =========================================================================
  // Phonetic Search (Soundex/Metaphone for pt-BR)
  // =========================================================================

  async phoneticSearch(tenantId: string, name: string) {
    const inputSoundex = soundexPtBr(name.split(' ')[0]);

    const patients = await this.prisma.patient.findMany({
      where: { tenantId },
      select: { id: true, fullName: true, cpf: true, birthDate: true, mrn: true },
      take: 1000,
    });

    return patients
      .filter((p) => {
        const candidateSoundex = soundexPtBr(p.fullName.split(' ')[0]);
        return candidateSoundex === inputSoundex ||
          nameSimilarity(name, p.fullName) > 0.6;
      })
      .map((p) => ({
        ...p,
        similarity: nameSimilarity(name, p.fullName),
        soundex: soundexPtBr(p.fullName.split(' ')[0]),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20);
  }

  // =========================================================================
  // Newborn Registration (linked to mother)
  // =========================================================================

  async registerNewborn(tenantId: string, dto: NewbornRegistrationDto) {
    const mother = await this.prisma.patient.findFirst({
      where: { id: dto.motherId, tenantId },
    });
    if (!mother) {
      throw new NotFoundException('Mãe não encontrada');
    }

    // Map gender string to Prisma Gender enum
    const genderMap: Record<string, 'M' | 'F' | 'NB' | 'OTHER'> = {
      MALE: 'M', M: 'M', FEMALE: 'F', F: 'F', NB: 'NB', OTHER: 'OTHER',
    };
    const mappedGender = genderMap[dto.gender.toUpperCase()] ?? 'OTHER';

    const newborn = await this.prisma.patient.create({
      data: {
        tenantId,
        fullName: dto.fullName,
        birthDate: new Date(dto.birthDate),
        gender: mappedGender,
        mrn: `MRN-NB-${Date.now()}`,
        insuranceProvider: mother.insuranceProvider,
        insuranceNumber: mother.insuranceNumber,
      },
    });

    // Store newborn data as clinical document — use mother as author placeholder
    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: newborn.id,
        authorId: dto.motherId, // linked to mother record for traceability
        type: 'CUSTOM',
        title: '[NEWBORN_RECORD]',
        content: JSON.stringify({
          motherId: dto.motherId,
          motherName: mother.fullName,
          birthTime: dto.birthTime,
          weight: dto.weight,
          length: dto.length,
          apgar1: dto.apgar1,
          apgar5: dto.apgar5,
          notes: dto.notes,
        }),
        status: 'FINAL',
      },
    });

    return { newborn, mother: { id: mother.id, fullName: mother.fullName } };
  }

  // =========================================================================
  // QR Code / Barcode generation
  // =========================================================================

  async generatePatientQrCode(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true, fullName: true, mrn: true, cpf: true, birthDate: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    // Return data that frontend will render as QR code
    return {
      patientId: patient.id,
      mrn: patient.mrn,
      qrData: JSON.stringify({
        id: patient.id,
        mrn: patient.mrn,
        name: patient.fullName,
        birthDate: patient.birthDate?.toISOString().split('T')[0],
      }),
      barcodeData: patient.mrn,
      applications: ['wristband', 'collection_tube', 'printed_record'],
    };
  }

  // =========================================================================
  // Multiple Addresses with Geolocation
  // =========================================================================

  async addAddress(tenantId: string, dto: AddressDto) {
    await this.ensurePatientExists(dto.patientId, tenantId);

    // If setting as primary, unset other primary addresses
    if (dto.isPrimary) {
      const existing = await this.prisma.clinicalDocument.findMany({
        where: { patientId: dto.patientId, tenantId, title: { startsWith: '[ADDRESS:' } },
      });
      for (const addr of existing) {
        const parsed = JSON.parse(addr.content ?? '{}');
        if (parsed.isPrimary) {
          await this.prisma.clinicalDocument.update({
            where: { id: addr.id },
            data: { content: JSON.stringify({ ...parsed, isPrimary: false }) },
          });
        }
      }
    }

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: dto.patientId, // self-authored address record
        type: 'CUSTOM',
        title: `[ADDRESS:${dto.type}] ${dto.street}, ${dto.city}`,
        content: JSON.stringify({
          type: dto.type,
          street: dto.street,
          number: dto.number,
          complement: dto.complement,
          neighborhood: dto.neighborhood,
          city: dto.city,
          state: dto.state,
          zipCode: dto.zipCode,
          latitude: dto.latitude,
          longitude: dto.longitude,
          isPrimary: dto.isPrimary ?? false,
        }),
        status: 'FINAL',
      },
    });
  }

  async listAddresses(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: '[ADDRESS:' } },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content ?? '{}'),
    }));
  }

  // =========================================================================
  // Legacy System Import
  // =========================================================================

  async importLegacyData(tenantId: string, dto: LegacyImportDto) {
    // Store as import record for processing
    // Use a system-level placeholder for authorId and patientId since this is a bulk import
    const record = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: 'SYSTEM',
        authorId: 'SYSTEM',
        type: 'CUSTOM',
        title: `[LEGACY_IMPORT:${dto.format}]`,
        content: JSON.stringify({
          format: dto.format,
          dataLength: dto.data.length,
          importedAt: new Date().toISOString(),
          status: 'QUEUED',
          preview: dto.data.slice(0, 500),
        }),
        status: 'DRAFT',
      },
    });

    // In production, this would enqueue a BullMQ job
    return {
      importId: record.id,
      format: dto.format,
      status: 'QUEUED',
      message: `Importação ${dto.format} enfileirada para processamento.`,
    };
  }

  // =========================================================================
  // Selfie with Identity Verification (stub)
  // =========================================================================

  async verifySelfie(tenantId: string, patientId: string, imageUrl: string) {
    await this.ensurePatientExists(patientId, tenantId);

    // Stub: in production, calls liveness detection API
    return {
      patientId,
      imageUrl,
      livenessScore: 0.95,
      verified: true,
      verifiedAt: new Date().toISOString(),
      disclaimer: 'Verificação de liveness simulada — integrar com serviço real.',
    };
  }

  // =========================================================================
  // OCR Document Extraction (stub)
  // =========================================================================

  async ocrExtractDocument(tenantId: string, documentUrl: string, documentType: 'ID_CARD' | 'INSURANCE_CARD') {
    // Stub: in production, calls OCR API (AWS Textract, Google Vision, etc.)
    const extractedFields: Record<string, string> = {};

    if (documentType === 'ID_CARD') {
      extractedFields.fullName = 'Nome Extraído via OCR';
      extractedFields.cpf = '000.000.000-00';
      extractedFields.rg = '00.000.000-0';
      extractedFields.birthDate = '1990-01-01';
    } else {
      extractedFields.insuranceProvider = 'Operadora Extraída via OCR';
      extractedFields.insuranceNumber = '0000000000';
      extractedFields.planType = 'Enfermaria';
      extractedFields.validUntil = '2027-12-31';
    }

    return {
      documentUrl,
      documentType,
      extractedFields,
      confidence: 0.87,
      extractedAt: new Date().toISOString(),
      disclaimer: 'Extração OCR simulada — integrar com serviço real.',
    };
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private async ensurePatientExists(patientId: string, tenantId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }
    return patient;
  }
}
