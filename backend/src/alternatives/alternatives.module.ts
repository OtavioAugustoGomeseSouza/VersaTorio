import { Module } from '@nestjs/common';
import { AlternativesController } from './alternatives.controller';
import { AlternativesService } from './alternatives.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AlternativesController],
  providers: [AlternativesService],
})
export class AlternativesModule {}
