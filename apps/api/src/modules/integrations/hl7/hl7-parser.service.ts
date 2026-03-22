import { Injectable } from '@nestjs/common';

export interface Hl7Segment {
  name: string;
  fields: string[];
}

export interface ParsedMessage {
  segments: Hl7Segment[];
  messageType: string;
  messageControlId: string;
  raw: string;
}

@Injectable()
export class Hl7ParserService {
  private readonly FIELD_SEP = '|';
  private readonly COMPONENT_SEP = '^';
  private readonly ENCODING_CHARS = '^~\\&';

  parseMessage(raw: string): ParsedMessage {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const segments: Hl7Segment[] = lines.map((line) => this.parseSegment(line));

    const mshSegment = segments.find((s) => s.name === 'MSH');
    let messageType = '';
    let messageControlId = '';

    if (mshSegment) {
      // MSH-9 = Message Type (field index 8 in 0-based after name)
      messageType = mshSegment.fields[8] ?? '';
      // MSH-10 = Message Control ID
      messageControlId = mshSegment.fields[9] ?? '';
    }

    return {
      segments,
      messageType,
      messageControlId,
      raw,
    };
  }

  parseSegment(segment: string): Hl7Segment {
    const fields = segment.split(this.FIELD_SEP);
    const name = fields[0] ?? '';
    return { name, fields };
  }

  buildADT_A01(
    patient: Record<string, unknown>,
    encounter: Record<string, unknown>,
  ): string {
    const now = this.formatHl7DateTime(new Date());
    const msgId = `MSG${Date.now()}`;

    const msh = this.buildSegment('MSH', [
      this.FIELD_SEP,
      this.ENCODING_CHARS,
      'VOXPEP',
      (encounter.hospitalName as string) ?? 'HOSPITAL',
      'RECEIVER',
      'RECEIVER_FAC',
      now,
      '',
      `ADT${this.COMPONENT_SEP}A01`,
      msgId,
      'P',
      '2.5',
    ]);

    const evn = this.buildSegment('EVN', [
      '',
      'A01',
      now,
    ]);

    const pid = this.buildPID(patient);
    const pv1 = this.buildPV1(encounter);

    return [msh, evn, pid, pv1].join('\r\n');
  }

  buildORU_R01(
    patient: Record<string, unknown>,
    results: Array<Record<string, unknown>>,
  ): string {
    const now = this.formatHl7DateTime(new Date());
    const msgId = `MSG${Date.now()}`;

    const msh = this.buildSegment('MSH', [
      this.FIELD_SEP,
      this.ENCODING_CHARS,
      'VOXPEP',
      'HOSPITAL',
      'LAB',
      'LAB',
      now,
      '',
      `ORU${this.COMPONENT_SEP}R01`,
      msgId,
      'P',
      '2.5',
    ]);

    const pid = this.buildPID(patient);

    const obxSegments = results.map((result, index) => {
      const valueType = typeof result.value === 'number' ? 'NM' : 'ST';
      return this.buildSegment('OBX', [
        '',
        String(index + 1),
        valueType,
        `${result.code as string}${this.COMPONENT_SEP}${result.name as string}${this.COMPONENT_SEP}L`,
        '',
        String(result.value),
        (result.unit as string) ?? '',
        (result.referenceRange as string) ?? '',
        (result.flag as string) ?? '',
        '',
        '',
        'F',
        '',
        now,
      ]);
    });

    return [msh, pid, ...obxSegments].join('\r\n');
  }

  private buildPID(patient: Record<string, unknown>): string {
    const name = patient.fullName as string;
    const nameParts = name ? name.split(' ') : [''];
    const lastName = nameParts.length > 1 ? nameParts.slice(-1)[0] : '';
    const firstName = nameParts[0] ?? '';

    const birthDate = patient.birthDate
      ? this.formatHl7DateTime(new Date(patient.birthDate as string)).slice(0, 8)
      : '';

    const genderMap: Record<string, string> = { M: 'M', F: 'F', NB: 'O', OTHER: 'O' };

    return this.buildSegment('PID', [
      '',
      '1',
      '',
      `${patient.mrn as string ?? ''}^^^MRN`,
      '',
      `${lastName}${this.COMPONENT_SEP}${firstName}`,
      '',
      birthDate,
      genderMap[patient.gender as string] ?? 'U',
    ]);
  }

  private buildPV1(encounter: Record<string, unknown>): string {
    const classMap: Record<string, string> = {
      CONSULTATION: 'O',
      EMERGENCY: 'E',
      HOSPITALIZATION: 'I',
      TELEMEDICINE: 'O',
    };

    return this.buildSegment('PV1', [
      '',
      '1',
      classMap[encounter.type as string] ?? 'O',
      (encounter.location as string) ?? '',
      '',
      '',
      '',
      (encounter.doctorName as string) ?? '',
    ]);
  }

  private buildSegment(name: string, fields: string[]): string {
    if (name === 'MSH') {
      // MSH is special: first field is the separator itself
      return `MSH${fields.slice(1).join(this.FIELD_SEP)}`;
    }
    return `${name}${this.FIELD_SEP}${fields.join(this.FIELD_SEP)}`;
  }

  private formatHl7DateTime(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}${m}${d}${h}${min}${s}`;
  }
}
