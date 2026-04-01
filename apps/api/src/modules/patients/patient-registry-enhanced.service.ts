import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Gender, EncounterType } from '@prisma/client';
import {
  FindDuplicatesDto,
  DuplicateCandidateDto,
  ConfidenceLevel,
  MergePatientDto,
  PhoneticSearchDto,
  PhoneticAlgorithm,
  NewbornRegistrationDto,
  GenerateLabelDto,
  LabelType,
  BarcodeFormat,
  LabelField,
  LabelResultDto,
  GeocodeAddressDto,
  GeocodeResultDto,
  DocumentOCRDto,
  DocumentOCRType,
  OCRResultDto,
  OCRExtractedField,
  IdentityVerificationDto,
  VerificationResultDto,
  LivenessCheckResult,
} from './dto/patient-registry-enhanced.dto';

// ============================================================================
// Phonetic helpers — Brazilian Portuguese
// ============================================================================

function normalizePtBr(input: string): string {
  return input
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

/**
 * Brazilian Portuguese Soundex.
 * Handles: Ç→S, LH→L, NH→N, CH→X, QU→K, GU→G, PH→F, etc.
 */
export function soundexPtBr(name: string): string {
  if (!name) return '';
  let normalized = normalizePtBr(name);
  if (normalized.length === 0) return '';

  // Apply pt-BR digraph rules before Soundex mapping
  normalized = normalized
    .replace(/PH/g, 'F')
    .replace(/CH/g, 'X')
    .replace(/LH/g, 'L')
    .replace(/NH/g, 'N')
    .replace(/QU/g, 'K')
    .replace(/GU([EI])/g, 'G$1')
    .replace(/SS/g, 'S')
    .replace(/RR/g, 'R');

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

/**
 * Brazilian Portuguese Metaphone approximation.
 * Handles common pt-BR phonetic equivalences.
 */
export function metaphonePtBr(name: string): string {
  if (!name) return '';
  let s = normalizePtBr(name);
  if (s.length === 0) return '';

  s = s.replace(/PH/g, 'F');
  s = s.replace(/CH/g, 'S');
  s = s.replace(/LH/g, 'L');
  s = s.replace(/NH/g, 'N');
  s = s.replace(/SS/g, 'S');
  s = s.replace(/RR/g, 'R');
  s = s.replace(/C([EI])/g, 'S$1');
  s = s.replace(/G([EI])/g, 'J$1');
  s = s.replace(/QU/g, 'K');
  s = s.replace(/GU([EI])/g, 'G$1');
  s = s.replace(/X/g, 'S');
  s = s.replace(/W/g, 'V');
  s = s.replace(/Y/g, 'I');
  s = s.replace(/H/g, '');

  // Deduplicate consecutive identical chars
  let result = s[0];
  for (let i = 1; i < s.length; i++) {
    if (s[i] !== s[i - 1]) result += s[i];
  }

  // Strip trailing vowels (keep at least 2 chars)
  if (result.length > 2) {
    result = result.replace(/[AEIOU]+$/, '');
  }

  return result.slice(0, 8);
}

/**
 * Double Metaphone — generates primary and alternate codes.
 */
export function doubleMetaphonePtBr(name: string): { primary: string; alternate: string } {
  const primary = metaphonePtBr(name);
  // Alternate: swap C/S and G/J equivalences for broader matching
  let s = normalizePtBr(name);
  s = s.replace(/PH/g, 'F');
  s = s.replace(/CH/g, 'X'); // keep as X for alternate
  s = s.replace(/LH/g, 'LI');
  s = s.replace(/NH/g, 'NI');
  s = s.replace(/SS/g, 'S');
  s = s.replace(/RR/g, 'R');
  s = s.replace(/C([EI])/g, 'S$1');
  s = s.replace(/G([EI])/g, 'J$1');
  s = s.replace(/QU/g, 'K');
  s = s.replace(/W/g, 'V');
  s = s.replace(/Y/g, 'I');
  s = s.replace(/H/g, '');

  let alternate = s[0] ?? '';
  for (let i = 1; i < s.length; i++) {
    if (s[i] !== s[i - 1]) alternate += s[i];
  }
  if (alternate.length > 2) {
    alternate = alternate.replace(/[AEIOU]+$/, '');
  }

  return { primary, alternate: alternate.slice(0, 8) };
}

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

/**
 * Haversine distance in km between two lat/lng points.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class PatientRegistryEnhancedService {
  private readonly logger = new Logger(PatientRegistryEnhancedService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // 1. MPI — Find duplicates with probabilistic matching
  // =========================================================================

  async findDuplicates(
    tenantId: string,
    dto: FindDuplicatesDto,
  ): Promise<DuplicateCandidateDto[]> {
    if (!dto.name && !dto.cpf && !dto.birthDate && !dto.motherName) {
      throw new BadRequestException(
        'At least one search criterion is required (name, cpf, birthDate, or motherName)',
      );
    }

    const candidates = await this.prisma.patient.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        cpf: true,
        birthDate: true,
        mrn: true,
        motherName: true,
      },
      take: 5000,
    });

    const results: DuplicateCandidateDto[] = [];

    for (const candidate of candidates) {
      let score = 0;
      const matchedFields: string[] = [];

      // Exact CPF match = 100
      if (dto.cpf && candidate.cpf) {
        const cleanInput = dto.cpf.replace(/\D/g, '');
        const cleanCandidate = candidate.cpf.replace(/\D/g, '');
        if (cleanInput.length >= 11 && cleanInput === cleanCandidate) {
          score = 100;
          matchedFields.push('CPF_EXACT');
        }
      }

      // Exact name + birthDate = 90
      if (score < 100 && dto.name && dto.birthDate && candidate.fullName && candidate.birthDate) {
        const nameMatch = nameSimilarity(dto.name, candidate.fullName) > 0.95;
        const dateMatch =
          candidate.birthDate.toISOString().split('T')[0] === dto.birthDate;
        if (nameMatch && dateMatch) {
          score = Math.max(score, 90);
          matchedFields.push('NAME_EXACT', 'BIRTH_DATE_EXACT');
        }
      }

      // Soundex name + birthDate = 75
      if (score < 90 && dto.name && dto.birthDate && candidate.fullName && candidate.birthDate) {
        const inputFirst = dto.name.trim().split(/\s+/)[0];
        const candidateFirst = candidate.fullName.split(/\s+/)[0];
        const soundexMatch =
          soundexPtBr(inputFirst) === soundexPtBr(candidateFirst) &&
          soundexPtBr(inputFirst) !== '';
        const dateMatch =
          candidate.birthDate.toISOString().split('T')[0] === dto.birthDate;
        if (soundexMatch && dateMatch) {
          score = Math.max(score, 75);
          matchedFields.push('NAME_SOUNDEX', 'BIRTH_DATE_EXACT');
        }
      }

      // Partial name match = 50
      if (score < 75 && dto.name && candidate.fullName) {
        const similarity = nameSimilarity(dto.name, candidate.fullName);
        if (similarity > 0.7) {
          score = Math.max(score, Math.round(similarity * 50));
          matchedFields.push(`NAME_PARTIAL(${Math.round(similarity * 100)}%)`);
        }
      }

      // Mother name bonus (+15)
      if (dto.motherName && candidate.motherName) {
        const motherSim = nameSimilarity(dto.motherName, candidate.motherName);
        if (motherSim > 0.8) {
          score = Math.min(score + 15, 100);
          matchedFields.push('MOTHER_NAME_MATCH');
        }
      }

      // Birth date alone bonus (+10)
      if (dto.birthDate && candidate.birthDate && !matchedFields.includes('BIRTH_DATE_EXACT')) {
        if (candidate.birthDate.toISOString().split('T')[0] === dto.birthDate) {
          score = Math.min(score + 10, 100);
          matchedFields.push('BIRTH_DATE_EXACT');
        }
      }

      if (score >= 30) {
        let confidenceLevel: ConfidenceLevel;
        if (score >= 85) {
          confidenceLevel = ConfidenceLevel.HIGH;
        } else if (score >= 60) {
          confidenceLevel = ConfidenceLevel.PROBABLE;
        } else {
          confidenceLevel = ConfidenceLevel.POSSIBLE;
        }

        results.push({
          patientId: candidate.id,
          fullName: candidate.fullName,
          cpf: candidate.cpf,
          birthDate: candidate.birthDate?.toISOString().split('T')[0] ?? null,
          mrn: candidate.mrn,
          matchScore: score,
          matchedFields,
          confidenceLevel,
        });
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 30);
  }

  // =========================================================================
  // 1b. Merge patients — reassign all records to survivor
  // =========================================================================

  async mergePatients(tenantId: string, dto: MergePatientDto, mergedBy: string) {
    if (dto.survivorId === dto.duplicateId) {
      throw new BadRequestException('Survivor and duplicate IDs must be different');
    }

    const [survivor, duplicate] = await Promise.all([
      this.prisma.patient.findFirst({ where: { id: dto.survivorId, tenantId } }),
      this.prisma.patient.findFirst({ where: { id: dto.duplicateId, tenantId } }),
    ]);

    if (!survivor) {
      throw new NotFoundException(`Survivor patient "${dto.survivorId}" not found`);
    }
    if (!duplicate) {
      throw new NotFoundException(`Duplicate patient "${dto.duplicateId}" not found`);
    }

    // Build update data from fieldsToKeep — copy selected fields from duplicate
    const fieldsToUpdate: Record<string, unknown> = {};
    const allowedFields = [
      'fullName', 'phone', 'email', 'cpf', 'birthDate', 'gender',
      'bloodType', 'motherName', 'address', 'insuranceProvider', 'insuranceNumber',
    ];

    for (const [field, source] of Object.entries(dto.fieldsToKeep)) {
      if (source === 'duplicate' && allowedFields.includes(field)) {
        const duplicateRecord = duplicate as Record<string, unknown>;
        fieldsToUpdate[field] = duplicateRecord[field];
      }
    }

    const mergeAudit = {
      survivorId: dto.survivorId,
      duplicateId: dto.duplicateId,
      survivorName: survivor.fullName,
      duplicateName: duplicate.fullName,
      fieldsToKeep: dto.fieldsToKeep,
      fieldsUpdated: Object.keys(fieldsToUpdate),
      reason: dto.reason,
      mergedAt: new Date().toISOString(),
      mergedBy,
    };

    await this.prisma.$transaction(async (tx) => {
      // Apply field selections to survivor
      if (Object.keys(fieldsToUpdate).length > 0) {
        await tx.patient.update({
          where: { id: dto.survivorId },
          data: fieldsToUpdate,
        });
      }

      // Reassign encounters
      await tx.encounter.updateMany({
        where: { patientId: dto.duplicateId },
        data: { patientId: dto.survivorId },
      });

      // Reassign vital signs
      await tx.vitalSigns.updateMany({
        where: { patientId: dto.duplicateId },
        data: { patientId: dto.survivorId },
      });

      // Reassign clinical documents
      await tx.clinicalDocument.updateMany({
        where: { patientId: dto.duplicateId },
        data: { patientId: dto.survivorId },
      });

      // Reassign prescriptions
      await tx.prescription.updateMany({
        where: { patientId: dto.duplicateId },
        data: { patientId: dto.survivorId },
      });

      // Reassign exam results
      await tx.examResult.updateMany({
        where: { patientId: dto.duplicateId },
        data: { patientId: dto.survivorId },
      });

      // Reassign clinical alerts
      await tx.clinicalAlert.updateMany({
        where: { patientId: dto.duplicateId },
        data: { patientId: dto.survivorId },
      });

      // Reassign allergies (deduplicate by substance)
      const survivorAllergies = await tx.allergy.findMany({
        where: { patientId: dto.survivorId },
        select: { substance: true },
      });
      const existingSubstances = new Set(
        survivorAllergies.map((a) => a.substance.toLowerCase()),
      );

      const duplicateAllergies = await tx.allergy.findMany({
        where: { patientId: dto.duplicateId },
      });

      for (const allergy of duplicateAllergies) {
        if (!existingSubstances.has(allergy.substance.toLowerCase())) {
          await tx.allergy.update({
            where: { id: allergy.id },
            data: { patientId: dto.survivorId },
          });
        } else {
          await tx.allergy.delete({ where: { id: allergy.id } });
        }
      }

      // Reassign chronic conditions
      await tx.chronicCondition.updateMany({
        where: { patientId: dto.duplicateId },
        data: { patientId: dto.survivorId },
      });

      // Reassign family history
      await tx.familyHistory.updateMany({
        where: { patientId: dto.duplicateId },
        data: { patientId: dto.survivorId },
      });

      // Reassign surgical history
      await tx.surgicalHistory.updateMany({
        where: { patientId: dto.duplicateId },
        data: { patientId: dto.survivorId },
      });

      // Reassign vaccinations
      await tx.vaccination.updateMany({
        where: { patientId: dto.duplicateId },
        data: { patientId: dto.survivorId },
      });

      // Audit trail
      await tx.clinicalDocument.create({
        data: {
          tenantId,
          patientId: dto.survivorId,
          authorId: mergedBy,
          type: 'CUSTOM',
          title: `[PATIENT_MERGE_ENHANCED] ${duplicate.fullName} -> ${survivor.fullName}`,
          content: JSON.stringify(mergeAudit),
          status: 'FINAL',
        },
      });

      // Soft-delete the duplicate
      await tx.patient.update({
        where: { id: dto.duplicateId },
        data: {
          deletedAt: new Date(),
          fullName: `[MERGED] ${duplicate.fullName}`,
        },
      });
    });

    this.logger.log(
      `Enhanced merge: ${dto.duplicateId} -> ${dto.survivorId} by ${mergedBy}`,
    );

    return {
      survivorId: dto.survivorId,
      duplicateId: dto.duplicateId,
      status: 'MERGED',
      fieldsUpdated: Object.keys(fieldsToUpdate),
      mergedAt: mergeAudit.mergedAt,
      message: `Paciente "${duplicate.fullName}" incorporado ao registro de "${survivor.fullName}".`,
    };
  }

  // =========================================================================
  // 2. Phonetic Search
  // =========================================================================

  async phoneticSearch(tenantId: string, dto: PhoneticSearchDto) {
    if (!dto.query || dto.query.trim().length < 2) {
      return [];
    }

    const algorithm = dto.algorithm ?? PhoneticAlgorithm.SOUNDEX;
    const firstName = dto.query.trim().split(/\s+/)[0];

    const patients = await this.prisma.patient.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        cpf: true,
        birthDate: true,
        mrn: true,
        phone: true,
        gender: true,
      },
      take: 2000,
    });

    const results: Array<{
      id: string;
      fullName: string;
      cpf: string | null;
      birthDate: Date | null;
      mrn: string;
      phone: string | null;
      gender: string;
      similarity: number;
      phoneticMatch: boolean;
      phoneticCode: string;
      algorithm: string;
    }> = [];

    for (const patient of patients) {
      const patientFirst = patient.fullName.split(/\s+/)[0];
      let phoneticMatch = false;
      let phoneticCode = '';

      switch (algorithm) {
        case PhoneticAlgorithm.SOUNDEX: {
          const inputCode = soundexPtBr(firstName);
          const candidateCode = soundexPtBr(patientFirst);
          phoneticCode = candidateCode;
          phoneticMatch = inputCode === candidateCode && inputCode !== '';
          break;
        }
        case PhoneticAlgorithm.METAPHONE: {
          const inputCode = metaphonePtBr(firstName);
          const candidateCode = metaphonePtBr(patientFirst);
          phoneticCode = candidateCode;
          phoneticMatch = inputCode === candidateCode && inputCode !== '';
          break;
        }
        case PhoneticAlgorithm.DOUBLE_METAPHONE: {
          const inputCodes = doubleMetaphonePtBr(firstName);
          const candidateCodes = doubleMetaphonePtBr(patientFirst);
          phoneticCode = `${candidateCodes.primary}/${candidateCodes.alternate}`;
          phoneticMatch =
            (inputCodes.primary === candidateCodes.primary && inputCodes.primary !== '') ||
            (inputCodes.alternate === candidateCodes.alternate && inputCodes.alternate !== '') ||
            (inputCodes.primary === candidateCodes.alternate && inputCodes.primary !== '');
          break;
        }
      }

      const similarity = nameSimilarity(dto.query.trim(), patient.fullName);

      if (phoneticMatch || similarity > 0.5) {
        results.push({
          id: patient.id,
          fullName: patient.fullName,
          cpf: patient.cpf,
          birthDate: patient.birthDate,
          mrn: patient.mrn,
          phone: patient.phone,
          gender: patient.gender,
          similarity: parseFloat(similarity.toFixed(3)),
          phoneticMatch,
          phoneticCode,
          algorithm,
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, 30);
  }

  generatePhoneticCode(
    name: string,
    algorithm: PhoneticAlgorithm,
  ): { code: string; algorithm: string } {
    switch (algorithm) {
      case PhoneticAlgorithm.SOUNDEX:
        return { code: soundexPtBr(name), algorithm: 'SOUNDEX' };
      case PhoneticAlgorithm.METAPHONE:
        return { code: metaphonePtBr(name), algorithm: 'METAPHONE' };
      case PhoneticAlgorithm.DOUBLE_METAPHONE: {
        const codes = doubleMetaphonePtBr(name);
        return { code: `${codes.primary}/${codes.alternate}`, algorithm: 'DOUBLE_METAPHONE' };
      }
    }
  }

  // =========================================================================
  // 3. Newborn Registration
  // =========================================================================

  async registerNewborn(tenantId: string, dto: NewbornRegistrationDto, authorId: string) {
    const mother = await this.prisma.patient.findFirst({
      where: { id: dto.motherId, tenantId },
    });

    if (!mother) {
      throw new NotFoundException(`Mother with ID "${dto.motherId}" not found`);
    }

    // Generate MRN for the newborn: RN-[mother MRN]-[birthOrder or 1]
    const birthOrder = dto.birthOrder ?? 1;
    const mrn = `RN-${mother.mrn}-${birthOrder}`;

    // Check MRN uniqueness
    const existingMrn = await this.prisma.patient.findFirst({
      where: { mrn, tenantId },
    });

    const finalMrn = existingMrn
      ? `RN-${mother.mrn}-${birthOrder}-${Date.now().toString(36)}`
      : mrn;

    // Create the newborn patient, copying mother's insurance/address
    const newborn = await this.prisma.patient.create({
      data: {
        tenantId,
        fullName: `RN de ${mother.fullName}`,
        mrn: finalMrn,
        gender: dto.gender as Gender,
        birthDate: new Date(dto.birthDate),
        motherName: mother.fullName,
        bloodType: null,
        cpf: null,
        phone: mother.phone,
        email: mother.email,
        address: mother.address,
        insuranceProvider: mother.insuranceProvider,
        insuranceNumber: mother.insuranceNumber,
      },
    });

    // Store birth details as clinical document
    const birthDetails = {
      motherId: dto.motherId,
      motherName: mother.fullName,
      birthDate: dto.birthDate,
      birthTime: dto.birthTime ?? null,
      birthWeight: dto.birthWeight ?? null,
      birthLength: dto.birthLength ?? null,
      headCircumference: dto.headCircumference ?? null,
      apgar1: dto.apgar1 ?? null,
      apgar5: dto.apgar5 ?? null,
      apgar10: dto.apgar10 ?? null,
      gestationalAge: dto.gestationalAge ?? null,
      deliveryType: dto.deliveryType ?? null,
      birthOrder,
      complications: dto.complications ?? [],
      pediatricianId: dto.pediatricianId ?? null,
    };

    // Create birth record document
    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: newborn.id,
        authorId,
        type: 'CUSTOM',
        title: `[BIRTH_RECORD] RN de ${mother.fullName}`,
        content: JSON.stringify(birthDetails),
        status: 'FINAL',
      },
    });

    // Create mother-newborn link on both records
    const linkContent = {
      motherId: dto.motherId,
      motherName: mother.fullName,
      motherMrn: mother.mrn,
      newbornId: newborn.id,
      newbornName: newborn.fullName,
      newbornMrn: finalMrn,
      linkedAt: new Date().toISOString(),
      linkedBy: authorId,
    };

    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: newborn.id,
        authorId,
        type: 'CUSTOM',
        title: `[MOTHER_NEWBORN_LINK] Mae: ${mother.fullName}`,
        content: JSON.stringify(linkContent),
        status: 'FINAL',
      },
    });

    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.motherId,
        authorId,
        type: 'CUSTOM',
        title: `[MOTHER_NEWBORN_LINK] RN: ${newborn.fullName}`,
        content: JSON.stringify({ ...linkContent, perspective: 'MOTHER_RECORD' }),
        status: 'FINAL',
      },
    });

    // Create initial encounter for the newborn
    const encounter = await this.prisma.encounter.create({
      data: {
        tenantId,
        patientId: newborn.id,
        primaryDoctorId: dto.pediatricianId ?? authorId,
        type: 'HOSPITALIZATION' as EncounterType,
        status: 'IN_PROGRESS',
        chiefComplaint: `Nascimento — RN de ${mother.fullName}. Parto: ${dto.deliveryType ?? 'N/I'}. Peso: ${dto.birthWeight ?? 'N/I'}g. APGAR: ${dto.apgar1 ?? '-'}/${dto.apgar5 ?? '-'}/${dto.apgar10 ?? '-'}.`,
      },
    });

    this.logger.log(`Newborn registered: ${newborn.id} linked to mother ${dto.motherId}`);

    return {
      newbornId: newborn.id,
      mrn: finalMrn,
      fullName: newborn.fullName,
      motherId: dto.motherId,
      motherName: mother.fullName,
      encounterId: encounter.id,
      birthDetails,
      createdAt: newborn.createdAt,
    };
  }

  // =========================================================================
  // 4. Label Generation (QR Code / Barcode)
  // =========================================================================

  async generatePatientLabel(tenantId: string, dto: GenerateLabelDto): Promise<LabelResultDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
      select: {
        id: true,
        fullName: true,
        mrn: true,
        cpf: true,
        birthDate: true,
        bloodType: true,
        gender: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const includeFields = dto.includeFields ?? [
      LabelField.NAME,
      LabelField.MRN,
      LabelField.BIRTH_DATE,
    ];
    const format = dto.format ?? BarcodeFormat.QR_CODE;

    // Get allergies if requested
    let allergyText = '';
    if (includeFields.includes(LabelField.ALLERGIES)) {
      const allergies = await this.prisma.allergy.findMany({
        where: { patientId: dto.patientId, status: 'ACTIVE' },
        select: { substance: true, severity: true },
      });
      allergyText = allergies.length > 0
        ? allergies.map((a) => `${a.substance} (${a.severity})`).join(', ')
        : 'NKDA';
    }

    // Build text content based on label type and included fields
    const textParts: string[] = [];
    if (includeFields.includes(LabelField.NAME)) textParts.push(`Nome: ${patient.fullName}`);
    if (includeFields.includes(LabelField.MRN)) textParts.push(`Prontuário: ${patient.mrn}`);
    if (includeFields.includes(LabelField.BIRTH_DATE)) {
      textParts.push(`DN: ${patient.birthDate?.toISOString().split('T')[0] ?? 'N/I'}`);
    }
    if (includeFields.includes(LabelField.BLOOD_TYPE)) {
      textParts.push(`TS: ${patient.bloodType ?? 'N/I'}`);
    }
    if (includeFields.includes(LabelField.ALLERGIES)) {
      textParts.push(`Alergias: ${allergyText}`);
    }

    const textContent = textParts.join(' | ');

    // Build payload for encoding
    const payload: Record<string, unknown> = {
      version: 1,
      type: dto.labelType,
      patientId: patient.id,
      mrn: patient.mrn,
    };

    if (includeFields.includes(LabelField.NAME)) payload['name'] = patient.fullName;
    if (includeFields.includes(LabelField.BIRTH_DATE)) {
      payload['birthDate'] = patient.birthDate?.toISOString().split('T')[0] ?? null;
    }
    if (includeFields.includes(LabelField.BLOOD_TYPE)) payload['bloodType'] = patient.bloodType;
    if (includeFields.includes(LabelField.ALLERGIES)) payload['allergies'] = allergyText;

    // Simulate base64 encoding (in production, use a barcode library)
    const payloadJson = JSON.stringify(payload);
    const imageBase64 = Buffer.from(payloadJson).toString('base64');

    return {
      patientId: patient.id,
      labelType: dto.labelType,
      format,
      imageBase64,
      textContent,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateSpecimenLabel(
    tenantId: string,
    patientId: string,
    specimenType: string,
    collectionDate: string,
  ): Promise<LabelResultDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true, fullName: true, mrn: true, birthDate: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const textContent = [
      `Nome: ${patient.fullName}`,
      `Prontuário: ${patient.mrn}`,
      `DN: ${patient.birthDate?.toISOString().split('T')[0] ?? 'N/I'}`,
      `Material: ${specimenType}`,
      `Coleta: ${collectionDate}`,
    ].join(' | ');

    const payload = {
      version: 1,
      type: 'SPECIMEN',
      patientId: patient.id,
      mrn: patient.mrn,
      name: patient.fullName,
      specimenType,
      collectionDate,
    };

    return {
      patientId: patient.id,
      labelType: LabelType.SPECIMEN,
      format: BarcodeFormat.DATAMATRIX,
      imageBase64: Buffer.from(JSON.stringify(payload)).toString('base64'),
      textContent,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateMedicationLabel(
    tenantId: string,
    patientId: string,
    medicationName: string,
    dose: string,
    route: string,
  ): Promise<LabelResultDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true, fullName: true, mrn: true, birthDate: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const allergies = await this.prisma.allergy.findMany({
      where: { patientId, status: 'ACTIVE' },
      select: { substance: true },
    });

    const textContent = [
      `Nome: ${patient.fullName}`,
      `Prontuário: ${patient.mrn}`,
      `Medicação: ${medicationName} ${dose} ${route}`,
      `Alergias: ${allergies.length > 0 ? allergies.map((a) => a.substance).join(', ') : 'NKDA'}`,
    ].join(' | ');

    const payload = {
      version: 1,
      type: 'MEDICATION',
      patientId: patient.id,
      mrn: patient.mrn,
      name: patient.fullName,
      medication: medicationName,
      dose,
      route,
    };

    return {
      patientId: patient.id,
      labelType: LabelType.MEDICATION,
      format: BarcodeFormat.CODE128,
      imageBase64: Buffer.from(JSON.stringify(payload)).toString('base64'),
      textContent,
      generatedAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // 5. Address Geolocation
  // =========================================================================

  async geocodeAddress(_tenantId: string, dto: GeocodeAddressDto): Promise<GeocodeResultDto> {
    // Stub: In production, call external geocoding API (Google Maps, Nominatim, etc.)
    const formattedAddress = [
      dto.street,
      dto.number,
      dto.neighborhood,
      dto.city,
      dto.state,
      dto.zipCode,
    ]
      .filter(Boolean)
      .join(', ');

    this.logger.log(`Geocoding address (stub): ${formattedAddress}`);

    // Return stub coordinates (approximate center of São Paulo as placeholder)
    return {
      latitude: -23.5505,
      longitude: -46.6333,
      formattedAddress,
      confidence: 0, // 0 = stub, indicates external API not configured
    };
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): { distanceKm: number; distanceMiles: number } {
    const km = haversineDistance(lat1, lon1, lat2, lon2);
    return {
      distanceKm: parseFloat(km.toFixed(2)),
      distanceMiles: parseFloat((km * 0.621371).toFixed(2)),
    };
  }

  // =========================================================================
  // 6. Document OCR
  // =========================================================================

  async processDocument(_tenantId: string, dto: DocumentOCRDto): Promise<OCRResultDto> {
    // Stub: In production, call external OCR API (AWS Textract, Google Vision, etc.)
    this.logger.log(`Processing OCR document (stub): type=${dto.documentType}, imageSize=${dto.imageBase64.length} chars`);

    const extractedFields: OCRExtractedField[] = [];

    switch (dto.documentType) {
      case DocumentOCRType.RG:
        extractedFields.push(
          { fieldName: 'name', value: '', confidence: 0 },
          { fieldName: 'rg_number', value: '', confidence: 0 },
          { fieldName: 'birthDate', value: '', confidence: 0 },
          { fieldName: 'motherName', value: '', confidence: 0 },
          { fieldName: 'fatherName', value: '', confidence: 0 },
          { fieldName: 'issueDate', value: '', confidence: 0 },
          { fieldName: 'issuingAuthority', value: '', confidence: 0 },
        );
        break;
      case DocumentOCRType.CPF:
        extractedFields.push(
          { fieldName: 'name', value: '', confidence: 0 },
          { fieldName: 'cpf_number', value: '', confidence: 0 },
          { fieldName: 'birthDate', value: '', confidence: 0 },
        );
        break;
      case DocumentOCRType.CNH:
        extractedFields.push(
          { fieldName: 'name', value: '', confidence: 0 },
          { fieldName: 'cnh_number', value: '', confidence: 0 },
          { fieldName: 'cpf_number', value: '', confidence: 0 },
          { fieldName: 'birthDate', value: '', confidence: 0 },
          { fieldName: 'motherName', value: '', confidence: 0 },
          { fieldName: 'category', value: '', confidence: 0 },
          { fieldName: 'expirationDate', value: '', confidence: 0 },
        );
        break;
      case DocumentOCRType.INSURANCE_CARD:
        extractedFields.push(
          { fieldName: 'name', value: '', confidence: 0 },
          { fieldName: 'insuranceProvider', value: '', confidence: 0 },
          { fieldName: 'insuranceNumber', value: '', confidence: 0 },
          { fieldName: 'plan', value: '', confidence: 0 },
          { fieldName: 'validUntil', value: '', confidence: 0 },
        );
        break;
      case DocumentOCRType.BIRTH_CERTIFICATE:
        extractedFields.push(
          { fieldName: 'name', value: '', confidence: 0 },
          { fieldName: 'birthDate', value: '', confidence: 0 },
          { fieldName: 'motherName', value: '', confidence: 0 },
          { fieldName: 'fatherName', value: '', confidence: 0 },
          { fieldName: 'birthPlace', value: '', confidence: 0 },
          { fieldName: 'registryNumber', value: '', confidence: 0 },
        );
        break;
    }

    return {
      extractedFields,
      overallConfidence: 0,
      rawText: '(OCR API not configured — stub response)',
      documentType: dto.documentType,
    };
  }

  mapExtractedToPatient(ocrResult: OCRResultDto): Record<string, string> {
    const patientData: Record<string, string> = {};

    for (const field of ocrResult.extractedFields) {
      if (!field.value) continue;

      switch (field.fieldName) {
        case 'name':
          patientData['fullName'] = field.value;
          break;
        case 'cpf_number':
          patientData['cpf'] = field.value;
          break;
        case 'birthDate':
          patientData['birthDate'] = field.value;
          break;
        case 'motherName':
          patientData['motherName'] = field.value;
          break;
        case 'insuranceProvider':
          patientData['insuranceProvider'] = field.value;
          break;
        case 'insuranceNumber':
          patientData['insuranceNumber'] = field.value;
          break;
        case 'rg_number':
          patientData['rgNumber'] = field.value;
          break;
      }
    }

    return patientData;
  }

  // =========================================================================
  // 7. Identity Verification (Selfie + Liveness)
  // =========================================================================

  async verifyIdentity(
    _tenantId: string,
    dto: IdentityVerificationDto,
  ): Promise<VerificationResultDto> {
    // Stub: In production, call external biometric API (AWS Rekognition, Azure Face, etc.)
    this.logger.log(
      `Identity verification (stub): patientId=${dto.patientId}, selfieSize=${dto.selfieBase64.length}, docPhotoSize=${dto.documentPhotoBase64.length}`,
    );

    return {
      isMatch: false,
      matchConfidence: 0,
      livenessCheck: LivenessCheckResult.INCONCLUSIVE,
      fraudIndicators: [],
      verifiedAt: new Date().toISOString(),
      patientId: dto.patientId,
    };
  }

  async recordVerification(
    tenantId: string,
    patientId: string,
    result: VerificationResultDto,
    authorId: string,
  ): Promise<{ id: string; recorded: boolean }> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId,
        type: 'CUSTOM',
        title: `[IDENTITY_VERIFICATION] ${result.isMatch ? 'MATCH' : 'NO_MATCH'} - Confiança: ${result.matchConfidence}%`,
        content: JSON.stringify({
          isMatch: result.isMatch,
          matchConfidence: result.matchConfidence,
          livenessCheck: result.livenessCheck,
          fraudIndicators: result.fraudIndicators,
          verifiedAt: result.verifiedAt,
        }),
        status: 'FINAL',
      },
    });

    return { id: doc.id, recorded: true };
  }
}
