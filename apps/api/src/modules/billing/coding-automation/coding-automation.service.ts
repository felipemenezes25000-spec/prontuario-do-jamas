import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SuggestCodingDto, ValidateCodingDto } from './coding-automation.dto';

export interface CodingSuggestion {
  system: string;
  code: string;
  description: string;
  confidence: number;
  reasoning: string;
}

@Injectable()
export class CodingAutomationService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestCoding(tenantId: string, dto: SuggestCodingDto) {
    // In production, this calls GPT-4o to extract codes from clinical text
    // For now, return structured suggestions based on keyword matching
    const text = dto.clinicalText.toLowerCase();
    const suggestions: CodingSuggestion[] = [];

    // CID-10 suggestions
    const cidMap: Array<{ keywords: string[]; code: string; description: string }> = [
      { keywords: ['hipertensão', 'pressão alta', 'hipertensao'], code: 'I10', description: 'Hipertensão essencial (primária)' },
      { keywords: ['diabetes', 'diabético', 'glicemia'], code: 'E11', description: 'Diabetes mellitus tipo 2' },
      { keywords: ['pneumonia'], code: 'J18.9', description: 'Pneumonia não especificada' },
      { keywords: ['fratura'], code: 'T14.2', description: 'Fratura de região não especificada do corpo' },
      { keywords: ['infarto', 'infarto agudo', 'iam'], code: 'I21.9', description: 'Infarto agudo do miocárdio não especificado' },
      { keywords: ['asma'], code: 'J45', description: 'Asma' },
      { keywords: ['cefaleia', 'dor de cabeça', 'enxaqueca'], code: 'R51', description: 'Cefaleia' },
      { keywords: ['lombalgia', 'dor lombar'], code: 'M54.5', description: 'Dor lombar baixa' },
      { keywords: ['insuficiência cardíaca', 'icc'], code: 'I50.9', description: 'Insuficiência cardíaca não especificada' },
      { keywords: ['depressão', 'depressivo'], code: 'F32.9', description: 'Episódio depressivo não especificado' },
    ];

    for (const entry of cidMap) {
      if (entry.keywords.some((kw) => text.includes(kw))) {
        suggestions.push({
          system: 'CID10',
          code: entry.code,
          description: entry.description,
          confidence: 0.85,
          reasoning: `Keyword match: "${entry.keywords.find((kw) => text.includes(kw))}"`,
        });
      }
    }

    // CBHPM suggestions based on encounter type keywords
    const cbhpmMap: Array<{ keywords: string[]; code: string; description: string }> = [
      { keywords: ['consulta', 'avaliação'], code: '1.01.01.01-8', description: 'Consulta em consultório' },
      { keywords: ['hemograma'], code: '4.03.01.22-0', description: 'Hemograma completo' },
      { keywords: ['raio-x', 'radiografia'], code: '4.08.01.01-6', description: 'Radiografia' },
      { keywords: ['eletrocardiograma', 'ecg'], code: '4.01.01.32-0', description: 'Eletrocardiograma' },
      { keywords: ['ultrassom', 'ecografia'], code: '4.08.08.01-7', description: 'Ecografia' },
    ];

    for (const entry of cbhpmMap) {
      if (entry.keywords.some((kw) => text.includes(kw))) {
        suggestions.push({
          system: 'CBHPM',
          code: entry.code,
          description: entry.description,
          confidence: 0.80,
          reasoning: `Procedure keyword match`,
        });
      }
    }

    // If no matches found, suggest a generic consultation
    if (suggestions.length === 0) {
      suggestions.push({
        system: 'CBHPM',
        code: '1.01.01.01-8',
        description: 'Consulta em consultório (genérica)',
        confidence: 0.50,
        reasoning: 'No specific conditions identified — default consultation code',
      });
    }

    // Persist AI suggestions to billing entry if encounter provided
    if (dto.encounterId) {
      await this.prisma.billingEntry.updateMany({
        where: { encounterId: dto.encounterId },
        data: { aiCodingSuggestions: JSON.parse(JSON.stringify(suggestions)) },
      });
    }

    return {
      suggestions,
      codingSystem: dto.codingSystem ?? 'ALL',
      totalSuggestions: suggestions.length,
    };
  }

  async validateCoding(tenantId: string, dto: ValidateCodingDto) {
    const results = dto.codes.map((code) => {
      // Basic validation of code format
      let isValid = false;
      let message = '';

      switch (code.system) {
        case 'CID10':
          isValid = /^[A-Z]\d{2}(\.\d{1,2})?$/.test(code.code);
          message = isValid ? 'Código CID-10 válido' : 'Formato CID-10 inválido (esperado: X00 ou X00.0)';
          break;
        case 'CBHPM':
          isValid = /^\d{1}\.\d{2}\.\d{2}\.\d{2}-\d{1}$/.test(code.code);
          message = isValid ? 'Código CBHPM válido' : 'Formato CBHPM inválido';
          break;
        case 'TUSS':
          isValid = /^\d{8}$/.test(code.code);
          message = isValid ? 'Código TUSS válido' : 'Formato TUSS inválido (esperado: 8 dígitos)';
          break;
        default:
          message = 'Sistema de codificação não reconhecido';
      }

      return {
        system: code.system,
        code: code.code,
        description: code.description,
        isValid,
        message,
      };
    });

    return {
      validationResults: results,
      allValid: results.every((r) => r.isValid),
      invalidCount: results.filter((r) => !r.isValid).length,
    };
  }

  async getCodingForEncounter(tenantId: string, encounterId: string) {
    const billingEntries = await this.prisma.billingEntry.findMany({
      where: { encounterId, tenantId },
      select: {
        id: true,
        guideType: true,
        items: true,
        aiCodingSuggestions: true,
        createdAt: true,
      },
    });

    if (billingEntries.length === 0) {
      throw new NotFoundException('Nenhuma entrada de faturamento para este atendimento.');
    }

    // Also get clinical notes for the encounter to extract diagnosis codes
    const notes = await this.prisma.clinicalNote.findMany({
      where: { encounterId },
      select: { diagnosisCodes: true, procedureCodes: true, assessment: true },
    });

    const diagnosisCodes = [...new Set(notes.flatMap((n) => n.diagnosisCodes))];
    const procedureCodes = [...new Set(notes.flatMap((n) => n.procedureCodes))];

    return {
      encounterId,
      billingEntries: billingEntries.map((be) => ({
        id: be.id,
        guideType: be.guideType,
        items: be.items,
        aiSuggestions: be.aiCodingSuggestions,
      })),
      diagnosisCodes,
      procedureCodes,
    };
  }
}
