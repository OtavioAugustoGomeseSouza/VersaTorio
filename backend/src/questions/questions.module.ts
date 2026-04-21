import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadedFilesModule } from '../uploaded-files/uploaded-files.module';

@Module({
  imports: [PrismaModule, UploadedFilesModule],
  providers: [QuestionsService],
  controllers: [QuestionsController],
})
export class QuestionsModule {}
