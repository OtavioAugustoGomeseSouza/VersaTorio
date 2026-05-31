import { NotFoundException } from '@nestjs/common';
import { resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { UploadedFilesService } from './uploaded-files.service';

describe('UploadedFilesService', () => {
  const uploadRootDir = '/tmp/tcc-upload-test-root';
  let previousUploadRootDir: string | undefined;
  let service: UploadedFilesService;

  beforeEach(() => {
    previousUploadRootDir = process.env.UPLOAD_ROOT_DIR;
    process.env.UPLOAD_ROOT_DIR = uploadRootDir;
    service = new UploadedFilesService({} as PrismaService);
  });

  afterEach(() => {
    if (previousUploadRootDir === undefined) {
      delete process.env.UPLOAD_ROOT_DIR;
    } else {
      process.env.UPLOAD_ROOT_DIR = previousUploadRootDir;
    }
  });

  it('resolves a valid storage key inside the uploads directory', () => {
    const absolutePath = (
      service as unknown as {
        resolveAbsolutePath: (storageKey: string) => string;
      }
    ).resolveAbsolutePath('user-1/file.png');

    expect(absolutePath).toBe(resolve(uploadRootDir, 'user-1', 'file.png'));
  });

  it.each([
    '',
    '../secret.txt',
    '/etc/passwd',
    'user-1/../../secret.txt',
    'user-1/./file.png',
    'user-1//file.png',
    'user-1/file name.png',
    'user-1/C:/secret.txt',
    'user-1\\..\\secret.txt',
  ])('rejects unsafe storage key "%s"', (storageKey) => {
    expect(() =>
      (
        service as unknown as {
          resolveAbsolutePath: (storageKey: string) => string;
        }
      ).resolveAbsolutePath(storageKey),
    ).toThrow(NotFoundException);
  });
});
