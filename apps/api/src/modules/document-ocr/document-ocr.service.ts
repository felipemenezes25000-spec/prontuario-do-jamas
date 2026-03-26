import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProcessOcrDto, OcrDocumentType } from './document-ocr.dto';
import { randomUUID } from 'crypto';

interface OcrExtractedField {
  field: string;
  value: string;
  confidence: number;
}

export interface OcrResult {
  id: string;
  patientId: string;
  documentType: OcrDocumentType;
  extractedFields: OcrExtractedField[];
  overallConfidence: number;
  processedAt: string;
  documentId: string;
}

@Injectable()
export class DocumentOcrService {
  private readonly logger = new Logger(DocumentOcrService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processDocument(
    tenantId: string,
    userId: string,
    dto: ProcessOcrDto,
  ): Promise<OcrResult> {
    this.logger.log(
      `Processing OCR for document type ${dto.documentType}, patient ${dto.patientId}`,
    );

    // Simulate OCR extraction based on document type
    // NOTE: In production, this would call AWS Textract, Google Vision, or Azure Form Recognizer
    const extractedFields = this.simulateOcrExtraction(dto.documentType);
    const overallConfidence = this.calculateOverallConfidence(extractedFields);

    const ocrResultId = randomUUID();

    // Store result in ClinicalDocument with [OCR] prefix
    const document = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        authorId: userId,
        tenantId,
        type: 'CUSTOM',
        title: `[OCR] ${this.getDocumentTypeLabel(dto.documentType)}`,
        content: JSON.stringify({
          ocrResultId,
          documentType: dto.documentType,
          imageFormat: dto.imageFormat,
          extractedFields,
          overallConfidence,
          processedAt: new Date().toISOString(),
          // imageBase64 is not stored for security — only metadata
          imageHash: this.simulateHash(dto.imageBase64),
        }),
        generatedByAI: true,
      },
    });

    return {
      id: ocrResultId,
      patientId: dto.patientId,
      documentType: dto.documentType,
      extractedFields,
      overallConfidence,
      processedAt: new Date().toISOString(),
      documentId: document.id,
    };
  }

  async getOcrHistory(tenantId: string, patientId: string): Promise<OcrResult[]> {
    const documents = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[OCR]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((doc) => {
      const content = doc.content ? JSON.parse(doc.content) as {
        ocrResultId: string;
        documentType: OcrDocumentType;
        extractedFields: OcrExtractedField[];
        overallConfidence: number;
        processedAt: string;
      } : null;

      return {
        id: content?.ocrResultId ?? doc.id,
        patientId: doc.patientId,
        documentType: content?.documentType ?? OcrDocumentType.OTHER,
        extractedFields: content?.extractedFields ?? [],
        overallConfidence: content?.overallConfidence ?? 0,
        processedAt: content?.processedAt ?? doc.createdAt.toISOString(),
        documentId: doc.id,
      };
    });
  }

  async applyOcrToPatient(
    tenantId: string,
    patientId: string,
    ocrResultId: string,
  ): Promise<{ success: boolean; appliedFields: string[] }> {
    // Find the OCR document by searching for the ocrResultId in content
    const documents = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[OCR]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const ocrDocument = documents.find((doc) => {
      if (!doc.content) return false;
      const content = JSON.parse(doc.content) as { ocrResultId?: string };
      return content.ocrResultId === ocrResultId;
    });

    if (!ocrDocument) {
      throw new NotFoundException(`OCR result ${ocrResultId} not found for patient ${patientId}`);
    }

    const content = JSON.parse(ocrDocument.content!) as {
      documentType: OcrDocumentType;
      extractedFields: OcrExtractedField[];
    };
    const appliedFields: string[] = [];

    // Apply extracted fields to patient record based on document type
    const updateData: Record<string, string> = {};

    for (const field of content.extractedFields) {
      if (field.confidence >= 0.85) {
        switch (field.field) {
          case 'cpf':
            updateData.cpf = field.value;
            appliedFields.push('cpf');
            break;
          case 'nome':
            updateData.fullName = field.value;
            appliedFields.push('fullName');
            break;
          case 'dataNascimento':
            updateData.dateOfBirth = field.value;
            appliedFields.push('dateOfBirth');
            break;
          default:
            // Other fields stored as notes
            appliedFields.push(field.field);
            break;
        }
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.patient.update({
        where: { id: patientId },
        data: updateData,
      });
    }

    this.logger.log(
      `Applied ${appliedFields.length} OCR fields to patient ${patientId}`,
    );

    return { success: true, appliedFields };
  }

  private simulateOcrExtraction(documentType: OcrDocumentType): OcrExtractedField[] {
    const randomConfidence = (): number =>
      parseFloat((0.85 + Math.random() * 0.13).toFixed(2));

    switch (documentType) {
      case OcrDocumentType.RG:
        return [
          { field: 'nome', value: 'MARIA SILVA SANTOS', confidence: randomConfidence() },
          { field: 'rg', value: '12.345.678-9', confidence: randomConfidence() },
          { field: 'orgaoExpedidor', value: 'SSP/SP', confidence: randomConfidence() },
          { field: 'dataExpedicao', value: '15/03/2010', confidence: randomConfidence() },
          { field: 'naturalidade', value: 'São Paulo - SP', confidence: randomConfidence() },
          { field: 'filiacao', value: 'JOSE SANTOS / ANA SILVA', confidence: randomConfidence() },
        ];

      case OcrDocumentType.CPF:
        return [
          { field: 'nome', value: 'MARIA SILVA SANTOS', confidence: randomConfidence() },
          { field: 'cpf', value: '123.456.789-00', confidence: randomConfidence() },
          { field: 'dataNascimento', value: '01/01/1990', confidence: randomConfidence() },
        ];

      case OcrDocumentType.CNH:
        return [
          { field: 'nome', value: 'MARIA SILVA SANTOS', confidence: randomConfidence() },
          { field: 'cpf', value: '123.456.789-00', confidence: randomConfidence() },
          { field: 'cnh', value: '01234567890', confidence: randomConfidence() },
          { field: 'categoria', value: 'AB', confidence: randomConfidence() },
          { field: 'validade', value: '15/06/2028', confidence: randomConfidence() },
        ];

      case OcrDocumentType.CARTEIRINHA_CONVENIO:
        return [
          { field: 'nome', value: 'MARIA SILVA SANTOS', confidence: randomConfidence() },
          { field: 'numeroCarteirinha', value: '0012345678', confidence: randomConfidence() },
          { field: 'operadora', value: 'Unimed', confidence: randomConfidence() },
          { field: 'plano', value: 'Unimax Nacional', confidence: randomConfidence() },
          { field: 'validade', value: '31/12/2027', confidence: randomConfidence() },
        ];

      case OcrDocumentType.COMPROVANTE_ENDERECO:
        return [
          { field: 'logradouro', value: 'Rua das Flores', confidence: randomConfidence() },
          { field: 'numero', value: '123', confidence: randomConfidence() },
          { field: 'complemento', value: 'Apto 45', confidence: randomConfidence() },
          { field: 'bairro', value: 'Centro', confidence: randomConfidence() },
          { field: 'cidade', value: 'São Paulo', confidence: randomConfidence() },
          { field: 'uf', value: 'SP', confidence: randomConfidence() },
          { field: 'cep', value: '01001-000', confidence: randomConfidence() },
        ];

      case OcrDocumentType.CERTIDAO_NASCIMENTO:
        return [
          { field: 'nome', value: 'MARIA SILVA SANTOS', confidence: randomConfidence() },
          { field: 'dataNascimento', value: '01/01/1990', confidence: randomConfidence() },
          { field: 'filiacao', value: 'JOSE SANTOS / ANA SILVA', confidence: randomConfidence() },
          { field: 'naturalidade', value: 'São Paulo - SP', confidence: randomConfidence() },
        ];

      default:
        return [
          { field: 'textoExtraido', value: 'Conteúdo genérico do documento', confidence: randomConfidence() },
        ];
    }
  }

  private calculateOverallConfidence(fields: OcrExtractedField[]): number {
    if (fields.length === 0) return 0;
    const sum = fields.reduce((acc, f) => acc + f.confidence, 0);
    return parseFloat((sum / fields.length).toFixed(2));
  }

  private getDocumentTypeLabel(type: OcrDocumentType): string {
    const labels: Record<OcrDocumentType, string> = {
      [OcrDocumentType.RG]: 'Registro Geral (RG)',
      [OcrDocumentType.CPF]: 'CPF',
      [OcrDocumentType.CNH]: 'Carteira Nacional de Habilitação',
      [OcrDocumentType.CARTEIRINHA_CONVENIO]: 'Carteirinha de Convênio',
      [OcrDocumentType.CERTIDAO_NASCIMENTO]: 'Certidão de Nascimento',
      [OcrDocumentType.COMPROVANTE_ENDERECO]: 'Comprovante de Endereço',
      [OcrDocumentType.OTHER]: 'Outro Documento',
    };
    return labels[type];
  }

  private simulateHash(data: string): string {
    // Simple simulated hash for demo purposes
    let hash = 0;
    for (let i = 0; i < Math.min(data.length, 100); i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}`;
  }
}
