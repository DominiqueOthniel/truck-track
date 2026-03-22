import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaisseConfig } from '../entities/caisse-config.entity';
import { CaisseTransactionEntity } from '../entities/caisse-transaction.entity';
import { CaisseController } from './caisse.controller';
import { CaisseService } from './caisse.service';

@Module({
  imports: [TypeOrmModule.forFeature([CaisseConfig, CaisseTransactionEntity])],
  controllers: [CaisseController],
  providers: [CaisseService],
  exports: [CaisseService],
})
export class CaisseModule {}
