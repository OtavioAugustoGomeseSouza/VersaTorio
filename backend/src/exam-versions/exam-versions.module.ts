import { Module } from '@nestjs/common';
import { ExamVersionsService } from './exam-versions.service';
import { ExamVersionsController } from './exam-versions.controller';
import { UploadedFilesModule } from '../uploaded-files/uploaded-files.module';

@Module({
  imports: [UploadedFilesModule],
  controllers: [ExamVersionsController],
  providers: [ExamVersionsService],
})
export class ExamVersionsModule {}
