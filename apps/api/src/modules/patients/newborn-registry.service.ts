import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Gender } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RegisterNewbornDto,
  NewbornRegistryResultDto,
  MotherLinkResultDto,
  NewbornGender,
} from './dto/newborn-registry.dto';

function generateMrn(): string {
  const year = new Date().getFullYear().toString().slice(2);
  const seq = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `RN${year}${seq}`;
}

function genderToEnum(g: NewbornGender): Gender {
  const map: Record<NewbornGender, Gender> = {
    [NewbornGender.MALE]: Gender.M,
    [NewbornGender.FEMALE]: Gender.F,
    [NewbornGender.INDETERMINATE]: Gender.OTHER,
  };
  return map[g];
}

@Injectable()
export class NewbornRegistryService {
  private readonly logger = new Logger(NewbornRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // register — Create newborn patient linked to mother
  // =========================================================================

  async register(
    tenantId: string,
    dto: RegisterNewbornDto,
    authorId: string,
  ): Promise<NewbornRegistryResultDto> {
    const mother = await this.prisma.patient.findFirst({
      where: { id: dto.motherId, tenantId },
    });
    if (!mother) {
      throw new NotFoundException(`Mother patient "${dto.motherId}" not found`);
    }

    const newbornName = dto.newbornName ?? `RN de ${mother.fullName}`;
    const mrn = generateMrn();

    const birthDate = new Date(dto.birthDateTime);

    // Inherit mother's insurance if requested
    const inheritInsurance = dto.inheritMotherInsurance !== false;

    const newborn = await this.prisma.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: {
          tenantId,
          fullName: newbornName,
          mrn,
          birthDate,
          gender: genderToEnum(dto.gender),
          insuranceProvider: inheritInsurance ? mother.insuranceProvider : null,
          insuranceNumber: inheritInsurance ? mother.insuranceNumber : null,
        },
      });

      // Birth event document on newborn
      await tx.clinicalDocument.create({
        data: {
          tenantId,
          patientId: created.id,
          authorId,
          type: 'CUSTOM',
          title: `[NEWBORN_BIRTH] ${newbornName}`,
          content: JSON.stringify({
            birthDateTime: dto.birthDateTime,
            gender: dto.gender,
            deliveryType: dto.deliveryType,
            vitalStatus: dto.vitalStatus,
            birthWeightGrams: dto.birthWeightGrams ?? null,
            birthLengthCm: dto.birthLengthCm ?? null,
            apgar1min: dto.apgar1min ?? null,
            apgar5min: dto.apgar5min ?? null,
            gestationalAgeWeeks: dto.gestationalAgeWeeks ?? null,
            attendingProviderId: dto.attendingProviderId ?? null,
            deliveryNotes: dto.deliveryNotes ?? null,
            motherId: mother.id,
            motherName: mother.fullName,
            motherMrn: mother.mrn,
          }),
          status: 'FINAL',
        },
      });

      // Mother-newborn link document on newborn record
      const linkContent = {
        motherId: mother.id,
        motherName: mother.fullName,
        motherMrn: mother.mrn,
        motherCpf: mother.cpf,
        newbornId: created.id,
        newbornName,
        newbornMrn: mrn,
        linkedAt: new Date().toISOString(),
        linkedBy: authorId,
        birthDateTime: dto.birthDateTime,
      };

      const linkDoc = await tx.clinicalDocument.create({
        data: {
          tenantId,
          patientId: created.id,
          authorId,
          type: 'CUSTOM',
          title: `[MOTHER_NEWBORN_LINK] Mae: ${mother.fullName}`,
          content: JSON.stringify(linkContent),
          status: 'FINAL',
        },
      });

      // Mirror link document on mother's record
      await tx.clinicalDocument.create({
        data: {
          tenantId,
          patientId: mother.id,
          authorId,
          type: 'CUSTOM',
          title: `[MOTHER_NEWBORN_LINK] RN: ${newbornName}`,
          content: JSON.stringify({ ...linkContent, perspective: 'MOTHER_RECORD' }),
          status: 'FINAL',
        },
      });

      return { created, linkId: linkDoc.id };
    });

    this.logger.log(
      `Newborn registered: mrn=${mrn} mother=${dto.motherId} by ${authorId}`,
    );

    return {
      newbornId: newborn.created.id,
      newbornMrn: mrn,
      newbornName,
      motherId: mother.id,
      motherName: mother.fullName,
      birthDateTime: dto.birthDateTime,
      gender: dto.gender,
      deliveryType: dto.deliveryType,
      birthWeightGrams: dto.birthWeightGrams ?? null,
      apgar1min: dto.apgar1min ?? null,
      apgar5min: dto.apgar5min ?? null,
      linkId: newborn.linkId,
    };
  }

  // =========================================================================
  // getMotherLink — Retrieve mother link for a newborn patient
  // =========================================================================

  async getMotherLink(
    tenantId: string,
    newbornId: string,
  ): Promise<MotherLinkResultDto> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId: newbornId,
        title: { startsWith: '[MOTHER_NEWBORN_LINK]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!doc) {
      throw new NotFoundException(
        `No mother link found for newborn "${newbornId}"`,
      );
    }

    const data = JSON.parse(doc.content ?? '{}');

    return {
      newbornId,
      newbornName: data.newbornName ?? '',
      newbornMrn: data.newbornMrn ?? '',
      motherId: data.motherId ?? '',
      motherName: data.motherName ?? '',
      motherMrn: data.motherMrn ?? '',
      motherCpf: data.motherCpf ?? null,
      linkedAt: data.linkedAt ?? '',
      birthDateTime: data.birthDateTime ?? null,
    };
  }
}
