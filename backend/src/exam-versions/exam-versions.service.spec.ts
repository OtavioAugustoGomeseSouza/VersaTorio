import { Test, TestingModule } from '@nestjs/testing';
import { ExamVersionsService } from './exam-versions.service';

describe('ExamVersionsService', () => {
  let service: ExamVersionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExamVersionsService],
    }).compile();

    service = module.get<ExamVersionsService>(ExamVersionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
