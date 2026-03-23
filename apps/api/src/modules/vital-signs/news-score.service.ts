import { Injectable } from '@nestjs/common';

// ============================================================================
// NEWS (National Early Warning Score) — Royal College of Physicians
// ============================================================================

export type NEWSClassification = 'LOW' | 'MEDIUM' | 'HIGH';

export interface NEWSParameter {
  name: string;
  value: number | string | null;
  score: number;
}

export interface NEWSResult {
  totalScore: number;
  classification: NEWSClassification;
  parameters: NEWSParameter[];
  alert?: string;
}

interface VitalSignsInput {
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  oxygenSupplementation?: string | null;
  temperature?: number | null;
  systolicBP?: number | null;
  heartRate?: number | null;
  gcs?: number | null;
}

@Injectable()
export class NEWSScoreService {
  /**
   * Calculate NEWS score from vital signs.
   * Returns total score, classification, per-parameter breakdown, and optional alert.
   */
  calculateNEWS(vitals: VitalSignsInput): NEWSResult {
    const parameters: NEWSParameter[] = [];

    // 1. Respiratory Rate
    const rrScore = this.scoreRespiratoryRate(vitals.respiratoryRate ?? null);
    parameters.push({
      name: 'Frequência Respiratória',
      value: vitals.respiratoryRate ?? null,
      score: rrScore,
    });

    // 2. SpO2
    const spo2Score = this.scoreSpO2(vitals.oxygenSaturation ?? null);
    parameters.push({
      name: 'SpO2',
      value: vitals.oxygenSaturation ?? null,
      score: spo2Score,
    });

    // 3. Supplemental O2
    const o2SupScore = this.scoreO2Supplementation(vitals.oxygenSupplementation ?? null);
    parameters.push({
      name: 'O2 Suplementar',
      value: vitals.oxygenSupplementation === 'ROOM_AIR' || !vitals.oxygenSupplementation ? 'Não' : 'Sim',
      score: o2SupScore,
    });

    // 4. Temperature
    const tempScore = this.scoreTemperature(vitals.temperature ?? null);
    parameters.push({
      name: 'Temperatura',
      value: vitals.temperature ?? null,
      score: tempScore,
    });

    // 5. Systolic BP
    const sbpScore = this.scoreSystolicBP(vitals.systolicBP ?? null);
    parameters.push({
      name: 'PA Sistólica',
      value: vitals.systolicBP ?? null,
      score: sbpScore,
    });

    // 6. Heart Rate
    const hrScore = this.scoreHeartRate(vitals.heartRate ?? null);
    parameters.push({
      name: 'Frequência Cardíaca',
      value: vitals.heartRate ?? null,
      score: hrScore,
    });

    // 7. Level of Consciousness (using GCS: 15 = Alert, <15 = impaired)
    const locScore = this.scoreConsciousness(vitals.gcs ?? null);
    parameters.push({
      name: 'Nível de Consciência',
      value: vitals.gcs != null ? (vitals.gcs === 15 ? 'Alerta' : `GCS ${vitals.gcs}`) : null,
      score: locScore,
    });

    const totalScore = parameters.reduce((sum, p) => sum + p.score, 0);
    const hasScore3 = parameters.some((p) => p.score === 3);
    const classification = this.classify(totalScore, hasScore3);

    let alert: string | undefined;
    if (totalScore >= 7) {
      alert = 'Acionar Time de Resposta Rápida (TRR) — NEWS ≥ 7';
    } else if (classification === 'MEDIUM') {
      alert = 'Atenção: avaliação clínica urgente recomendada — NEWS 5-6 ou parâmetro isolado = 3';
    }

    return { totalScore, classification, parameters, alert };
  }

  // ── Individual parameter scoring ──────────────────────────

  private scoreRespiratoryRate(rr: number | null): number {
    if (rr == null) return 0;
    if (rr <= 8) return 3;
    if (rr <= 11) return 1;
    if (rr <= 20) return 0;
    if (rr <= 24) return 2;
    return 3; // ≥25
  }

  private scoreSpO2(spo2: number | null): number {
    if (spo2 == null) return 0;
    if (spo2 <= 91) return 3;
    if (spo2 <= 93) return 2;
    if (spo2 <= 95) return 1;
    return 0; // ≥96
  }

  private scoreO2Supplementation(supplementation: string | null): number {
    if (!supplementation || supplementation === 'ROOM_AIR') return 0;
    return 2; // Any supplemental oxygen
  }

  private scoreTemperature(temp: number | null): number {
    if (temp == null) return 0;
    if (temp <= 35.0) return 3;
    if (temp <= 36.0) return 1;
    if (temp <= 38.0) return 0;
    if (temp <= 39.0) return 1;
    return 2; // ≥39.1
  }

  private scoreSystolicBP(sbp: number | null): number {
    if (sbp == null) return 0;
    if (sbp <= 90) return 3;
    if (sbp <= 100) return 2;
    if (sbp <= 110) return 1;
    if (sbp <= 219) return 0;
    return 3; // ≥220
  }

  private scoreHeartRate(hr: number | null): number {
    if (hr == null) return 0;
    if (hr <= 40) return 3;
    if (hr <= 50) return 1;
    if (hr <= 90) return 0;
    if (hr <= 110) return 1;
    if (hr <= 130) return 2;
    return 3; // ≥131
  }

  private scoreConsciousness(gcs: number | null): number {
    if (gcs == null) return 0;
    if (gcs === 15) return 0; // Alert
    return 3; // Voice / Pain / Unresponsive
  }

  // ── Classification ────────────────────────────────────────

  private classify(totalScore: number, hasScore3: boolean): NEWSClassification {
    if (totalScore >= 7) return 'HIGH';
    if (totalScore >= 5 || hasScore3) return 'MEDIUM';
    return 'LOW';
  }
}
