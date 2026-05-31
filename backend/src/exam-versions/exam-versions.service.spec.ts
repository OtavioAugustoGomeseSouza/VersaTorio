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

  it('should keep vertical PDF question flow across two snaking columns', () => {
    const questionNodes = [
      { text: 'Question 1' },
      { text: 'Question 2' },
      { text: 'Question 3' },
      { text: 'Question 4' },
    ];

    const content = (service as any).buildQuestionsContent(questionNodes, 2);

    expect(content.columns[0].stack).toEqual(questionNodes);
    expect(content.columns[1].stack).toEqual([]);
    expect(content.columnGap).toBe(18);
    expect(content.snakingColumns).toBe(true);
  });
});
