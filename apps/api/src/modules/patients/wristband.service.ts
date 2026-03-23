import { Injectable, NotFoundException } from '@nestjs/common';
import type { TDocumentDefinitions, Content, StyleDictionary } from 'pdfmake/interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import * as QRCode from 'qrcode';

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

// Manchester triage colors
const TRIAGE_COLORS: Record<string, string> = {
  RED: '#ef4444',
  ORANGE: '#f97316',
  YELLOW: '#eab308',
  GREEN: '#22c55e',
  BLUE: '#3b82f6',
};

const BASE_STYLES: StyleDictionary = {
  name: { fontSize: 14, bold: true, margin: [0, 0, 0, 2] },
  info: { fontSize: 9, margin: [0, 1, 0, 1] },
  allergy: { fontSize: 8, color: '#ef4444', bold: true, margin: [0, 2, 0, 0] },
  small: { fontSize: 7, color: '#6b7280' },
};

@Injectable()
export class WristbandService {
  constructor(private readonly prisma: PrismaService) {}

  async generateWristbandPdf(patientId: string, appBaseUrl?: string): Promise<Buffer> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        allergies: {
          where: { status: 'ACTIVE' },
          select: { substance: true },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    // Check for active triage
    const latestEncounter = await this.prisma.encounter.findFirst({
      where: { patientId, status: { in: ['IN_PROGRESS', 'IN_TRIAGE', 'WAITING'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        triage: { select: { classificationType: true } },
      },
    });

    const triageLevel = latestEncounter?.triage?.classificationType as string | undefined;
    const bgColor = triageLevel ? TRIAGE_COLORS[triageLevel] ?? '#ffffff' : '#ffffff';
    const textColor = triageLevel && ['YELLOW', 'GREEN'].includes(triageLevel) ? '#000000' : '#ffffff';
    const needsDarkText = bgColor === '#ffffff' || ['YELLOW', 'GREEN'].includes(triageLevel ?? '');

    // Generate QR code as base64 data URL
    const qrUrl = `${appBaseUrl ?? 'https://app.voxpep.com.br'}/pacientes/${patientId}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 100,
      margin: 1,
      color: {
        dark: needsDarkText ? '#000000' : '#ffffff',
        light: '#00000000', // transparent background
      },
    });

    // Format birth date
    const birthDate = patient.birthDate
      ? new Date(patient.birthDate).toLocaleDateString('pt-BR')
      : 'N/I';

    // Allergies text
    const allergyNames = patient.allergies.map((a: { substance: string }) => a.substance);
    const allergyText = allergyNames.length > 0
      ? `ALERGIAS: ${allergyNames.join(', ')}`
      : '';

    const printer = new PdfPrinter(FONTS);

    const content: Content[] = [
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: patient.fullName, style: 'name', color: needsDarkText ? '#000000' : '#ffffff' },
              { text: `Prontuário: ${patient.mrn}`, style: 'info', color: needsDarkText ? '#000000' : '#ffffff' },
              { text: `DN: ${birthDate}`, style: 'info', color: needsDarkText ? '#000000' : '#ffffff' },
              ...(allergyText
                ? [{ text: allergyText, style: 'allergy' as const, color: needsDarkText ? '#dc2626' : '#fca5a5' }]
                : []),
            ],
          },
          {
            width: 80,
            image: qrDataUrl,
            fit: [70, 70],
            alignment: 'right' as const,
          },
        ],
        columnGap: 8,
      },
    ];

    const docDefinition: TDocumentDefinitions = {
      pageSize: { width: 283, height: 85 }, // ~100mm x 30mm wristband
      pageMargins: [8, 6, 8, 4],
      defaultStyle: { font: 'Helvetica', fontSize: 9 },
      styles: BASE_STYLES,
      background: () => ({
        canvas: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            w: 283,
            h: 85,
            color: bgColor,
          },
        ],
      }),
      content,
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err: Error) => reject(err));
      pdfDoc.end();
    });
  }
}
