import { Test, TestingModule } from '@nestjs/testing';
import { ExamVersionsService } from './exam-versions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadedFilesModule } from '../uploaded-files/uploaded-files.module';

describe('ExamVersionsService', () => {
  let service: ExamVersionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, UploadedFilesModule],
      providers: [ExamVersionsService],
    }).compile();

    service = module.get<ExamVersionsService>(ExamVersionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
