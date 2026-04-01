import { Module } from '@nestjs/common';
import { SpecialtiesEnhancedController } from './specialties-enhanced.controller';
import { SpecialtiesEnhancedService } from './specialties-enhanced.service';
import { SpecialtyModulesController } from './specialty-modules.controller';
import { SpecialtyModulesService } from './specialty-modules.service';

@Module({
  controllers: [SpecialtiesEnhancedController, SpecialtyModulesController],
  providers: [SpecialtiesEnhancedService, SpecialtyModulesService],
  exports: [SpecialtiesEnhancedService, SpecialtyModulesService],
})
export class SpecialtiesEnhancedModule {}
