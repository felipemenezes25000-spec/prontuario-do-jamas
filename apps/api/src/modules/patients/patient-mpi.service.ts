import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MpiSearchDuplicatesDto,
  MpiMergeDto,
  MpiDuplicateCandidateDto,
  MpiMergeResultDto,
} from './dto/patient-mpi.dto';

// ============================================================================
// Phonetic helpers (Soundex + Metaphone for pt-BR)
// ============================================================================

function soundexPtBr(name: string): string {
  if (!name) return '';
  const s = name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
  if (s.length === 0) return '';
  const map: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  };
  let code = s[0];
  let last = map[s[0]] ?? '0';
  for (let i = 1; i < s.length && code.length < 4; i++) {
    const cur = map[s[i]] ?? '0';
    if (cur !== '0' && cur !== last) code += cur;
    last = cur;
  }
  return code.padEnd(4, '0');
}

function metaphonePtBr(name: string): string {
  if (!name) return '';
  let s = name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
  if (s.length === 0) return '';
  s = s.replace(/PH/g, 'F').replace(/CH/g, 'S').replace(/LH/g, 'L')
    .replace(/NH/g, 'N').replace(/SS/g, 'S').replace(/RR/g, 'R')
    .replace(/C([EI])/g, 'S$1').replace(/G([EI])/g, 'J$1')
    .replace(/QU/g, 'K').replace(/GU([EI])/g, 'G$1')
    .replace(/X/g, 'S').replace(/W/g, 'V').replace(/Y/g, 'I').replace(/H/g, '');
  let result = s[0];
  for (let i = 1; i < s.length; i++) {
    if (s[i] !== s[i - 1]) result += s[i];
  }
  if (result.length > 2) result = result.replace(/[AEIOU]+$/, '');
  return result.slice(0, 6);
}

function levenshtein(a: string, b: string): number {
  const m: number[][] = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b[i - 1] === a[j - 1]
        ? m[i - 1][j - 1]
        : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const na = a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nb = b.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const max = Math.max(na.length, nb.length);
  return max === 0 ? 1 : 1 - levenshtein(na, nb) / max;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class PatientMpiService {
  private readonly logger = new Logger(PatientMpiService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // searchDuplicates — Probabilistic MPI matching
  // =========================================================================

  async searchDuplicates(
    tenantId: string,
    dto: MpiSearchDuplicatesDto,
  ): Promise<MpiDuplicateCandidateDto[]> {
    if (!dto.fullName && !dto.cpf && !dto.birthDate) {
      throw new BadRequestException(
        'At least one of fullName, cpf, or birthDate is required',
      );
    }

    const minScore = dto.minScore ?? 30;
    const candidates = await this.prisma.patient.findMany({
      where: { tenantId, deletedAt: null },
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

    const results: MpiDuplicateCandidateDto[] = [];
    const inputFirst = dto.fullName?.trim().split(/\s+/)[0] ?? '';

    for (const candidate of candidates) {
      let score = 0;
      const reasons: string[] = [];

      if (dto.cpf && candidate.cpf) {
        const ca = dto.cpf.replace(/\D/g, '');
        const cb = candidate.cpf.replace(/\D/g, '');
        if (ca.length >= 11 && ca === cb) {
          score += 50;
          reasons.push('CPF_EXACT');
        }
      }

      if (dto.fullName && candidate.fullName) {
        const sim = similarity(dto.fullName.trim(), candidate.fullName);
        if (sim > 0.75) {
          score += Math.round(sim * 25);
          reasons.push(`NAME_SIM(${(sim * 100).toFixed(0)}%)`);
        }
        const candFirst = candidate.fullName.split(/\s+/)[0];
        if (inputFirst && soundexPtBr(inputFirst) === soundexPtBr(candFirst)) {
          score += 8;
          reasons.push('SOUNDEX_MATCH');
        }
        if (inputFirst && metaphonePtBr(inputFirst) === metaphonePtBr(candFirst)) {
          score += 7;
          reasons.push('METAPHONE_MATCH');
        }
      }

      if (dto.birthDate && candidate.birthDate) {
        const a = dto.birthDate.split('T')[0];
        const b = candidate.birthDate.toISOString().split('T')[0];
        if (a === b) {
          score += 15;
          reasons.push('BIRTHDATE_MATCH');
        }
      }

      if (dto.phone && candidate.phone) {
        const a = dto.phone.replace(/\D/g, '');
        const b = candidate.phone.replace(/\D/g, '');
        if (a.length >= 8 && a === b) {
          score += 10;
          reasons.push('PHONE_MATCH');
        }
      }

      if (dto.email && candidate.email) {
        if (dto.email.toLowerCase() === candidate.email.toLowerCase()) {
          score += 10;
          reasons.push('EMAIL_MATCH');
        }
      }

      if (score >= minScore) {
        const first = candidate.fullName.split(/\s+/)[0];
        results.push({
          id: candidate.id,
          fullName: candidate.fullName,
          cpf: candidate.cpf,
          birthDate: candidate.birthDate,
          mrn: candidate.mrn,
          phone: candidate.phone,
          email: candidate.email,
          matchScore: Math.min(score, 100),
          matchReasons: reasons,
          soundexCode: soundexPtBr(first),
          metaphoneCode: metaphonePtBr(first),
        });
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 25);
  }

  // =========================================================================
  // merge — Merge one or more secondary records into master
  // =========================================================================

  async merge(
    tenantId: string,
    dto: MpiMergeDto,
    authorId: string,
  ): Promise<MpiMergeResultDto> {
    if (dto.secondaryIds.includes(dto.masterId)) {
      throw new BadRequestException('Master ID cannot appear in secondaryIds');
    }

    const master = await this.prisma.patient.findFirst({
      where: { id: dto.masterId, tenantId },
    });
    if (!master) {
      throw new NotFoundException(`Master patient "${dto.masterId}" not found`);
    }

    const secondaries = await this.prisma.patient.findMany({
      where: { id: { in: dto.secondaryIds }, tenantId },
    });
    if (secondaries.length !== dto.secondaryIds.length) {
      throw new NotFoundException('One or more secondary patients not found');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const sec of secondaries) {
        // Reassign core clinical data
        const ops = [
          tx.encounter.updateMany({ where: { patientId: sec.id }, data: { patientId: dto.masterId } }),
          tx.vitalSigns.updateMany({ where: { patientId: sec.id }, data: { patientId: dto.masterId } }),
          tx.clinicalDocument.updateMany({ where: { patientId: sec.id, title: { not: { startsWith: '[MOTHER_NEWBORN_LINK]' } } }, data: { patientId: dto.masterId } }),
          tx.prescription.updateMany({ where: { patientId: sec.id }, data: { patientId: dto.masterId } }),
          tx.examResult.updateMany({ where: { patientId: sec.id }, data: { patientId: dto.masterId } }),
          tx.clinicalAlert.updateMany({ where: { patientId: sec.id }, data: { patientId: dto.masterId } }),
          tx.chronicCondition.updateMany({ where: { patientId: sec.id }, data: { patientId: dto.masterId } }),
          tx.familyHistory.updateMany({ where: { patientId: sec.id }, data: { patientId: dto.masterId } }),
          tx.surgicalHistory.updateMany({ where: { patientId: sec.id }, data: { patientId: dto.masterId } }),
          tx.vaccination.updateMany({ where: { patientId: sec.id }, data: { patientId: dto.masterId } }),
        ];
        await Promise.all(ops);

        // Deduplicate allergies
        const masterAllergies = await tx.allergy.findMany({
          where: { patientId: dto.masterId },
          select: { substance: true },
        });
        const masterSet = new Set(masterAllergies.map((a) => a.substance.toLowerCase()));
        const secAllergies = await tx.allergy.findMany({ where: { patientId: sec.id } });
        for (const a of secAllergies) {
          if (!masterSet.has(a.substance.toLowerCase())) {
            await tx.allergy.update({ where: { id: a.id }, data: { patientId: dto.masterId } });
          } else {
            await tx.allergy.delete({ where: { id: a.id } });
          }
        }

        // Audit document
        await tx.clinicalDocument.create({
          data: {
            tenantId,
            patientId: dto.masterId,
            authorId,
            type: 'CUSTOM',
            title: `[MPI_MERGE] ${sec.fullName} -> ${master.fullName}`,
            content: JSON.stringify({
              masterId: dto.masterId,
              masterName: master.fullName,
              secondaryId: sec.id,
              secondaryName: sec.fullName,
              reason: dto.reason ?? null,
              mergedAt: new Date().toISOString(),
              mergedBy: authorId,
            }),
            status: 'FINAL',
          },
        });

        // Soft-delete secondary
        await tx.patient.update({
          where: { id: sec.id },
          data: { deletedAt: new Date(), fullName: `[MERGED] ${sec.fullName}` },
        });
      }
    });

    this.logger.log(`MPI merge: ${dto.secondaryIds.join(',')} -> ${dto.masterId} by ${authorId}`);

    return {
      masterId: dto.masterId,
      masterName: master.fullName,
      mergedIds: dto.secondaryIds,
      mergedCount: dto.secondaryIds.length,
      mergedAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // getPotentialDuplicates — Batch scan for cross-patient duplicates
  // =========================================================================

  async getPotentialDuplicates(
    tenantId: string,
    limit = 50,
  ): Promise<Array<{ group: MpiDuplicateCandidateDto[]; topScore: number }>> {
    // TODO: Implement efficient batch MPI scan using DB indexes + phonetic codes
    // For now return a typed stub
    this.logger.log(`Potential duplicates scan requested for tenant ${tenantId}, limit ${limit}`);
    return [];
  }
}
