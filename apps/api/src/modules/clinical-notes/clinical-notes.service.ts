import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto';
import { UpdateClinicalNoteDto } from './dto/update-clinical-note.dto';

@Injectable()
export class ClinicalNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, dto: CreateClinicalNoteDto) {
    const author = await this.prisma.user.findUnique({ where: { id: authorId } });
    if (!author) {
      throw new NotFoundException('Author not found');
    }

    return this.prisma.clinicalNote.create({
      data: {
        encounterId: dto.encounterId,
        authorId,
        authorRole: dto.authorRole ?? author.role,
        type: dto.type,
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
        freeText: dto.freeText,
        diagnosisCodes: dto.diagnosisCodes ?? [],
        procedureCodes: dto.procedureCodes ?? [],
        voiceTranscriptionId: dto.voiceTranscriptionId,
        wasGeneratedByAI: dto.wasGeneratedByAI ?? false,
      },
    });
  }

  async findByEncounter(encounterId: string) {
    return this.prisma.clinicalNote.findMany({
      where: { encounterId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, role: true } },
        signedBy: { select: { id: true, name: true } },
        amendments: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async findById(id: string) {
    const note = await this.prisma.clinicalNote.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, role: true } },
        signedBy: { select: { id: true, name: true } },
        cosignedBy: { select: { id: true, name: true } },
        voiceTranscription: true,
        parentNote: true,
        amendments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!note) {
      throw new NotFoundException(`Clinical note with ID "${id}" not found`);
    }

    return note;
  }

  async update(id: string, dto: UpdateClinicalNoteDto) {
    const note = await this.findById(id);

    if (note.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT notes can be edited');
    }

    return this.prisma.clinicalNote.update({
      where: { id },
      data: dto,
    });
  }

  async sign(id: string, signedById: string) {
    const note = await this.findById(id);

    if (note.status === 'SIGNED') {
      throw new BadRequestException('Note is already signed');
    }

    return this.prisma.clinicalNote.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signedById,
      },
    });
  }

  async createAddendum(
    parentNoteId: string,
    authorId: string,
    dto: CreateClinicalNoteDto,
  ) {
    const parentNote = await this.findById(parentNoteId);

    const author = await this.prisma.user.findUnique({ where: { id: authorId } });
    if (!author) {
      throw new NotFoundException('Author not found');
    }

    // Update parent note status
    await this.prisma.clinicalNote.update({
      where: { id: parentNoteId },
      data: { status: 'AMENDED' },
    });

    return this.prisma.clinicalNote.create({
      data: {
        encounterId: parentNote.encounterId,
        authorId,
        authorRole: dto.authorRole ?? author.role,
        type: 'ADDENDUM',
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
        freeText: dto.freeText,
        diagnosisCodes: dto.diagnosisCodes ?? [],
        procedureCodes: dto.procedureCodes ?? [],
        parentNoteId,
        version: parentNote.version + 1,
      },
    });
  }
}
