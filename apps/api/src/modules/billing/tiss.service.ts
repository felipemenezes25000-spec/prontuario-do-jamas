import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface TISSGuide {
  guideNumber: string;
  guideType: 'SADT' | 'INTERNMENT' | 'CONSULTATION';
  providerCNES: string;
  providerName: string;
  patientName: string;
  patientCNS?: string;
  insuranceRegistration: string;
  insurancePlan: string;
  procedures: Array<{
    code: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  requestDate: string;
  executionDate: string;
  doctorName: string;
  doctorCRM: string;
  doctorCBOS: string;
  diagnosisCID?: string;
}

@Injectable()
export class TissService {
  private readonly logger = new Logger(TissService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate TISS XML 4.0 for a billing entry and persist it
   */
  async generateTISSXml(billingEntryId: string): Promise<string> {
    const billing = await this.prisma.billingEntry.findUnique({
      where: { id: billingEntryId },
      include: {
        encounter: {
          include: {
            patient: true,
            primaryDoctor: { include: { doctorProfile: true } },
          },
        },
        tenant: true,
      },
    });

    if (!billing) {
      throw new NotFoundException(
        `Billing entry with ID "${billingEntryId}" not found`,
      );
    }

    const guideTypeMap: Record<string, 'SADT' | 'INTERNMENT' | 'CONSULTATION'> = {
      SP_SADT: 'SADT',
      CONSULTATION: 'CONSULTATION',
      INTERNMENT: 'INTERNMENT',
    };

    const guide: TISSGuide = {
      guideNumber: billing.guideNumber ?? '',
      guideType: guideTypeMap[billing.guideType as string] ?? 'SADT',
      providerCNES: billing.tenant.cnesCode ?? '',
      providerName: billing.tenant.name,
      patientName: billing.encounter.patient.fullName,
      patientCNS: billing.encounter.patient.cns ?? undefined,
      insuranceRegistration: billing.encounter.patient.insuranceNumber ?? '',
      insurancePlan: billing.encounter.patient.insurancePlan ?? '',
      procedures: (billing.items as any[]) ?? [],
      totalAmount: Number(billing.totalAmount) || 0,
      requestDate: billing.createdAt.toISOString().split('T')[0],
      executionDate:
        billing.encounter.completedAt?.toISOString().split('T')[0] ??
        billing.createdAt.toISOString().split('T')[0],
      doctorName: billing.encounter.primaryDoctor?.name ?? '',
      doctorCRM:
        billing.encounter.primaryDoctor?.doctorProfile?.crm ?? '',
      doctorCBOS: '',
      diagnosisCID: undefined,
    };

    const xml = this.buildXml(guide);

    // Persist generated XML on the billing entry
    await this.prisma.billingEntry.update({
      where: { id: billingEntryId },
      data: { tissXml: xml },
    });

    this.logger.log(
      `TISS XML generated for billing entry ${billingEntryId}, guideType: ${guide.guideType}, xmlLength: ${xml.length}`,
    );

    return xml;
  }

  private buildXml(guide: TISSGuide): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>1</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>${new Date().toISOString().split('T')[0]}</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>${new Date().toTimeString().split(' ')[0]}</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:codigoPrestadorNaOperadora>${this.escapeXml(guide.providerCNES)}</ans:codigoPrestadorNaOperadora>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>${this.escapeXml(guide.insuranceRegistration)}</ans:registroANS>
    </ans:destino>
    <ans:versaoPadrao>4.00.00</ans:versaoPadrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>1</ans:numeroLote>
      <ans:guiasTISS>
        ${this.buildGuideXml(guide)}
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;
  }

  private buildGuideXml(guide: TISSGuide): string {
    switch (guide.guideType) {
      case 'CONSULTATION':
        return this.buildConsultationGuide(guide);
      case 'SADT':
        return this.buildSADTGuide(guide);
      case 'INTERNMENT':
        return this.buildInternmentGuide(guide);
      default:
        return this.buildSADTGuide(guide);
    }
  }

  private buildConsultationGuide(guide: TISSGuide): string {
    return `<ans:guiaConsulta>
      <ans:cabecalhoConsulta>
        <ans:registroANS>${this.escapeXml(guide.insuranceRegistration)}</ans:registroANS>
        <ans:numeroGuiaPrestador>${this.escapeXml(guide.guideNumber)}</ans:numeroGuiaPrestador>
      </ans:cabecalhoConsulta>
      <ans:dadosBeneficiario>
        <ans:numeroCarteira>${this.escapeXml(guide.insuranceRegistration)}</ans:numeroCarteira>
        <ans:nomeBeneficiario>${this.escapeXml(guide.patientName)}</ans:nomeBeneficiario>
      </ans:dadosBeneficiario>
      <ans:dadosContratado>
        <ans:codigoPrestadorNaOperadora>${this.escapeXml(guide.providerCNES)}</ans:codigoPrestadorNaOperadora>
        <ans:nomeContratado>${this.escapeXml(guide.providerName)}</ans:nomeContratado>
      </ans:dadosContratado>
      <ans:dadosAtendimento>
        <ans:dataAtendimento>${guide.executionDate}</ans:dataAtendimento>
        <ans:tipoConsulta>1</ans:tipoConsulta>
        <ans:codigoTabela>22</ans:codigoTabela>
        <ans:codigoProcedimento>10101012</ans:codigoProcedimento>
        <ans:valorProcedimento>${guide.totalAmount.toFixed(2)}</ans:valorProcedimento>
      </ans:dadosAtendimento>
      <ans:dadosExecutante>
        <ans:contratadoExecutante>
          <ans:codigoPrestadorNaOperadora>${this.escapeXml(guide.providerCNES)}</ans:codigoPrestadorNaOperadora>
        </ans:contratadoExecutante>
        <ans:profissionalExecutante>
          <ans:nomeProfissional>${this.escapeXml(guide.doctorName)}</ans:nomeProfissional>
          <ans:conselhoProfissional>6</ans:conselhoProfissional>
          <ans:numeroConselhoProfissional>${this.escapeXml(guide.doctorCRM)}</ans:numeroConselhoProfissional>
          <ans:UF>SP</ans:UF>
          <ans:CBOS>${this.escapeXml(guide.doctorCBOS || '225125')}</ans:CBOS>
        </ans:profissionalExecutante>
      </ans:dadosExecutante>
    </ans:guiaConsulta>`;
  }

  private buildSADTGuide(guide: TISSGuide): string {
    const proceduresXml = guide.procedures
      .map(
        (proc, i) => `
      <ans:procedimentoExecutado>
        <ans:sequencialItem>${i + 1}</ans:sequencialItem>
        <ans:dataExecucao>${guide.executionDate}</ans:dataExecucao>
        <ans:codigoTabela>22</ans:codigoTabela>
        <ans:codigoProcedimento>${this.escapeXml(proc.code)}</ans:codigoProcedimento>
        <ans:quantidadeExecutada>${proc.quantity}</ans:quantidadeExecutada>
        <ans:valorUnitario>${proc.unitPrice.toFixed(2)}</ans:valorUnitario>
        <ans:valorTotal>${proc.totalPrice.toFixed(2)}</ans:valorTotal>
      </ans:procedimentoExecutado>`,
      )
      .join('\n');

    return `<ans:guiaSP-SADT>
      <ans:cabecalhoGuia>
        <ans:registroANS>${this.escapeXml(guide.insuranceRegistration)}</ans:registroANS>
        <ans:numeroGuiaPrestador>${this.escapeXml(guide.guideNumber)}</ans:numeroGuiaPrestador>
      </ans:cabecalhoGuia>
      <ans:dadosBeneficiario>
        <ans:numeroCarteira>${this.escapeXml(guide.insuranceRegistration)}</ans:numeroCarteira>
        <ans:nomeBeneficiario>${this.escapeXml(guide.patientName)}</ans:nomeBeneficiario>
      </ans:dadosBeneficiario>
      <ans:dadosSolicitante>
        <ans:contratadoSolicitante>
          <ans:codigoPrestadorNaOperadora>${this.escapeXml(guide.providerCNES)}</ans:codigoPrestadorNaOperadora>
        </ans:contratadoSolicitante>
        <ans:profissionalSolicitante>
          <ans:nomeProfissional>${this.escapeXml(guide.doctorName)}</ans:nomeProfissional>
          <ans:conselhoProfissional>6</ans:conselhoProfissional>
          <ans:numeroConselhoProfissional>${this.escapeXml(guide.doctorCRM)}</ans:numeroConselhoProfissional>
          <ans:UF>SP</ans:UF>
          <ans:CBOS>${this.escapeXml(guide.doctorCBOS || '225125')}</ans:CBOS>
        </ans:profissionalSolicitante>
      </ans:dadosSolicitante>
      <ans:dadosSolicitacao>
        <ans:dataSolicitacao>${guide.requestDate}</ans:dataSolicitacao>
        ${guide.diagnosisCID ? `<ans:indicacaoClinica>${this.escapeXml(guide.diagnosisCID)}</ans:indicacaoClinica>` : ''}
      </ans:dadosSolicitacao>
      <ans:dadosExecutante>
        <ans:contratadoExecutante>
          <ans:codigoPrestadorNaOperadora>${this.escapeXml(guide.providerCNES)}</ans:codigoPrestadorNaOperadora>
          <ans:nomeContratado>${this.escapeXml(guide.providerName)}</ans:nomeContratado>
        </ans:contratadoExecutante>
        <ans:CNES>${this.escapeXml(guide.providerCNES)}</ans:CNES>
      </ans:dadosExecutante>
      <ans:procedimentosExecutados>
        ${proceduresXml}
      </ans:procedimentosExecutados>
      <ans:valorTotal>
        <ans:valorProcedimentos>${guide.totalAmount.toFixed(2)}</ans:valorProcedimentos>
        <ans:valorTotalGeral>${guide.totalAmount.toFixed(2)}</ans:valorTotalGeral>
      </ans:valorTotal>
    </ans:guiaSP-SADT>`;
  }

  private buildInternmentGuide(guide: TISSGuide): string {
    return `<ans:guiaResumoInternacao>
      <ans:cabecalhoGuia>
        <ans:registroANS>${this.escapeXml(guide.insuranceRegistration)}</ans:registroANS>
        <ans:numeroGuiaPrestador>${this.escapeXml(guide.guideNumber)}</ans:numeroGuiaPrestador>
      </ans:cabecalhoGuia>
      <ans:dadosBeneficiario>
        <ans:numeroCarteira>${this.escapeXml(guide.insuranceRegistration)}</ans:numeroCarteira>
        <ans:nomeBeneficiario>${this.escapeXml(guide.patientName)}</ans:nomeBeneficiario>
      </ans:dadosBeneficiario>
      <ans:dadosInternacao>
        <ans:dataInicioFaturamento>${guide.requestDate}</ans:dataInicioFaturamento>
        <ans:horaInicioFaturamento>00:00:00</ans:horaInicioFaturamento>
        <ans:dataFinalFaturamento>${guide.executionDate}</ans:dataFinalFaturamento>
        <ans:horaFinalFaturamento>23:59:59</ans:horaFinalFaturamento>
      </ans:dadosInternacao>
      <ans:valorTotal>
        <ans:valorTotalGeral>${guide.totalAmount.toFixed(2)}</ans:valorTotalGeral>
      </ans:valorTotal>
    </ans:guiaResumoInternacao>`;
  }

  /**
   * Generate batch of TISS XML for multiple billing entries
   */
  async generateBatchTISS(billingEntryIds: string[]): Promise<string> {
    const results = await Promise.all(
      billingEntryIds.map((id) => this.generateTISSXml(id)),
    );
    return results.join('\n');
  }

  /**
   * Escape special XML characters to prevent injection
   */
  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
