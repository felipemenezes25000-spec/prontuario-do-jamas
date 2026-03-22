import { Injectable } from '@nestjs/common';

// Brazilian CPF OID per ANS/RNDS
const CPF_SYSTEM = 'urn:oid:2.16.840.1.113883.13.237';

export interface FhirResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'collection' | 'document' | 'message' | 'transaction' | 'searchset';
  timestamp: string;
  entry: Array<{ fullUrl: string; resource: FhirResource }>;
}

@Injectable()
export class FhirMapperService {
  mapPatientToFhir(patient: Record<string, unknown>): FhirResource {
    const gender = this.mapGender(patient.gender as string);
    const birthDate = patient.birthDate
      ? new Date(patient.birthDate as string).toISOString().split('T')[0]
      : undefined;

    const identifiers: Array<{ system: string; value: string }> = [];

    if (patient.cpf) {
      identifiers.push({ system: CPF_SYSTEM, value: patient.cpf as string });
    }
    if (patient.mrn) {
      identifiers.push({
        system: 'urn:oid:2.16.840.1.113883.2.4.6.3',
        value: patient.mrn as string,
      });
    }

    const telecom: Array<{ system: string; value: string; use: string }> = [];
    if (patient.phone) {
      telecom.push({ system: 'phone', value: patient.phone as string, use: 'mobile' });
    }
    if (patient.email) {
      telecom.push({ system: 'email', value: patient.email as string, use: 'home' });
    }

    return {
      resourceType: 'Patient',
      id: patient.id as string,
      identifier: identifiers,
      name: [
        {
          use: 'official',
          text: patient.fullName as string,
        },
      ],
      gender,
      birthDate,
      ...(telecom.length > 0 ? { telecom } : {}),
      ...(patient.address ? {
        address: [
          {
            use: 'home',
            text: patient.address as string,
            city: patient.city as string,
            state: patient.state as string,
            postalCode: patient.zipCode as string,
            country: 'BR',
          },
        ],
      } : {}),
    };
  }

  mapEncounterToFhir(encounter: Record<string, unknown>): FhirResource {
    const statusMap: Record<string, string> = {
      SCHEDULED: 'planned',
      WAITING: 'arrived',
      IN_TRIAGE: 'triaged',
      IN_PROGRESS: 'in-progress',
      COMPLETED: 'finished',
      CANCELLED: 'cancelled',
      NO_SHOW: 'cancelled',
    };

    const classMap: Record<string, { code: string; display: string }> = {
      CONSULTATION: { code: 'AMB', display: 'ambulatory' },
      EMERGENCY: { code: 'EMER', display: 'emergency' },
      HOSPITALIZATION: { code: 'IMP', display: 'inpatient encounter' },
      TELEMEDICINE: { code: 'VR', display: 'virtual' },
      HOME_VISIT: { code: 'HH', display: 'home health' },
    };

    const encounterType = encounter.type as string;
    const encounterClass = classMap[encounterType] ?? { code: 'AMB', display: 'ambulatory' };

    return {
      resourceType: 'Encounter',
      id: encounter.id as string,
      status: statusMap[encounter.status as string] ?? 'unknown',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: encounterClass.code,
        display: encounterClass.display,
      },
      subject: {
        reference: `Patient/${encounter.patientId as string}`,
      },
      ...(encounter.doctorId ? {
        participant: [
          {
            individual: {
              reference: `Practitioner/${encounter.doctorId as string}`,
            },
          },
        ],
      } : {}),
      period: {
        start: encounter.createdAt
          ? new Date(encounter.createdAt as string).toISOString()
          : undefined,
        end: encounter.completedAt
          ? new Date(encounter.completedAt as string).toISOString()
          : undefined,
      },
    };
  }

  mapAllergyToFhir(allergy: Record<string, unknown>): FhirResource {
    const categoryMap: Record<string, string> = {
      MEDICATION: 'medication',
      FOOD: 'food',
      ENVIRONMENTAL: 'environment',
      LATEX: 'environment',
      CONTRAST: 'medication',
      OTHER: 'biologic',
    };

    const criticalityMap: Record<string, string> = {
      MILD: 'low',
      MODERATE: 'low',
      SEVERE: 'high',
      LIFE_THREATENING: 'high',
    };

    const statusMap: Record<string, string> = {
      ACTIVE: 'active',
      INACTIVE: 'inactive',
      RESOLVED: 'resolved',
      REFUTED: 'refuted',
    };

    return {
      resourceType: 'AllergyIntolerance',
      id: allergy.id as string,
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: statusMap[allergy.status as string] ?? 'active',
          },
        ],
      },
      verificationStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
            code: 'confirmed',
          },
        ],
      },
      type: 'allergy',
      category: [categoryMap[allergy.type as string] ?? 'medication'],
      criticality: criticalityMap[allergy.severity as string] ?? 'low',
      code: {
        text: allergy.substance as string,
      },
      patient: {
        reference: `Patient/${allergy.patientId as string}`,
      },
      ...(allergy.reaction ? {
        reaction: [
          {
            manifestation: [{ text: allergy.reaction as string }],
          },
        ],
      } : {}),
      recordedDate: allergy.createdAt
        ? new Date(allergy.createdAt as string).toISOString()
        : undefined,
    };
  }

  mapPrescriptionToFhir(prescription: Record<string, unknown>): FhirResource {
    const statusMap: Record<string, string> = {
      DRAFT: 'draft',
      ACTIVE: 'active',
      SUSPENDED: 'on-hold',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled',
    };

    return {
      resourceType: 'MedicationRequest',
      id: prescription.id as string,
      status: statusMap[prescription.status as string] ?? 'active',
      intent: 'order',
      medicationCodeableConcept: {
        text: prescription.medicationName as string,
      },
      subject: {
        reference: `Patient/${prescription.patientId as string}`,
      },
      encounter: {
        reference: `Encounter/${prescription.encounterId as string}`,
      },
      ...(prescription.doctorId ? {
        requester: {
          reference: `Practitioner/${prescription.doctorId as string}`,
        },
      } : {}),
      dosageInstruction: [
        {
          text: prescription.dosage as string,
          ...(prescription.route ? {
            route: { text: prescription.route as string },
          } : {}),
          ...(prescription.frequency ? {
            timing: { code: { text: prescription.frequency as string } },
          } : {}),
        },
      ],
      authoredOn: prescription.createdAt
        ? new Date(prescription.createdAt as string).toISOString()
        : undefined,
    };
  }

  mapVitalSignsToFhir(vitals: Record<string, unknown>): FhirResource {
    const components: Array<{
      code: { coding: Array<{ system: string; code: string; display: string }>; text: string };
      valueQuantity: { value: number; unit: string; system: string; code: string };
    }> = [];

    const loincSystem = 'http://loinc.org';
    const unitsSystem = 'http://unitsofmeasure.org';

    const vitalMappings: Array<{
      field: string;
      loincCode: string;
      display: string;
      unit: string;
      unitCode: string;
    }> = [
      { field: 'temperature', loincCode: '8310-5', display: 'Body temperature', unit: 'Cel', unitCode: 'Cel' },
      { field: 'heartRate', loincCode: '8867-4', display: 'Heart rate', unit: '/min', unitCode: '/min' },
      { field: 'respiratoryRate', loincCode: '9279-1', display: 'Respiratory rate', unit: '/min', unitCode: '/min' },
      { field: 'systolicBP', loincCode: '8480-6', display: 'Systolic blood pressure', unit: 'mmHg', unitCode: 'mm[Hg]' },
      { field: 'diastolicBP', loincCode: '8462-4', display: 'Diastolic blood pressure', unit: 'mmHg', unitCode: 'mm[Hg]' },
      { field: 'oxygenSaturation', loincCode: '2708-6', display: 'Oxygen saturation', unit: '%', unitCode: '%' },
      { field: 'painLevel', loincCode: '72514-3', display: 'Pain severity', unit: '{score}', unitCode: '{score}' },
    ];

    for (const mapping of vitalMappings) {
      const value = vitals[mapping.field];
      if (value !== undefined && value !== null) {
        components.push({
          code: {
            coding: [{ system: loincSystem, code: mapping.loincCode, display: mapping.display }],
            text: mapping.display,
          },
          valueQuantity: {
            value: Number(value),
            unit: mapping.unit,
            system: unitsSystem,
            code: mapping.unitCode,
          },
        });
      }
    }

    return {
      resourceType: 'Observation',
      id: vitals.id as string,
      status: 'final',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
              display: 'Vital Signs',
            },
          ],
        },
      ],
      code: {
        coding: [{ system: loincSystem, code: '85353-1', display: 'Vital signs, weight, height, head circumference, oxygen saturation & BMI panel' }],
        text: 'Vital Signs Panel',
      },
      subject: {
        reference: `Patient/${vitals.patientId as string}`,
      },
      effectiveDateTime: vitals.recordedAt
        ? new Date(vitals.recordedAt as string).toISOString()
        : new Date().toISOString(),
      component: components,
    };
  }

  createBundle(resources: FhirResource[]): FhirBundle {
    return {
      resourceType: 'Bundle',
      id: crypto.randomUUID(),
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: resources.map((resource) => ({
        fullUrl: `urn:uuid:${resource.id as string}`,
        resource,
      })),
    };
  }

  private mapGender(gender: string | undefined): string {
    switch (gender) {
      case 'M':
        return 'male';
      case 'F':
        return 'female';
      case 'NB':
      case 'OTHER':
        return 'other';
      default:
        return 'unknown';
    }
  }
}
