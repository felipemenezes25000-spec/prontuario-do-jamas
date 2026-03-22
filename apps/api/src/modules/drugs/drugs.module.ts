import { Module } from '@nestjs/common';
import { DrugsController } from './drugs.controller';
import { DrugDatabaseService } from './drug-database.service';

@Module({
  controllers: [DrugsController],
  providers: [DrugDatabaseService],
  exports: [DrugDatabaseService],
})
export class DrugsModule {}
