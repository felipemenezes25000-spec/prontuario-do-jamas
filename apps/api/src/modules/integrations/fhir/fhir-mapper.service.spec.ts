import { Test, TestingModule } from '@nestjs/testing';
import { FhirMapperService } from './fhir-mapper.service';

describe('FhirMapperService', () => {
  let service: FhirMapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FhirMapperService],
    }).compile();

    service = module.get<FhirMapperService>(FhirMapperService);
  });

  // ---------------------------------------------------------------------------
  // mapPatientToFhir
  // ---------------------------------------------------------------------------

  describe('mapPatientToFhir', () => {
    it('should return a FHIR Patient resource with correct structure', () => {
      const patient = {
        id: 'patient-1',
        fullName: 'Maria Silva',
        gender: 'F',
        birthDate: '1985-06-15',
        cpf: '123.456.789-00',
        mrn: 'MRN-0001',
        phone: '+5511999999999',
        email: 'maria@test.com',
      };

      const result = service.mapPatientToFhir(patient);

      expect(result.resourceType).toBe('Patient');
      expect(result.id).toBe('patient-1');
      expect(result.gender).toBe('female');
      expect(result.birthDate).toBe('1985-06-15');
      expect(result.identifier).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: '123.456.789-00' }),
          expect.objectContaining({ value: 'MRN-0001' }),
        ]),
      );
      expect((result.name as any)[0].text).toBe('Maria Silva');
      expect((result.telecom as any)).toHaveLength(2);
    });

    it('should map male gender correctly', () => {
      const result = service.mapPatientToFhir({ id: 'p-2', fullName: 'Joao', gender: 'M' });
      expect(result.gender).toBe('male');
    });

    it('should return "unknown" for unrecognized gender', () => {
      const result = service.mapPatientToFhir({ id: 'p-3', fullName: 'X' });
      expect(result.gender).toBe('unknown');
    });

    it('should map NB gender to "other"', () => {
      const result = service.mapPatientToFhir({ id: 'p-4', fullName: 'Alex', gender: 'NB' });
      expect(result.gender).toBe('other');
    });

    it('should omit telecom when no phone/email provided', () => {
      const result = service.mapPatientToFhir({ id: 'p-5', fullName: 'Test' });
      expect(result.telecom).toBeUndefined();
    });

    it('should include address when provided', () => {
      const result = service.mapPatientToFhir({
        id: 'p-6',
        fullName: 'Ana',
        address: 'Rua 1',
        city: 'SP',
        state: 'SP',
        zipCode: '01000-000',
      });
      expect((result.address as any)[0].country).toBe('BR');
      expect((result.address as any)[0].text).toBe('Rua 1');
    });
  });

  // ---------------------------------------------------------------------------
  // mapEncounterToFhir
  // ---------------------------------------------------------------------------

  describe('mapEncounterToFhir', () => {
    it('should return a FHIR Encounter with correct resourceType and status mapping', () => {
      const encounter = {
        id: 'enc-1',
        status: 'IN_PROGRESS',
        type: 'EMERGENCY',
        patientId: 'patient-1',
        doctorId: 'doc-1',
        createdAt: '2026-01-01T10:00:00Z',
      };

      const result = service.mapEncounterToFhir(encounter);

      expect(result.resourceType).toBe('Encounter');
      expect(result.id).toBe('enc-1');
      expect(result.status).toBe('in-progress');
      expect((result.class as any).code).toBe('EMER');
      expect((result.subject as any).reference).toBe('Patient/patient-1');
      expect((result.participant as any)[0].individual.reference).toBe('Practitioner/doc-1');
    });

    it('should map COMPLETED status to finished', () => {
      const result = service.mapEncounterToFhir({ id: 'e-2', status: 'COMPLETED', type: 'CONSULTATION', patientId: 'p-1' });
      expect(result.status).toBe('finished');
    });

    it('should default to AMB class for unknown encounter type', () => {
      const result = service.mapEncounterToFhir({ id: 'e-3', status: 'SCHEDULED', type: 'UNKNOWN', patientId: 'p-1' });
      expect((result.class as any).code).toBe('AMB');
    });

    it('should omit participant when no doctorId', () => {
      const result = service.mapEncounterToFhir({ id: 'e-4', status: 'WAITING', type: 'CONSULTATION', patientId: 'p-1' });
      expect(result.participant).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // mapAllergyToFhir
  // ---------------------------------------------------------------------------

  describe('mapAllergyToFhir', () => {
    it('should return a FHIR AllergyIntolerance resource', () => {
      const allergy = {
        id: 'allergy-1',
        type: 'MEDICATION',
        substance: 'Penicillin',
        severity: 'SEVERE',
        status: 'ACTIVE',
        reaction: 'Anaphylaxis',
        patientId: 'patient-1',
        createdAt: '2026-01-01T10:00:00Z',
      };

      const result = service.mapAllergyToFhir(allergy);

      expect(result.resourceType).toBe('AllergyIntolerance');
      expect(result.id).toBe('allergy-1');
      expect(result.criticality).toBe('high');
      expect((result.category as any)[0]).toBe('medication');
      expect((result.code as any).text).toBe('Penicillin');
      expect((result.patient as any).reference).toBe('Patient/patient-1');
      expect((result.reaction as any)[0].manifestation[0].text).toBe('Anaphylaxis');
    });

    it('should map FOOD allergy type to food category', () => {
      const result = service.mapAllergyToFhir({
        id: 'a-2', type: 'FOOD', substance: 'Peanut', severity: 'MILD',
        status: 'ACTIVE', patientId: 'p-1',
      });
      expect((result.category as any)[0]).toBe('food');
    });

    it('should map MILD severity to low criticality', () => {
      const result = service.mapAllergyToFhir({
        id: 'a-3', type: 'MEDICATION', substance: 'Aspirin', severity: 'MILD',
        status: 'ACTIVE', patientId: 'p-1',
      });
      expect(result.criticality).toBe('low');
    });

    it('should omit reaction when not provided', () => {
      const result = service.mapAllergyToFhir({
        id: 'a-4', type: 'MEDICATION', substance: 'X', severity: 'MODERATE',
        status: 'ACTIVE', patientId: 'p-1',
      });
      expect(result.reaction).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // mapPrescriptionToFhir
  // ---------------------------------------------------------------------------

  describe('mapPrescriptionToFhir', () => {
    it('should return a FHIR MedicationRequest resource', () => {
      const prescription = {
        id: 'rx-1',
        status: 'ACTIVE',
        medicationName: 'Dipirona 500mg',
        patientId: 'patient-1',
        encounterId: 'enc-1',
        doctorId: 'doc-1',
        dosage: '500mg',
        route: 'ORAL',
        frequency: '6/6h',
        createdAt: '2026-01-01T10:00:00Z',
      };

      const result = service.mapPrescriptionToFhir(prescription);

      expect(result.resourceType).toBe('MedicationRequest');
      expect(result.id).toBe('rx-1');
      expect(result.status).toBe('active');
      expect(result.intent).toBe('order');
      expect((result.medicationCodeableConcept as any).text).toBe('Dipirona 500mg');
      expect((result.subject as any).reference).toBe('Patient/patient-1');
      expect((result.requester as any).reference).toBe('Practitioner/doc-1');
    });

    it('should map DRAFT status to draft', () => {
      const result = service.mapPrescriptionToFhir({
        id: 'rx-2', status: 'DRAFT', patientId: 'p-1', encounterId: 'e-1',
      });
      expect(result.status).toBe('draft');
    });

    it('should omit requester when no doctorId', () => {
      const result = service.mapPrescriptionToFhir({
        id: 'rx-3', status: 'ACTIVE', patientId: 'p-1', encounterId: 'e-1',
      });
      expect(result.requester).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // mapVitalSignsToFhir
  // ---------------------------------------------------------------------------

  describe('mapVitalSignsToFhir', () => {
    it('should return a FHIR Observation resource with vital sign components', () => {
      const vitals = {
        id: 'vital-1',
        patientId: 'patient-1',
        temperature: 37.5,
        heartRate: 80,
        systolicBP: 120,
        diastolicBP: 80,
        oxygenSaturation: 98,
        recordedAt: '2026-01-01T10:00:00Z',
      };

      const result = service.mapVitalSignsToFhir(vitals);

      expect(result.resourceType).toBe('Observation');
      expect(result.id).toBe('vital-1');
      expect(result.status).toBe('final');
      expect((result.subject as any).reference).toBe('Patient/patient-1');

      const components = result.component as any[];
      expect(components.length).toBe(5);

      const tempComponent = components.find(
        (c: any) => c.code.coding[0].code === '8310-5',
      );
      expect(tempComponent.valueQuantity.value).toBe(37.5);
    });

    it('should omit components for fields not provided', () => {
      const vitals = {
        id: 'vital-2',
        patientId: 'patient-1',
        heartRate: 72,
      };

      const result = service.mapVitalSignsToFhir(vitals);
      const components = result.component as any[];

      expect(components).toHaveLength(1);
      expect(components[0].code.coding[0].display).toBe('Heart rate');
    });
  });

  // ---------------------------------------------------------------------------
  // createBundle
  // ---------------------------------------------------------------------------

  describe('createBundle', () => {
    it('should create a FHIR Bundle with entries', () => {
      const resources = [
        { resourceType: 'Patient', id: 'p-1' },
        { resourceType: 'Encounter', id: 'e-1' },
      ];

      const bundle = service.createBundle(resources);

      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.type).toBe('collection');
      expect(bundle.entry).toHaveLength(2);
      expect(bundle.entry[0].fullUrl).toBe('urn:uuid:p-1');
      expect(bundle.entry[0].resource.resourceType).toBe('Patient');
      expect(bundle.timestamp).toBeDefined();
      expect(bundle.id).toBeDefined();
    });

    it('should return an empty entry array for empty resources', () => {
      const bundle = service.createBundle([]);
      expect(bundle.entry).toHaveLength(0);
    });
  });
});
