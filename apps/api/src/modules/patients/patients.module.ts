import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { WristbandService } from './wristband.service';
import { PatientsEnhancedService } from './patients-enhanced.service';
import { PatientsEnhancedController } from './patients-enhanced.controller';
import { PatientRegistryService } from './patient-registry.service';
import { PatientRegistryController } from './patient-registry.controller';
import { PatientRegistryEnhancedService } from './patient-registry-enhanced.service';
import { PatientRegistryEnhancedController } from './patient-registry-enhanced.controller';
import { PatientMpiService } from './patient-mpi.service';
import { PatientMpiController } from './patient-mpi.controller';
import { PatientBarcodeService } from './patient-barcode.service';
import { PatientBarcodeController } from './patient-barcode.controller';
import { NewbornRegistryService } from './newborn-registry.service';
import { NewbornRegistryController } from './newborn-registry.controller';

@Module({
  controllers: [
    PatientsController,
    PatientsEnhancedController,
    PatientRegistryController,
    PatientRegistryEnhancedController,
    PatientMpiController,
    PatientBarcodeController,
    NewbornRegistryController,
  ],
  providers: [
    PatientsService,
    WristbandService,
    PatientsEnhancedService,
    PatientRegistryService,
    PatientRegistryEnhancedService,
    PatientMpiService,
    PatientBarcodeService,
    NewbornRegistryService,
  ],
  exports: [
    PatientsService,
    WristbandService,
    PatientsEnhancedService,
    PatientRegistryService,
    PatientRegistryEnhancedService,
    PatientMpiService,
    PatientBarcodeService,
    NewbornRegistryService,
  ],
})
export class PatientsModule {}
