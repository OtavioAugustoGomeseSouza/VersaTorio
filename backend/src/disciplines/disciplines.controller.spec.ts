import { Test, TestingModule } from '@nestjs/testing';
import { DisciplinesController } from './disciplines.controller';
import { DisciplinesService } from './disciplines.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QuestionsService } from '../questions/questions.service';

describe('DisciplinesController', () => {
  let controller: DisciplinesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      controllers: [DisciplinesController],
      providers: [
        DisciplinesService,
        {
          provide: QuestionsService,
          useValue: {
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DisciplinesController>(DisciplinesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
