import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AddPatientAddressDto,
  FindDuplicatesResultDto,
} from './dto/patient-registry.dto';

// ============================================================================
// Phonetic helpers (Soundex adaptation for pt-BR)
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

/**
 * Brazilian-Portuguese Metaphone approximation.
 * Handles common pt-BR phonetic equivalences:
 * - CH/X -> S
 * - LH -> L
 * - NH -> N
 * - SS/C(EI) -> S
 * - PH -> F
 * - Trailing vowels stripped
 */
function metaphonePtBr(name: string): string {
  if (!name) return '';
  let s = name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');

  if (s.length === 0) return '';

  // Portuguese phonetic rules
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

  return result.slice(0, 6);
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

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class PatientRegistryService {
  private readonly logger = new Logger(PatientRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // searchPhonetic — Soundex + Metaphone for pt-BR name search
  // =========================================================================

  async searchPhonetic(tenantId: string, query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const firstName = query.trim().split(/\s+/)[0];
    const inputSoundex = soundexPtBr(firstName);
    const inputMetaphone = metaphonePtBr(firstName);
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
      soundexMatch: boolean;
      metaphoneMatch: boolean;
    }> = [];

    for (const patient of patients) {
      const patientFirst = patient.fullName.split(/\s+/)[0];
      const patientSoundex = soundexPtBr(patientFirst);
      const patientMetaphone = metaphonePtBr(patientFirst);
      const soundexMatch = inputSoundex === patientSoundex && inputSoundex !== '';
      const metaphoneMatch = inputMetaphone === patientMetaphone && inputMetaphone !== '';
      const similarity = nameSimilarity(query.trim(), patient.fullName);

      // Include if any phonetic match or high similarity
      if (soundexMatch || metaphoneMatch || similarity > 0.5) {
        results.push({
          id: patient.id,
          fullName: patient.fullName,
          cpf: patient.cpf,
          birthDate: patient.birthDate,
          mrn: patient.mrn,
          phone: patient.phone,
          gender: patient.gender,
          similarity: parseFloat(similarity.toFixed(3)),
          soundexMatch,
          metaphoneMatch,
        });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 30);
  }

  // =========================================================================
  // findDuplicates — MPI duplicate detection using name, CPF, birth date
  // =========================================================================

  async findDuplicates(
    tenantId: string,
    patientId: string,
  ): Promise<FindDuplicatesResultDto[]> {
    const sourcePatient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: {
        id: true,
        fullName: true,
        cpf: true,
        birthDate: true,
        mrn: true,
        phone: true,
        email: true,
      },
    });

    if (!sourcePatient) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    // Fetch other patients in the tenant
    const candidates = await this.prisma.patient.findMany({
      where: {
        tenantId,
        id: { not: patientId },
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        cpf: true,
        birthDate: true,
        mrn: true,
        phone: true,
        email: true,
      },
      take: 5000,
    });

    const duplicates: FindDuplicatesResultDto[] = [];

    for (const candidate of candidates) {
      let score = 0;
      const reasons: string[] = [];

      // CPF exact match (strongest signal: +50)
      if (sourcePatient.cpf && candidate.cpf) {
        const cleanSource = sourcePatient.cpf.replace(/\D/g, '');
        const cleanCandidate = candidate.cpf.replace(/\D/g, '');
        if (cleanSource.length >= 11 && cleanSource === cleanCandidate) {
          score += 50;
          reasons.push('CPF_EXACT_MATCH');
        }
      }

      // Name similarity (+25 max)
      if (sourcePatient.fullName && candidate.fullName) {
        const sim = nameSimilarity(sourcePatient.fullName, candidate.fullName);
        if (sim > 0.8) {
          score += Math.round(sim * 25);
          reasons.push(`NAME_SIMILAR(${(sim * 100).toFixed(0)}%)`);
        }

        // Phonetic match (+10)
        const sourceFirst = sourcePatient.fullName.split(/\s+/)[0];
        const candidateFirst = candidate.fullName.split(/\s+/)[0];
        if (
          soundexPtBr(sourceFirst) === soundexPtBr(candidateFirst) &&
          soundexPtBr(sourceFirst) !== ''
        ) {
          score += 10;
          reasons.push('PHONETIC_MATCH');
        }
      }

      // Birth date match (+15)
      if (sourcePatient.birthDate && candidate.birthDate) {
        const sourceDate = sourcePatient.birthDate.toISOString().split('T')[0];
        const candidateDate = candidate.birthDate.toISOString().split('T')[0];
        if (sourceDate === candidateDate) {
          score += 15;
          reasons.push('BIRTH_DATE_MATCH');
        }
      }

      // Phone match (+10)
      if (sourcePatient.phone && candidate.phone) {
        const cleanSourcePhone = sourcePatient.phone.replace(/\D/g, '');
        const cleanCandidatePhone = candidate.phone.replace(/\D/g, '');
        if (cleanSourcePhone.length >= 8 && cleanSourcePhone === cleanCandidatePhone) {
          score += 10;
          reasons.push('PHONE_MATCH');
        }
      }

      // Email match (+10)
      if (sourcePatient.email && candidate.email) {
        if (sourcePatient.email.toLowerCase() === candidate.email.toLowerCase()) {
          score += 10;
          reasons.push('EMAIL_MATCH');
        }
      }

      // Threshold: only include candidates with score > 25
      if (score > 25) {
        duplicates.push({
          id: candidate.id,
          fullName: candidate.fullName,
          cpf: candidate.cpf,
          birthDate: candidate.birthDate,
          mrn: candidate.mrn,
          matchScore: Math.min(score, 100),
          matchReasons: reasons,
        });
      }
    }

    return duplicates
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);
  }

  // =========================================================================
  // mergePatients — Merge secondary into primary, reassign all records
  // =========================================================================

  async mergePatients(
    tenantId: string,
    primaryId: string,
    secondaryId: string,
    authorId: string,
  ) {
    if (primaryId === secondaryId) {
      throw new BadRequestException('Cannot merge a patient with itself');
    }

    const [primary, secondary] = await Promise.all([
      this.prisma.patient.findFirst({ where: { id: primaryId, tenantId } }),
      this.prisma.patient.findFirst({ where: { id: secondaryId, tenantId } }),
    ]);

    if (!primary) {
      throw new NotFoundException(`Primary patient with ID "${primaryId}" not found`);
    }
    if (!secondary) {
      throw new NotFoundException(`Secondary patient with ID "${secondaryId}" not found`);
    }

    // Create audit record before merge
    const mergeAudit = {
      primaryId,
      secondaryId,
      primaryName: primary.fullName,
      secondaryName: secondary.fullName,
      primaryCpf: primary.cpf,
      secondaryCpf: secondary.cpf,
      mergedAt: new Date().toISOString(),
      mergedBy: authorId,
    };

    // Reassign all clinical data from secondary to primary using a transaction
    await this.prisma.$transaction(async (tx) => {
      // Reassign encounters
      await tx.encounter.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      });

      // Reassign vital signs
      await tx.vitalSigns.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      });

      // Reassign clinical documents
      await tx.clinicalDocument.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      });

      // Reassign prescriptions
      await tx.prescription.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      });

      // Reassign exam results
      await tx.examResult.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      });

      // Reassign clinical alerts
      await tx.clinicalAlert.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      });

      // Reassign allergies (check for duplicates by substance)
      const primaryAllergies = await tx.allergy.findMany({
        where: { patientId: primaryId },
        select: { substance: true },
      });
      const primaryAllergySubstances = new Set(
        primaryAllergies.map((a) => a.substance.toLowerCase()),
      );

      const secondaryAllergies = await tx.allergy.findMany({
        where: { patientId: secondaryId },
      });

      for (const allergy of secondaryAllergies) {
        if (!primaryAllergySubstances.has(allergy.substance.toLowerCase())) {
          await tx.allergy.update({
            where: { id: allergy.id },
            data: { patientId: primaryId },
          });
        } else {
          // Duplicate allergy, delete the secondary copy
          await tx.allergy.delete({ where: { id: allergy.id } });
        }
      }

      // Reassign chronic conditions
      await tx.chronicCondition.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      });

      // Reassign family history
      await tx.familyHistory.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      });

      // Reassign surgical history
      await tx.surgicalHistory.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      });

      // Reassign vaccinations
      await tx.vaccination.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      });

      // Create merge audit document
      await tx.clinicalDocument.create({
        data: {
          tenantId,
          patientId: primaryId,
          authorId,
          type: 'CUSTOM',
          title: `[PATIENT_MERGE] ${secondary.fullName} -> ${primary.fullName}`,
          content: JSON.stringify(mergeAudit),
          status: 'FINAL',
        },
      });

      // Soft-delete the secondary patient
      await tx.patient.update({
        where: { id: secondaryId },
        data: {
          deletedAt: new Date(),
          fullName: `[MERGED] ${secondary.fullName}`,
        },
      });
    });

    this.logger.log(
      `Patient merge completed: ${secondaryId} -> ${primaryId} by ${authorId}`,
    );

    return {
      primaryId,
      secondaryId,
      status: 'MERGED',
      mergedAt: mergeAudit.mergedAt,
      message: `Paciente "${secondary.fullName}" foi incorporado ao registro de "${primary.fullName}".`,
    };
  }

  // =========================================================================
  // generateBarcode — QR code and barcode data for wristband
  // =========================================================================

  async generateBarcode(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
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
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    // Check allergies for wristband alert
    const allergies = await this.prisma.allergy.findMany({
      where: { patientId, status: 'ACTIVE' },
      select: { substance: true, severity: true },
    });

    const highRiskAllergies = allergies.filter(
      (a) => a.severity === 'SEVERE' || a.severity === 'LIFE_THREATENING',
    );

    // QR data includes essential identification + safety info
    const qrPayload = {
      version: 1,
      id: patient.id,
      mrn: patient.mrn,
      name: patient.fullName,
      birthDate: patient.birthDate?.toISOString().split('T')[0] ?? null,
      bloodType: patient.bloodType ?? null,
      gender: patient.gender,
      allergyAlert: highRiskAllergies.length > 0,
      allergyCount: allergies.length,
      highRiskAllergies: highRiskAllergies.map((a) => a.substance),
    };

    return {
      patientId: patient.id,
      mrn: patient.mrn,
      fullName: patient.fullName,
      qrData: JSON.stringify(qrPayload),
      barcodeData: patient.mrn,
      barcodeType: 'CODE128',
      allergyAlert: highRiskAllergies.length > 0,
      applications: [
        'wristband',
        'collection_tube',
        'printed_record',
        'medication_label',
        'specimen_label',
      ],
    };
  }

  // =========================================================================
  // addAddress — Multiple addresses support
  // =========================================================================

  async addAddress(tenantId: string, patientId: string, dto: AddPatientAddressDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    // If setting as primary, unset other primary addresses
    if (dto.isPrimary) {
      const existing = await this.prisma.clinicalDocument.findMany({
        where: {
          patientId,
          tenantId,
          title: { startsWith: '[ADDRESS:' },
        },
      });

      for (const addr of existing) {
        const parsed = JSON.parse(addr.content ?? '{}');
        if (parsed.isPrimary) {
          await this.prisma.clinicalDocument.update({
            where: { id: addr.id },
            data: {
              content: JSON.stringify({ ...parsed, isPrimary: false }),
            },
          });
        }
      }
    }

    const fullAddress = [
      dto.street,
      dto.number,
      dto.complement,
      dto.neighborhood,
      `${dto.city}-${dto.state}`,
      dto.zipCode,
    ]
      .filter(Boolean)
      .join(', ');

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId: patientId, // self-authored address record
        type: 'CUSTOM',
        title: `[ADDRESS:${dto.type}] ${fullAddress.slice(0, 100)}`,
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

    return {
      id: doc.id,
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
    };
  }

  async listAddresses(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: '[ADDRESS:' } },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content ?? '{}'),
      createdAt: doc.createdAt,
    }));
  }

  async deleteAddress(tenantId: string, patientId: string, addressId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: addressId,
        patientId,
        tenantId,
        title: { startsWith: '[ADDRESS:' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Address with ID "${addressId}" not found`);
    }

    await this.prisma.clinicalDocument.delete({ where: { id: addressId } });

    return { deleted: true, addressId };
  }

  // =========================================================================
  // linkNewborn — Link mother-baby records
  // =========================================================================

  async linkNewborn(
    tenantId: string,
    motherId: string,
    newbornId: string,
    authorId: string,
  ) {
    if (motherId === newbornId) {
      throw new BadRequestException('Mother and newborn IDs must be different');
    }

    const [mother, newborn] = await Promise.all([
      this.prisma.patient.findFirst({ where: { id: motherId, tenantId } }),
      this.prisma.patient.findFirst({ where: { id: newbornId, tenantId } }),
    ]);

    if (!mother) {
      throw new NotFoundException(`Mother with ID "${motherId}" not found`);
    }
    if (!newborn) {
      throw new NotFoundException(`Newborn with ID "${newbornId}" not found`);
    }

    // Check if link already exists
    const existingLink = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId: newbornId,
        title: { startsWith: '[MOTHER_NEWBORN_LINK]' },
      },
    });

    if (existingLink) {
      const existingData = JSON.parse(existingLink.content ?? '{}');
      if (existingData.motherId === motherId) {
        throw new ConflictException(
          'This mother-newborn link already exists',
        );
      }
    }

    const linkContent = {
      motherId,
      motherName: mother.fullName,
      motherMrn: mother.mrn,
      motherCpf: mother.cpf,
      newbornId,
      newbornName: newborn.fullName,
      newbornMrn: newborn.mrn,
      linkedAt: new Date().toISOString(),
      linkedBy: authorId,
    };

    // Create link document on the newborn record
    const newbornDoc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: newbornId,
        authorId,
        type: 'CUSTOM',
        title: `[MOTHER_NEWBORN_LINK] Mae: ${mother.fullName}`,
        content: JSON.stringify(linkContent),
        status: 'FINAL',
      },
    });

    // Also create a reference document on the mother's record
    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: motherId,
        authorId,
        type: 'CUSTOM',
        title: `[MOTHER_NEWBORN_LINK] RN: ${newborn.fullName}`,
        content: JSON.stringify({
          ...linkContent,
          perspective: 'MOTHER_RECORD',
        }),
        status: 'FINAL',
      },
    });

    // Copy mother's insurance to newborn if newborn doesn't have one
    if (!newborn.insuranceProvider && mother.insuranceProvider) {
      await this.prisma.patient.update({
        where: { id: newbornId },
        data: {
          insuranceProvider: mother.insuranceProvider,
          insuranceNumber: mother.insuranceNumber,
        },
      });
    }

    return {
      linkId: newbornDoc.id,
      motherId,
      motherName: mother.fullName,
      newbornId,
      newbornName: newborn.fullName,
      linkedAt: linkContent.linkedAt,
    };
  }

  // =========================================================================
  // getMotherNewbornLinks — List all mother-newborn links for a patient
  // =========================================================================

  async getMotherNewbornLinks(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[MOTHER_NEWBORN_LINK]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content ?? '{}'),
      createdAt: doc.createdAt,
    }));
  }
}
