import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  TDocumentDefinitions,
  Content,
  TableCell,
  StyleDictionary,
} from 'pdfmake/interfaces';
import { PrismaService } from '../../prisma/prisma.service';

// pdfmake v0.3 server-side: Printer class is in pdfmake/js/Printer
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake/js/Printer').default as new (
  fontDescriptors: Record<string, Record<string, string>>,
) => {
  createPdfKitDocument(docDefinition: TDocumentDefinitions): NodeJS.ReadWriteStream & { end(): void };
};

const FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const EMERALD = '#10b981';
const RED_ALERT = '#ef4444';

const BASE_STYLES: StyleDictionary = {
  header: { fontSize: 16, bold: true, color: EMERALD, margin: [0, 0, 0, 4] },
  subheader: { fontSize: 12, bold: true, margin: [0, 8, 0, 4] },
  label: { fontSize: 9, color: '#6b7280', margin: [0, 2, 0, 0] },
  value: { fontSize: 10, margin: [0, 0, 0, 4] },
  small: { fontSize: 8, color: '#9ca3af' },
  tableHeader: { fontSize: 9, bold: true, color: '#ffffff', fillColor: '#374151' },
  tableCell: { fontSize: 9 },
};

interface MedicalCertificateData {
  patientName: string;
  cpf: string;
  cidCode: string;
  cidDescription: string;
  days: number;
  startDate: string;
  doctorName: string;
  crm: string;
  tenantName: string;
}

@Injectable()
export class PdfGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Prescription PDF
  // ---------------------------------------------------------------------------
  async generatePrescriptionPdf(prescriptionId: string): Promise<Buffer> {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        doctor: {
          select: {
            id: true,
            name: true,
            doctorProfile: true,
          },
        },
        patient: true,
        tenant: true,
      },
    });

    if (!prescription) {
      throw new NotFoundException(
        `Prescription with ID "${prescriptionId}" not found`,
      );
    }

    const { doctor, patient, tenant, items } = prescription;
    const profile = doctor.doctorProfile;
    const hasControlled = items.some((i) => i.isControlled);
    const hasHighAlert = items.some((i) => i.isHighAlert);

    const title = hasControlled
      ? 'RECEITA DE CONTROLE ESPECIAL'
      : 'RECEITA MEDICA';

    // Build medication table
    const tableBody: TableCell[][] = [
      [
        { text: '#', style: 'tableHeader', alignment: 'center' },
        { text: 'Medicamento', style: 'tableHeader' },
        { text: 'Dose', style: 'tableHeader' },
        { text: 'Via', style: 'tableHeader' },
        { text: 'Frequencia', style: 'tableHeader' },
        { text: 'Duracao', style: 'tableHeader' },
        { text: 'Instrucoes', style: 'tableHeader' },
      ],
    ];

    items.forEach((item, idx) => {
      const rowColor = item.isHighAlert ? '#fef2f2' : idx % 2 === 0 ? '#f9fafb' : '#ffffff';
      tableBody.push([
        { text: String(idx + 1), style: 'tableCell', alignment: 'center', fillColor: rowColor },
        {
          text: [
            { text: item.medicationName ?? item.examName ?? item.procedureName ?? '—', bold: true },
            item.activeIngredient ? `\n${item.activeIngredient}` : '',
            item.concentration ? ` ${item.concentration}` : '',
          ],
          style: 'tableCell',
          fillColor: rowColor,
        },
        { text: item.dose ?? '—', style: 'tableCell', fillColor: rowColor },
        { text: item.route ?? '—', style: 'tableCell', fillColor: rowColor },
        { text: item.frequency ?? '—', style: 'tableCell', fillColor: rowColor },
        {
          text: item.duration
            ? `${item.duration}${item.durationUnit ? ` ${item.durationUnit}` : ''}`
            : '—',
          style: 'tableCell',
          fillColor: rowColor,
        },
        { text: item.specialInstructions ?? '—', style: 'tableCell', fillColor: rowColor },
      ]);
    });

    const content: Content[] = [
      // Hospital header
      { text: tenant.name, style: 'header', alignment: 'center' },
      {
        text: [tenant.address, tenant.city, tenant.state]
          .filter(Boolean)
          .join(' - '),
        style: 'small',
        alignment: 'center',
        margin: [0, 0, 0, 2],
      },
      tenant.phone
        ? { text: `Tel: ${tenant.phone}`, style: 'small', alignment: 'center', margin: [0, 0, 0, 8] }
        : { text: '', margin: [0, 0, 0, 8] },
      // Divider
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: EMERALD },
        ],
        margin: [0, 0, 0, 12],
      },
      // Title
      {
        text: title,
        fontSize: 14,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 12],
        color: hasControlled ? RED_ALERT : '#111827',
      },
      // Patient info
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Paciente', style: 'label' },
              { text: patient.fullName, style: 'value' },
              { text: 'CPF', style: 'label' },
              { text: patient.cpf ?? 'Nao informado', style: 'value' },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Data de Nascimento', style: 'label' },
              {
                text: patient.birthDate.toLocaleDateString('pt-BR'),
                style: 'value',
              },
              { text: 'Convenio', style: 'label' },
              { text: patient.insuranceProvider ?? 'Particular', style: 'value' },
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },
      // Items table
      { text: 'Itens da Prescricao', style: 'subheader' },
      {
        table: {
          headerRows: 1,
          widths: [20, '*', 50, 40, 60, 50, '*'],
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e5e7eb',
          vLineColor: () => '#e5e7eb',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
        margin: [0, 0, 0, 20],
      },
      // Signature block
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#d1d5db' },
        ],
        margin: [0, 20, 0, 8],
      },
      {
        columns: [
          {
            width: '60%',
            stack: [
              {
                text: `Data: ${new Date().toLocaleDateString('pt-BR')}`,
                style: 'value',
              },
              prescription.signedAt
                ? {
                    text: `Assinado digitalmente em ${prescription.signedAt.toLocaleString('pt-BR')}`,
                    style: 'small',
                  }
                : { text: 'Assinatura digital pendente', style: 'small', color: RED_ALERT },
            ],
          },
          {
            width: '40%',
            stack: [
              { text: '___________________________', alignment: 'center', margin: [0, 16, 0, 4] },
              { text: doctor.name, alignment: 'center', fontSize: 10, bold: true },
              {
                text: profile
                  ? `CRM ${profile.crm}/${profile.crmState} - ${profile.specialty}`
                  : '',
                alignment: 'center',
                style: 'small',
              },
            ],
          },
        ],
      },
    ];

    const watermark = hasHighAlert
      ? { text: 'ALTO ALERTA', color: RED_ALERT, opacity: 0.08, bold: true }
      : undefined;

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 60],
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      styles: BASE_STYLES,
      content,
      watermark,
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          {
            text: `${tenant.name} - Documento gerado eletronicamente`,
            style: 'small',
            alignment: 'left',
            margin: [40, 0, 0, 0],
          },
          {
            text: `Pagina ${currentPage}/${pageCount}`,
            style: 'small',
            alignment: 'right',
            margin: [0, 0, 40, 0],
          },
        ],
      }),
    };

    return this.buildPdf(docDefinition);
  }

  // ---------------------------------------------------------------------------
  // Medical Certificate PDF
  // ---------------------------------------------------------------------------
  async generateMedicalCertificatePdf(data: MedicalCertificateData): Promise<Buffer> {
    const content: Content[] = [
      { text: data.tenantName, style: 'header', alignment: 'center' },
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: EMERALD },
        ],
        margin: [0, 8, 0, 20],
      },
      {
        text: 'ATESTADO MEDICO',
        fontSize: 16,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 30],
      },
      {
        text: [
          'Atesto para os devidos fins que o(a) paciente ',
          { text: data.patientName, bold: true },
          ', portador(a) do CPF ',
          { text: data.cpf, bold: true },
          `, esteve sob cuidados medicos e necessita de `,
          { text: `${data.days} dia(s)`, bold: true },
          ` de afastamento a partir de `,
          { text: data.startDate, bold: true },
          '.',
        ],
        fontSize: 12,
        lineHeight: 1.6,
        alignment: 'justify',
        margin: [0, 0, 0, 20],
      },
      data.cidCode
        ? {
            text: [
              'CID-10: ',
              { text: `${data.cidCode} - ${data.cidDescription}`, bold: true },
            ],
            fontSize: 11,
            margin: [0, 0, 0, 40],
          }
        : { text: '', margin: [0, 0, 0, 40] },
      // Signature
      {
        stack: [
          { text: '___________________________', alignment: 'center', margin: [0, 40, 0, 4] },
          { text: data.doctorName, alignment: 'center', fontSize: 11, bold: true },
          { text: `CRM ${data.crm}`, alignment: 'center', style: 'small' },
        ],
      },
      {
        text: `Data: ${new Date().toLocaleDateString('pt-BR')}`,
        alignment: 'center',
        fontSize: 10,
        margin: [0, 20, 0, 0],
      },
    ];

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [60, 60, 60, 60],
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      styles: BASE_STYLES,
      content,
    };

    return this.buildPdf(docDefinition);
  }

  // ---------------------------------------------------------------------------
  // Discharge Summary PDF
  // ---------------------------------------------------------------------------
  async generateDischargeSummaryPdf(admissionId: string): Promise<Buffer> {
    const admission = await this.prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        patient: true,
        tenant: true,
        admittingDoctor: {
          select: { id: true, name: true, doctorProfile: true },
        },
        attendingDoctor: {
          select: { id: true, name: true, doctorProfile: true },
        },
        encounter: {
          include: {
            prescriptions: {
              include: { items: { orderBy: { sortOrder: 'asc' } } },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!admission) {
      throw new NotFoundException(
        `Admission with ID "${admissionId}" not found`,
      );
    }

    const { patient, tenant, admittingDoctor, attendingDoctor, encounter: _encounter } =
      admission;
    const doctor = attendingDoctor ?? admittingDoctor;
    const profile = doctor.doctorProfile;

    const content: Content[] = [
      { text: tenant.name, style: 'header', alignment: 'center' },
      {
        text: [tenant.address, tenant.city, tenant.state]
          .filter(Boolean)
          .join(' - '),
        style: 'small',
        alignment: 'center',
        margin: [0, 0, 0, 4],
      },
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: EMERALD },
        ],
        margin: [0, 8, 0, 12],
      },
      {
        text: 'SUMARIO DE ALTA',
        fontSize: 14,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 16],
      },
      // Patient info
      { text: 'Dados do Paciente', style: 'subheader' },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Nome', style: 'label' },
              { text: patient.fullName, style: 'value' },
              { text: 'CPF', style: 'label' },
              { text: patient.cpf ?? 'Nao informado', style: 'value' },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Prontuario', style: 'label' },
              { text: patient.mrn, style: 'value' },
              { text: 'Convenio', style: 'label' },
              { text: patient.insuranceProvider ?? 'Particular', style: 'value' },
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },
      // Admission info
      { text: 'Dados da Internacao', style: 'subheader' },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Data de Admissao', style: 'label' },
              {
                text: admission.admissionDate.toLocaleDateString('pt-BR'),
                style: 'value',
              },
              { text: 'Tipo de Admissao', style: 'label' },
              { text: admission.admissionType, style: 'value' },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Data de Alta', style: 'label' },
              {
                text: admission.actualDischargeDate
                  ? admission.actualDischargeDate.toLocaleDateString('pt-BR')
                  : 'Nao informada',
                style: 'value',
              },
              { text: 'Tipo de Alta', style: 'label' },
              { text: admission.dischargeType ?? 'Nao informado', style: 'value' },
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },
      // Diagnoses
      { text: 'Diagnosticos', style: 'subheader' },
      {
        text: 'Diagnostico na Admissao',
        style: 'label',
      },
      {
        text: admission.diagnosisAtAdmission ?? 'Nao registrado',
        style: 'value',
        margin: [0, 0, 0, 4],
      },
      {
        text: 'Diagnostico na Alta',
        style: 'label',
      },
      {
        text: admission.diagnosisAtDischarge ?? 'Nao registrado',
        style: 'value',
        margin: [0, 0, 0, 4],
      },
      // Procedures
      admission.procedurePerformed
        ? { text: 'Procedimento Realizado', style: 'label' }
        : { text: '' },
      admission.procedurePerformed
        ? { text: admission.procedurePerformed, style: 'value', margin: [0, 0, 0, 12] }
        : { text: '' },
      // Discharge notes
      { text: 'Evolucao e Notas de Alta', style: 'subheader' },
      {
        text: admission.dischargeNotes ?? 'Sem observacoes registradas.',
        fontSize: 10,
        lineHeight: 1.4,
        margin: [0, 0, 0, 12],
      },
      // Discharge instructions
      { text: 'Orientacoes de Alta', style: 'subheader' },
      {
        text: admission.dischargeInstructions ?? 'Sem orientacoes registradas.',
        fontSize: 10,
        lineHeight: 1.4,
        margin: [0, 0, 0, 12],
      },
      // Discharge prescriptions
      admission.dischargePrescription
        ? { text: 'Prescricao de Alta', style: 'subheader' }
        : { text: '' },
      admission.dischargePrescription
        ? { text: admission.dischargePrescription, fontSize: 10, lineHeight: 1.4, margin: [0, 0, 0, 12] }
        : { text: '' },
      // Follow up
      admission.followUpDate
        ? {
            text: [
              'Retorno agendado para: ',
              { text: admission.followUpDate.toLocaleDateString('pt-BR'), bold: true },
            ],
            fontSize: 11,
            margin: [0, 8, 0, 20],
          }
        : { text: '', margin: [0, 0, 0, 20] },
      // Signature
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#d1d5db' },
        ],
        margin: [0, 12, 0, 8],
      },
      {
        columns: [
          {
            width: '60%',
            text: `Data: ${new Date().toLocaleDateString('pt-BR')}`,
            style: 'value',
          },
          {
            width: '40%',
            stack: [
              { text: '___________________________', alignment: 'center', margin: [0, 16, 0, 4] },
              { text: doctor.name, alignment: 'center', fontSize: 10, bold: true },
              {
                text: profile
                  ? `CRM ${profile.crm}/${profile.crmState} - ${profile.specialty}`
                  : '',
                alignment: 'center',
                style: 'small',
              },
            ],
          },
        ],
      },
    ];

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 60],
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      styles: BASE_STYLES,
      content,
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          {
            text: `${tenant.name} - Sumario de Alta`,
            style: 'small',
            alignment: 'left',
            margin: [40, 0, 0, 0],
          },
          {
            text: `Pagina ${currentPage}/${pageCount}`,
            style: 'small',
            alignment: 'right',
            margin: [0, 0, 40, 0],
          },
        ],
      }),
    };

    return this.buildPdf(docDefinition);
  }

  // ---------------------------------------------------------------------------
  // TISS Guide PDF
  // ---------------------------------------------------------------------------
  async generateTissGuidePdf(billingEntryId: string): Promise<Buffer> {
    const billing = await this.prisma.billingEntry.findUnique({
      where: { id: billingEntryId },
      include: {
        patient: true,
        tenant: true,
        encounter: {
          include: {
            primaryDoctor: {
              select: { id: true, name: true, doctorProfile: true },
            },
          },
        },
      },
    });

    if (!billing) {
      throw new NotFoundException(
        `Billing entry with ID "${billingEntryId}" not found`,
      );
    }

    const { patient, tenant, encounter } = billing;
    const doctor = encounter.primaryDoctor;
    const profile = doctor?.doctorProfile;

    // Parse items safely
    let billingItems: Array<{ code?: string; description?: string; quantity?: number; unitPrice?: number }> = [];
    if (billing.items && Array.isArray(billing.items)) {
      billingItems = billing.items as typeof billingItems;
    }

    const tableBody: TableCell[][] = [
      [
        { text: 'Codigo', style: 'tableHeader' },
        { text: 'Descricao', style: 'tableHeader' },
        { text: 'Qtd', style: 'tableHeader', alignment: 'center' },
        { text: 'Valor Unit.', style: 'tableHeader', alignment: 'right' },
        { text: 'Valor Total', style: 'tableHeader', alignment: 'right' },
      ],
    ];

    for (const item of billingItems) {
      const qty = item.quantity ?? 1;
      const price = item.unitPrice ?? 0;
      tableBody.push([
        { text: item.code ?? '—', style: 'tableCell' },
        { text: item.description ?? '—', style: 'tableCell' },
        { text: String(qty), style: 'tableCell', alignment: 'center' },
        { text: `R$ ${price.toFixed(2)}`, style: 'tableCell', alignment: 'right' },
        { text: `R$ ${(qty * price).toFixed(2)}`, style: 'tableCell', alignment: 'right' },
      ]);
    }

    const content: Content[] = [
      { text: tenant.name, style: 'header', alignment: 'center' },
      {
        text: `CNES: ${tenant.cnesCode ?? 'Nao informado'}`,
        style: 'small',
        alignment: 'center',
        margin: [0, 0, 0, 4],
      },
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: EMERALD },
        ],
        margin: [0, 8, 0, 12],
      },
      {
        text: 'GUIA DE CONSULTA / PROCEDIMENTO',
        fontSize: 13,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 4],
      },
      {
        text: 'Padrao TISS 4.0 - ANS',
        style: 'small',
        alignment: 'center',
        margin: [0, 0, 0, 16],
      },
      // Guide info
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Numero da Guia', style: 'label' },
              { text: billing.guideNumber ?? 'Nao gerado', style: 'value' },
              { text: 'Tipo da Guia', style: 'label' },
              { text: billing.guideType ?? 'CONSULTA', style: 'value' },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Data de Emissao', style: 'label' },
              { text: new Date().toLocaleDateString('pt-BR'), style: 'value' },
              { text: 'Status', style: 'label' },
              { text: billing.status, style: 'value' },
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },
      // Patient
      { text: 'Dados do Beneficiario', style: 'subheader' },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Nome', style: 'label' },
              { text: patient.fullName, style: 'value' },
              { text: 'CPF', style: 'label' },
              { text: patient.cpf ?? 'Nao informado', style: 'value' },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Operadora / Convenio', style: 'label' },
              { text: billing.insuranceProvider ?? patient.insuranceProvider ?? 'Particular', style: 'value' },
              { text: 'Numero da Carteirinha', style: 'label' },
              { text: patient.insuranceNumber ?? 'N/A', style: 'value' },
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },
      // Doctor
      { text: 'Profissional Executante', style: 'subheader' },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Nome', style: 'label' },
              { text: doctor?.name ?? 'Nao informado', style: 'value' },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'CRM', style: 'label' },
              {
                text: profile ? `${profile.crm}/${profile.crmState}` : 'N/A',
                style: 'value',
              },
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },
      // Items
      { text: 'Procedimentos / Servicos', style: 'subheader' },
      billingItems.length > 0
        ? {
            table: {
              headerRows: 1,
              widths: [60, '*', 30, 70, 70],
              body: tableBody,
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#e5e7eb',
              vLineColor: () => '#e5e7eb',
              paddingLeft: () => 4,
              paddingRight: () => 4,
              paddingTop: () => 3,
              paddingBottom: () => 3,
            },
            margin: [0, 0, 0, 8],
          }
        : { text: 'Nenhum item registrado.', style: 'value', margin: [0, 0, 0, 8] },
      // Totals
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 200,
            table: {
              widths: ['*', 80],
              body: [
                [
                  { text: 'Valor Total:', bold: true, fontSize: 10 },
                  {
                    text: billing.totalAmount
                      ? `R$ ${Number(billing.totalAmount).toFixed(2)}`
                      : 'R$ 0,00',
                    fontSize: 10,
                    alignment: 'right',
                  },
                ],
                [
                  { text: 'Valor Glosado:', fontSize: 9, color: RED_ALERT },
                  {
                    text: billing.glosedAmount
                      ? `R$ ${Number(billing.glosedAmount).toFixed(2)}`
                      : 'R$ 0,00',
                    fontSize: 9,
                    alignment: 'right',
                    color: RED_ALERT,
                  },
                ],
                [
                  { text: 'Valor Aprovado:', fontSize: 9, color: EMERALD },
                  {
                    text: billing.approvedAmount
                      ? `R$ ${Number(billing.approvedAmount).toFixed(2)}`
                      : '—',
                    fontSize: 9,
                    alignment: 'right',
                    color: EMERALD,
                  },
                ],
              ],
            },
            layout: 'noBorders',
          },
        ],
        margin: [0, 0, 0, 20],
      },
      // Signature
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#d1d5db' },
        ],
        margin: [0, 12, 0, 16],
      },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: '___________________________', alignment: 'center', margin: [0, 16, 0, 4] },
              { text: 'Assinatura do Beneficiario', alignment: 'center', style: 'small' },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: '___________________________', alignment: 'center', margin: [0, 16, 0, 4] },
              { text: doctor?.name ?? '', alignment: 'center', fontSize: 10, bold: true },
              {
                text: profile
                  ? `CRM ${profile.crm}/${profile.crmState}`
                  : '',
                alignment: 'center',
                style: 'small',
              },
            ],
          },
        ],
      },
    ];

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 60],
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      styles: BASE_STYLES,
      content,
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          {
            text: `${tenant.name} - Guia TISS`,
            style: 'small',
            alignment: 'left',
            margin: [40, 0, 0, 0],
          },
          {
            text: `Pagina ${currentPage}/${pageCount}`,
            style: 'small',
            alignment: 'right',
            margin: [0, 0, 40, 0],
          },
        ],
      }),
    };

    return this.buildPdf(docDefinition);
  }

  // ---------------------------------------------------------------------------
  // Build PDF from document definition
  // ---------------------------------------------------------------------------
  private buildPdf(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const printer = new PdfPrinter(FONTS);
      const doc = printer.createPdfKitDocument(docDefinition);
      const chunks: Uint8Array[] = [];
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));
      doc.end();
    });
  }
}
