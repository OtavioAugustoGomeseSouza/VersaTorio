import { Module } from '@nestjs/common';
import { ExamVersionsService } from './exam-versions.service';
import { ExamVersionsController } from './exam-versions.controller';

@Module({
  controllers: [ExamVersionsController],
  providers: [ExamVersionsService],
})
export class ExamVersionsModule {}
