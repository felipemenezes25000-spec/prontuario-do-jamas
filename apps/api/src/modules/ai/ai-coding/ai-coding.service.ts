import { Injectable, Logger } from '@nestjs/common';
import {
  IcdSuggestionsResponseDto,
  CbhpmSuggestionsResponseDto,
  ImproveSpecificityResponseDto,
  EncounterCodingResponseDto,
} from './dto/ai-coding.dto';

@Injectable()
export class AiCodingService {
  private readonly logger = new Logger(AiCodingService.name);

  async suggestIcd(
    _tenantId: string,
    clinicalText: string,
    subjective?: string,
    assessment?: string,
    maxSuggestions = 5,
  ): Promise<IcdSuggestionsResponseDto> {
    this.logger.log(`Suggesting ICD-10 codes from clinical text (${clinicalText.length} chars)`);

    // Stub — in production calls GPT-4o with medical coding prompts
    return {
      suggestions: [
        {
          code: 'J06.9',
          description: 'Infecção aguda das vias aéreas superiores não especificada',
          confidence: 0.92,
          category: 'Doenças do aparelho respiratório',
          reasoning: 'Sintomas de IVAS descritos na nota clínica',
        },
        {
          code: 'R50.9',
          description: 'Febre não especificada',
          confidence: 0.78,
          category: 'Sintomas gerais',
          reasoning: 'Febre mencionada como sintoma associado',
        },
        {
          code: 'J02.9',
          description: 'Faringite aguda não especificada',
          confidence: 0.65,
          category: 'Doenças do aparelho respiratório',
          reasoning: 'Dor de garganta mencionada no subjetivo',
        },
      ].slice(0, maxSuggestions),
      aiModel: 'gpt-4o',
      clinicalContext: subjective ?? assessment ?? clinicalText.slice(0, 200),
    };
  }

  async suggestCbhpm(
    _tenantId: string,
    procedureText: string,
    _procedures?: string[],
  ): Promise<CbhpmSuggestionsResponseDto> {
    this.logger.log(`Suggesting CBHPM codes for: ${procedureText.slice(0, 80)}`);

    return {
      suggestions: [
        {
          code: '1.01.01.01-0',
          description: 'Consulta em consultório (no horário normal ou preestabelecido)',
          confidence: 0.95,
          category: 'Consultas',
        },
        {
          code: '4.03.01.22-0',
          description: 'Hemograma com contagem de plaquetas ou frações',
          confidence: 0.88,
          category: 'Patologia clínica / Medicina laboratorial',
        },
      ],
      aiModel: 'gpt-4o',
    };
  }

  async improveSpecificity(
    _tenantId: string,
    currentCode: string,
    _clinicalContext: string,
  ): Promise<ImproveSpecificityResponseDto> {
    this.logger.log(`Improving specificity for code ${currentCode}`);

    return {
      originalCode: currentCode,
      originalDescription: 'Código genérico',
      improvedCodes: [
        {
          code: `${currentCode.replace('.9', '.0')}`,
          description: 'Versão mais específica do diagnóstico',
          confidence: 0.85,
          reasoning: 'Baseado no contexto clínico fornecido, código mais específico aplicável',
        },
      ],
      explanation:
        'A documentação clínica permite maior especificidade. ' +
        'Códigos mais específicos melhoram a precisão do faturamento e a qualidade dos dados epidemiológicos.',
    };
  }

  async getEncounterCoding(
    _tenantId: string,
    encounterId: string,
  ): Promise<EncounterCodingResponseDto> {
    this.logger.log(`Getting coding suggestions for encounter ${encounterId}`);

    return {
      encounterId,
      diagnosisCodes: [
        {
          code: 'I10',
          description: 'Hipertensão essencial (primária)',
          confidence: 0.95,
          reasoning: 'Diagnóstico principal documentado',
        },
        {
          code: 'E11.9',
          description: 'Diabetes mellitus tipo 2 sem complicações',
          confidence: 0.90,
          reasoning: 'Comorbidade ativa mencionada',
        },
      ],
      procedureCodes: [
        {
          code: '1.01.01.01-0',
          description: 'Consulta em consultório',
          confidence: 0.98,
        },
      ],
      missingDocumentation: [
        'Estágio da hipertensão não documentado (poderia qualificar I11-I13)',
        'Resultado de HbA1c não registrado — impacta especificidade do DM2',
      ],
      specificityOpportunities: [
        {
          currentCode: 'E11.9',
          suggestedCode: 'E11.65',
          reason: 'Se documentar presença/ausência de complicações microvasculares',
        },
      ],
    };
  }
}
