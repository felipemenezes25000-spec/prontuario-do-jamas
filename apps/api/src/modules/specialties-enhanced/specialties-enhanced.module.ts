import { Module } from '@nestjs/common';
import { SpecialtiesEnhancedController } from './specialties-enhanced.controller';
import { SpecialtiesEnhancedService } from './specialties-enhanced.service';

@Module({
  controllers: [SpecialtiesEnhancedController],
  providers: [SpecialtiesEnhancedService],
  exports: [SpecialtiesEnhancedService],
})
export class SpecialtiesEnhancedModule {}
