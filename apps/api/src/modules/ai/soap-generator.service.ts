import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { PatientContextBuilder } from './patient-context.builder';
import { AiCacheService } from './ai-cache.service';
import { getSpecialtyPrompt } from './prompts';
import { createHash } from 'crypto';

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnosisCodes: string[];
  suggestedExams: string[];
  suggestedMedications: Array<{
    name: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
  }>;
}

export interface PatientContext {
  name?: string;
  age?: number;
  gender?: string;
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  lastEncounterSummary?: string;
}

@Injectable()
export class SoapGeneratorService {
  private readonly logger = new Logger(SoapGeneratorService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
    private readonly patientContextBuilder: PatientContextBuilder,
    private readonly aiCache: AiCacheService,
  ) {}

  /**
   * Generate SOAP note from transcription and patient context using GPT-4o.
   * Now supports specialty-specific prompts and RAG-lite patient context.
   */
  async generateSOAP(
    transcription: string,
    patientContext?: PatientContext | Record<string, unknown>,
    doctorSpecialty?: string,
    patientId?: string,
  ): Promise<SOAPNote> {
    const startTime = Date.now();
    this.logger.log(
      `generateSOAP called - transcriptionLength: ${transcription.length}, specialty: ${doctorSpecialty ?? 'none'}, patientId: ${patientId ?? 'none'}`,
    );

    // Check cache
    const cacheKey = this.buildCacheKey(transcription, doctorSpecialty, patientId);
    const cached = await this.aiCache.get<SOAPNote>(cacheKey);
    if (cached) {
      this.logger.log('generateSOAP returning cached result');
      return cached;
    }

    try {
      // Build patient context from DB if patientId is provided and no context was given
      let patientInfo: string;
      if (patientId && (!patientContext || Object.keys(patientContext).length === 0)) {
        patientInfo = await this.patientContextBuilder.build(patientId);
      } else {
        const ctx = patientContext ?? {};
        patientInfo = this.buildPatientInfoBlock(ctx);
      }

      // Get specialty-specific prompt
      const specialtyPrompt = getSpecialtyPrompt(doctorSpecialty);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `${specialtyPrompt.systemPrompt}

Voce e um sistema especializado em documentacao medica brasileira. Sua tarefa e gerar uma nota SOAP completa e profissional a partir de uma transcricao de consulta medica.

Especialidade: ${specialtyPrompt.name}
Orientacao especifica: ${specialtyPrompt.soapGuidance}

${patientInfo}

Siga rigorosamente as normas do CFM/CRM para documentacao clinica.

Retorne um JSON com a seguinte estrutura:
{
  "subjective": "Secao Subjetivo - Queixa principal, HDA (historia da doenca atual), antecedentes relevantes, relato do paciente em suas proprias palavras. Use aspas para citacoes diretas do paciente.",
  "objective": "Secao Objetivo - Exame fisico, sinais vitais, dados mensuraveis, achados clinicos objetivos. Seja factual e preciso. NAO inclua interpretacoes.",
  "assessment": "Secao Avaliacao - Hipoteses diagnosticas com codigos CID-10, diagnosticos diferenciais, correlacao clinico-laboratorial, raciocinio clinico.",
  "plan": "Secao Plano - Conduta terapeutica, exames solicitados, encaminhamentos, orientacoes, retorno. Seja especifico e acionavel.",
  "diagnosisCodes": ["CID-10 codes relevantes, ex: J06.9"],
  "suggestedExams": ["exames sugeridos com base na avaliacao"],
  "suggestedMedications": [{"name": "nome", "dose": "dose", "route": "via", "frequency": "frequencia", "duration": "duracao"}]
}

Regras:
- Toda terminologia deve estar em portugues brasileiro medico
- Codigos CID-10 devem ser validos
- O Objetivo deve conter APENAS dados mensuraveis/observaveis
- O Subjetivo deve refletir a perspectiva do paciente
- A Avaliacao deve incluir diagnosticos diferenciais quando apropriado
- O Plano deve ser acionavel e especifico
- Se informacao nao estiver disponivel na transcricao, nao invente — omita ou indique "nao relatado"
- Considere alergias e medicacoes em uso ao sugerir medicamentos
- Aplique as orientacoes da especialidade acima para enriquecer a avaliacao`,
          },
          { role: 'user', content: transcription },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '{}';
      this.logger.log(
        `generateSOAP completed - model: gpt-4o, latency: ${latency}ms, inputLength: ${transcription.length}, outputLength: ${content.length}`,
      );

      const parsed = JSON.parse(content) as Record<string, unknown>;

      const result: SOAPNote = {
        subjective: (parsed.subjective as string) ?? '',
        objective: (parsed.objective as string) ?? '',
        assessment: (parsed.assessment as string) ?? '',
        plan: (parsed.plan as string) ?? '',
        diagnosisCodes: (parsed.diagnosisCodes as string[]) ?? [],
        suggestedExams: (parsed.suggestedExams as string[]) ?? [],
        suggestedMedications:
          (parsed.suggestedMedications as SOAPNote['suggestedMedications']) ?? [],
      };

      // Cache for 10 minutes
      await this.aiCache.set(cacheKey, result, 600);

      return result;
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for generateSOAP, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const specialtyPrompt = getSpecialtyPrompt(doctorSpecialty);
        const result = await this.gemini.generateJson<SOAPNote>(
          transcription,
          `${specialtyPrompt.systemPrompt} Gere uma nota SOAP completa em portugues brasileiro medico a partir da transcricao. ${specialtyPrompt.soapGuidance} Retorne JSON com subjective, objective, assessment, plan, diagnosisCodes (CID-10), suggestedExams, suggestedMedications (array de {name, dose, route, frequency, duration}). Nao invente dados ausentes.`,
        );
        const soapResult: SOAPNote = {
          subjective: result.subjective ?? '',
          objective: result.objective ?? '',
          assessment: result.assessment ?? '',
          plan: result.plan ?? '',
          diagnosisCodes: result.diagnosisCodes ?? [],
          suggestedExams: result.suggestedExams ?? [],
          suggestedMedications: result.suggestedMedications ?? [],
        };

        await this.aiCache.set(cacheKey, soapResult, 600);
        return soapResult;
      } catch (fallbackError) {
        const latency = Date.now() - startTime;
        this.logger.error(
          `Both AI providers failed for generateSOAP after ${latency}ms: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        // Offline rule-based SOAP generation
        return this.generateOfflineSOAP(transcription, patientContext);
      }
    }
  }

  /**
   * Stream SOAP generation via OpenAI streaming API.
   * Yields partial text chunks for SSE streaming.
   */
  async *streamSOAP(
    transcription: string,
    doctorSpecialty?: string,
    patientId?: string,
  ): AsyncGenerator<string> {
    let patientInfo = 'Dados do paciente: nao disponiveis';
    if (patientId) {
      patientInfo = await this.patientContextBuilder.build(patientId);
    }

    const specialtyPrompt = getSpecialtyPrompt(doctorSpecialty);

    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `${specialtyPrompt.systemPrompt}

Voce e um sistema especializado em documentacao medica brasileira. Gere uma nota SOAP completa.

Especialidade: ${specialtyPrompt.name}
Orientacao: ${specialtyPrompt.soapGuidance}

${patientInfo}

Retorne um JSON com: subjective, objective, assessment, plan, diagnosisCodes, suggestedExams, suggestedMedications.
Siga normas do CFM/CRM. Terminologia em portugues brasileiro medico. Nao invente dados ausentes.`,
        },
        { role: 'user', content: transcription },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  private buildPatientInfoBlock(
    ctx: PatientContext | Record<string, unknown>,
  ): string {
    const parts: string[] = [];
    if (ctx.name) parts.push(`Nome: ${ctx.name}`);
    if (ctx.age) parts.push(`Idade: ${ctx.age} anos`);
    if (ctx.gender) parts.push(`Sexo: ${ctx.gender}`);
    if (Array.isArray(ctx.allergies) && ctx.allergies.length > 0)
      parts.push(`Alergias conhecidas: ${(ctx.allergies as string[]).join(', ')}`);
    if (Array.isArray(ctx.conditions) && ctx.conditions.length > 0)
      parts.push(
        `Condicoes pre-existentes: ${(ctx.conditions as string[]).join(', ')}`,
      );
    if (Array.isArray(ctx.medications) && ctx.medications.length > 0)
      parts.push(
        `Medicacoes em uso: ${(ctx.medications as string[]).join(', ')}`,
      );
    if (ctx.lastEncounterSummary)
      parts.push(`Resumo ultimo atendimento: ${ctx.lastEncounterSummary}`);

    return parts.length > 0
      ? `Dados do paciente:\n${parts.join('\n')}`
      : 'Dados do paciente: nao disponiveis';
  }

  /**
   * Offline rule-based SOAP generation when both AI providers are unavailable.
   * Extracts key information from the transcription using pattern matching.
   */
  private generateOfflineSOAP(
    transcription: string,
    patientContext?: PatientContext | Record<string, unknown>,
  ): SOAPNote {
    this.logger.log('Generating offline rule-based SOAP note');
    const text = transcription.toLowerCase();
    const normalizedText = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // --- Extract Subjective ---
    const subjectiveParts: string[] = [];
    // Chief complaint patterns
    const queixaMatch = transcription.match(/(?:queixa(?:\s+principal)?|motivo|refere|relata|paciente\s+(?:com|apresenta|queixa))[:\s]+([^.]+)/i);
    if (queixaMatch) subjectiveParts.push(`Queixa principal: ${queixaMatch[1].trim()}.`);

    // Duration patterns
    const durationMatch = transcription.match(/(?:há|ha|desde|por|faz)\s+(\d+\s+(?:dias?|semanas?|meses?|anos?|horas?))/i);
    if (durationMatch) subjectiveParts.push(`Duração: ${durationMatch[1]}.`);

    // Symptom keywords
    const symptomPatterns: Array<{ pattern: RegExp; name: string }> = [
      { pattern: /dor\s+(?:toracica|no\s+peito|precordial)/i, name: 'dor torácica' },
      { pattern: /dor\s+abdominal/i, name: 'dor abdominal' },
      { pattern: /cefaleia|dor\s+de\s+cabeca/i, name: 'cefaleia' },
      { pattern: /febre/i, name: 'febre' },
      { pattern: /tosse/i, name: 'tosse' },
      { pattern: /dispneia|falta\s+de\s+ar/i, name: 'dispneia' },
      { pattern: /nausea/i, name: 'náuseas' },
      { pattern: /vomito/i, name: 'vômitos' },
      { pattern: /diarreia/i, name: 'diarreia' },
      { pattern: /tontura|vertigem/i, name: 'tontura' },
      { pattern: /palpitac/i, name: 'palpitações' },
      { pattern: /edema/i, name: 'edema' },
    ];
    const detectedSymptoms: string[] = [];
    for (const sp of symptomPatterns) {
      if (sp.pattern.test(normalizedText)) detectedSymptoms.push(sp.name);
    }
    if (detectedSymptoms.length > 0) {
      subjectiveParts.push(`Sintomas referidos: ${detectedSymptoms.join(', ')}.`);
    }

    // Negatives
    const negativePatterns = normalizedText.match(/(?:nega|sem|ausencia de|nao apresenta|nao refere)\s+(\w+(?:\s+\w+)?)/gi);
    if (negativePatterns && negativePatterns.length > 0) {
      subjectiveParts.push(`Nega: ${negativePatterns.map(n => n.replace(/^(?:nega|sem|ausencia de|nao apresenta|nao refere)\s+/i, '')).join(', ')}.`);
    }

    // Patient context
    const ctx = patientContext ?? {};
    if (ctx.allergies && Array.isArray(ctx.allergies) && ctx.allergies.length > 0) {
      subjectiveParts.push(`Alergias: ${ctx.allergies.join(', ')}.`);
    }
    if (ctx.medications && Array.isArray(ctx.medications) && ctx.medications.length > 0) {
      subjectiveParts.push(`Medicações em uso: ${ctx.medications.join(', ')}.`);
    }

    // --- Extract Objective ---
    const objectiveParts: string[] = [];
    // Vital signs
    const bpMatch = transcription.match(/(?:PA|pressao)[:\s]*(\d{2,3})\s*[/x]\s*(\d{2,3})/i);
    if (bpMatch) objectiveParts.push(`PA: ${bpMatch[1]}x${bpMatch[2]} mmHg`);
    const hrMatch = transcription.match(/(?:FC|frequencia\s+cardiaca|pulso)[:\s]*(\d{2,3})/i);
    if (hrMatch) objectiveParts.push(`FC: ${hrMatch[1]} bpm`);
    const rrMatch = transcription.match(/(?:FR|frequencia\s+respiratoria)[:\s]*(\d{1,2})/i);
    if (rrMatch) objectiveParts.push(`FR: ${rrMatch[1]} irpm`);
    const tempMatch = transcription.match(/(?:T|Temp|temperatura)[:\s]*(\d{2}[.,]\d)/i);
    if (tempMatch) objectiveParts.push(`Tax: ${tempMatch[1]}°C`);
    const satMatch = transcription.match(/(?:Sat|SpO2|SatO2)[:\s]*(\d{2,3})/i);
    if (satMatch) objectiveParts.push(`SpO2: ${satMatch[1]}%`);

    // Physical exam findings
    const examPatterns: Array<{ pattern: RegExp; finding: string }> = [
      { pattern: /bulhas\s+(?:ritmicas|regulares)/i, finding: 'BRNF em 2T, sem sopros' },
      { pattern: /murmur(?:io)?(?:\s+vesicular)?\s+(?:present|fisiologico|normal)/i, finding: 'MV presente bilateralmente' },
      { pattern: /pulmoes\s+limpos/i, finding: 'Pulmões limpos, sem ruídos adventícios' },
      { pattern: /abdome\s+(?:flacido|plano|indolor)/i, finding: 'Abdome plano, flácido, indolor à palpação' },
      { pattern: /estertores|crepitantes/i, finding: 'Estertores crepitantes' },
      { pattern: /sibilos/i, finding: 'Sibilos à ausculta pulmonar' },
    ];
    for (const ep of examPatterns) {
      if (ep.pattern.test(normalizedText)) objectiveParts.push(ep.finding);
    }

    if (objectiveParts.length === 0) {
      objectiveParts.push('Exame físico: dados não claramente documentados na transcrição.');
    }

    // --- Assessment ---
    const assessmentParts: string[] = [];
    const diagnosisCodes: string[] = [];
    const conditionMap: Array<{ pattern: RegExp; name: string; code: string }> = [
      { pattern: /hipertensao|pressao\s+alta/i, name: 'Hipertensão arterial sistêmica', code: 'I10' },
      { pattern: /diabetes|dm2?|glicemia\s+(?:elevada|alta)/i, name: 'Diabetes mellitus tipo 2', code: 'E11.9' },
      { pattern: /pneumonia/i, name: 'Pneumonia comunitária', code: 'J18.9' },
      { pattern: /infeccao\s+(?:urinaria|trato\s+urinario)|itu/i, name: 'Infecção do trato urinário', code: 'N39.0' },
      { pattern: /dpoc|doenca\s+pulmonar\s+obstrutiva/i, name: 'DPOC', code: 'J44.9' },
      { pattern: /asma/i, name: 'Asma', code: 'J45.9' },
      { pattern: /insuficiencia\s+cardiaca/i, name: 'Insuficiência cardíaca', code: 'I50.9' },
      { pattern: /fibrilacao\s+atrial/i, name: 'Fibrilação atrial', code: 'I48.9' },
      { pattern: /dor\s+toracica|precordialgia/i, name: 'Dor torácica não especificada', code: 'R07.9' },
      { pattern: /cefaleia|dor\s+de\s+cabeca/i, name: 'Cefaleia', code: 'R51' },
      { pattern: /lombalgia|dor\s+lombar/i, name: 'Lombalgia', code: 'M54.5' },
      { pattern: /refluxo|drge/i, name: 'DRGE', code: 'K21.0' },
      { pattern: /depressao/i, name: 'Episódio depressivo', code: 'F32.9' },
      { pattern: /ansiedade/i, name: 'Transtorno de ansiedade', code: 'F41.9' },
      { pattern: /anemia/i, name: 'Anemia', code: 'D64.9' },
      { pattern: /covid|sars.?cov/i, name: 'COVID-19', code: 'U07.1' },
    ];
    for (const cm of conditionMap) {
      if (cm.pattern.test(normalizedText)) {
        assessmentParts.push(`${cm.name} (${cm.code})`);
        diagnosisCodes.push(cm.code);
      }
    }
    if (assessmentParts.length === 0 && detectedSymptoms.length > 0) {
      assessmentParts.push(`Quadro clínico a esclarecer — sintomas: ${detectedSymptoms.join(', ')}`);
      diagnosisCodes.push('R69');
    }

    // --- Plan ---
    const planParts: string[] = [];
    const suggestedExams: string[] = [];
    const suggestedMedications: SOAPNote['suggestedMedications'] = [];

    // Auto-suggest based on detected conditions
    if (normalizedText.includes('pneumonia')) {
      suggestedExams.push('RX tórax PA e perfil', 'Hemograma completo', 'PCR', 'Hemocultura (2 amostras)');
      planParts.push('Antibioticoterapia empírica conforme gravidade (CURB-65)');
    }
    if (normalizedText.includes('dor toracica') || normalizedText.includes('precordialgia')) {
      suggestedExams.push('ECG 12 derivações', 'Troponina (0h e 3h)', 'RX tórax');
      planParts.push('Monitorização contínua, acesso venoso');
    }
    if (normalizedText.includes('diabetes') || normalizedText.includes('glicemia')) {
      suggestedExams.push('HbA1c', 'Glicemia de jejum', 'Creatinina', 'Perfil lipídico');
    }
    if (normalizedText.includes('hipertensao') || normalizedText.includes('pressao alta')) {
      suggestedExams.push('ECG', 'Creatinina', 'Potássio', 'EAS', 'Perfil lipídico');
    }

    // Extract mentioned exams
    const examKeywords = transcription.match(/(?:solicitar|pedir|exame)\s+([^.,]+)/gi);
    if (examKeywords) {
      for (const ek of examKeywords) {
        const exam = ek.replace(/^(?:solicitar|pedir|exame)\s+/i, '').trim();
        if (exam.length > 2 && !suggestedExams.includes(exam)) suggestedExams.push(exam);
      }
    }

    // Extract mentioned prescriptions
    const medMatch = transcription.match(/(?:prescrever|receitar|iniciar)\s+(\w+(?:\s+\d+\s*(?:mg|g|ml|mcg))?)/gi);
    if (medMatch) {
      for (const mm of medMatch) {
        const med = mm.replace(/^(?:prescrever|receitar|iniciar)\s+/i, '').trim();
        suggestedMedications.push({ name: med, dose: '', route: 'VO', frequency: '', duration: '' });
      }
    }

    if (planParts.length === 0) {
      planParts.push('Conduta terapêutica conforme avaliação clínica');
    }
    planParts.push('Retorno conforme evolução clínica');

    return {
      subjective: subjectiveParts.join(' ') || 'Dados subjetivos extraídos por processamento local — revisar.',
      objective: objectiveParts.join('. ') + '.',
      assessment: assessmentParts.join('; ') || 'Avaliação pendente — processamento de IA indisponível.',
      plan: planParts.join('. ') + '.',
      diagnosisCodes: [...new Set(diagnosisCodes)],
      suggestedExams: [...new Set(suggestedExams)],
      suggestedMedications,
    };
  }

  private buildCacheKey(
    transcription: string,
    specialty?: string,
    patientId?: string,
  ): string {
    const hash = createHash('sha256')
      .update(`${transcription}|${specialty ?? ''}|${patientId ?? ''}`)
      .digest('hex')
      .slice(0, 16);
    return `soap:${hash}`;
  }
}
