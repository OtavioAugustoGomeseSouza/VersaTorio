import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import {
  type AuthenticatedRequest,
} from '../auth/interfaces/auth-token-payload.interface';
import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  UploadedFilesService,
  type UploadedMulterFile,
} from './uploaded-files.service';

@Controller('uploaded-files')
export class UploadedFilesController {
  constructor(private readonly uploadedFilesService: UploadedFilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
      },
    }),
  )
  upload(
    @UploadedFile() file: UploadedMulterFile | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.uploadedFilesService.upload(file, authUser);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.uploadedFilesService.findAll(authUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.uploadedFilesService.findOne(id, authUser);
  }

  @Get(':id/content')
  async getContent(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<StreamableFile> {
    const authUser = request.user;
    const content = await this.uploadedFilesService.getContentData(id, authUser);
    const safeFilename = content.originalName.replace(/["\\/\r\n]/g, '_');
    const dispositionType = content.mimeType.startsWith('image/')
      ? 'inline'
      : 'attachment';

    return new StreamableFile(createReadStream(content.absolutePath), {
      type: content.mimeType,
      disposition: `${dispositionType}; filename="${safeFilename}"`,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.uploadedFilesService.remove(id, authUser);
  }
}
