import { Test, TestingModule } from '@nestjs/testing';
import { TopicsService } from './topics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QuestionsService } from '../questions/questions.service';

describe('TopicsService', () => {
  let service: TopicsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        TopicsService,
        {
          provide: QuestionsService,
          useValue: {
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TopicsService>(TopicsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
