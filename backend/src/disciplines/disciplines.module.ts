import { Module } from '@nestjs/common';
import { DisciplinesService } from './disciplines.service';
import { DisciplinesController } from './disciplines.controller';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [QuestionsModule],
  controllers: [DisciplinesController],
  providers: [DisciplinesService],
})
export class DisciplinesModule {}
