import { Test, TestingModule } from '@nestjs/testing';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QuestionsService } from '../questions/questions.service';

describe('TopicsController', () => {
  let controller: TopicsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      controllers: [TopicsController],
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

    controller = module.get<TopicsController>(TopicsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
