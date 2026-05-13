import { Module } from '@nestjs/common';
import { UploadedFilesController } from './uploaded-files.controller';
import { UploadedFilesService } from './uploaded-files.service';

@Module({
  controllers: [UploadedFilesController],
  providers: [UploadedFilesService],
  exports: [UploadedFilesService],
})
export class UploadedFilesModule {}
