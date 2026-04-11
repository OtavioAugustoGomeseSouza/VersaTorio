import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UploadedFile } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { randomUUID } from 'crypto';
import { access, mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, extname, resolve } from 'path';
import {
  AuthTokenPayload,
  UserRole,
} from '../auth/interfaces/auth-token-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { UploadedFileEntity } from './entities/uploaded-file.entity';

export const MAX_UPLOAD_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export type UploadedMulterFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type UploadedFileContentData = {
  absolutePath: string;
  mimeType: string;
  originalName: string;
};

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
};

@Injectable()
export class UploadedFilesService {
  private readonly uploadRootDir = resolve(__dirname, '..', '..', 'uploads');

  constructor(private prisma: PrismaService) {}

  private isAdmin(authUser: AuthTokenPayload): boolean {
    return authUser.role === UserRole.admin;
  }

  private buildAccessFilter(authUser: AuthTokenPayload): Prisma.UploadedFileWhereInput {
    return this.isAdmin(authUser) ? {} : { userId: authUser.id };
  }

  private toEntity(uploadedFile: UploadedFile): UploadedFileEntity {
    return plainToInstance(UploadedFileEntity, {
      id: uploadedFile.id,
      userId: uploadedFile.userId,
      originalName: uploadedFile.originalName,
      mimeType: uploadedFile.mimeType,
      size: uploadedFile.size,
      createdAt: uploadedFile.createdAt,
      contentUrl: `/uploaded-files/${uploadedFile.id}/content`,
    });
  }

  private ensureFileIsValid(file: UploadedMulterFile | undefined): asserts file is UploadedMulterFile {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    if (file.size <= 0) {
      throw new BadRequestException('File must not be empty');
    }

    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File must be smaller than ${MAX_UPLOAD_FILE_SIZE_BYTES} bytes`,
      );
    }

    if (!Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException('Invalid upload payload');
    }
  }

  private resolveFileExtension(file: UploadedMulterFile): string {
    const mimeExtension = MIME_EXTENSION_MAP[file.mimetype];
    if (mimeExtension) {
      return mimeExtension;
    }

    const originalExtension = extname(file.originalname).toLowerCase();
    return originalExtension.length > 0 && originalExtension.length <= 10
      ? originalExtension
      : '';
  }

  private buildStorageKey(userId: string, file: UploadedMulterFile): string {
    return `${userId}/${randomUUID()}${this.resolveFileExtension(file)}`;
  }

  private resolveAbsolutePath(storageKey: string): string {
    return resolve(this.uploadRootDir, storageKey);
  }

  private async ensureFileAccess(
    id: string,
    authUser: AuthTokenPayload,
  ): Promise<UploadedFile> {
    const uploadedFile = await this.prisma.uploadedFile.findUnique({
      where: { id },
    });

    if (
      !uploadedFile ||
      (!this.isAdmin(authUser) && uploadedFile.userId !== authUser.id)
    ) {
      throw new NotFoundException(`Uploaded file with ID ${id} not found`);
    }

    return uploadedFile;
  }

  async upload(
    file: UploadedMulterFile | undefined,
    authUser: AuthTokenPayload,
  ): Promise<UploadedFileEntity> {
    this.ensureFileIsValid(file);

    const storageKey = this.buildStorageKey(authUser.id, file);
    const absolutePath = this.resolveAbsolutePath(storageKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    try {
      const uploadedFile = await this.prisma.uploadedFile.create({
        data: {
          userId: authUser.id,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          storageKey,
        },
      });

      return this.toEntity(uploadedFile);
    } catch (error) {
      await unlink(absolutePath).catch(() => undefined);
      throw error;
    }
  }

  async findAll(authUser: AuthTokenPayload): Promise<UploadedFileEntity[]> {
    const uploadedFiles = await this.prisma.uploadedFile.findMany({
      where: this.buildAccessFilter(authUser),
      orderBy: { createdAt: 'desc' },
    });

    return uploadedFiles.map((uploadedFile) => this.toEntity(uploadedFile));
  }

  async findOne(
    id: string,
    authUser: AuthTokenPayload,
  ): Promise<UploadedFileEntity> {
    const uploadedFile = await this.ensureFileAccess(id, authUser);
    return this.toEntity(uploadedFile);
  }

  async getContentData(
    id: string,
    authUser: AuthTokenPayload,
  ): Promise<UploadedFileContentData> {
    const uploadedFile = await this.ensureFileAccess(id, authUser);
    const absolutePath = this.resolveAbsolutePath(uploadedFile.storageKey);

    try {
      await access(absolutePath);
    } catch {
      throw new NotFoundException(`Uploaded file content with ID ${id} not found`);
    }

    return {
      absolutePath,
      mimeType: uploadedFile.mimeType,
      originalName: uploadedFile.originalName,
    };
  }

  async remove(
    id: string,
    authUser: AuthTokenPayload,
  ): Promise<UploadedFileEntity> {
    const uploadedFile = await this.ensureFileAccess(id, authUser);
    const absolutePath = this.resolveAbsolutePath(uploadedFile.storageKey);

    await unlink(absolutePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    });

    await this.prisma.uploadedFile.delete({ where: { id: uploadedFile.id } });
    return this.toEntity(uploadedFile);
  }
}
