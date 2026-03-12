import { Test, TestingModule } from '@nestjs/testing';
import { ExamVersionsService } from './exam-versions.service';
import { PrismaModule } from '../prisma/prisma.module';

describe('ExamVersionsService', () => {
  let service: ExamVersionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [ExamVersionsService],
    }).compile();

    service = module.get<ExamVersionsService>(ExamVersionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
