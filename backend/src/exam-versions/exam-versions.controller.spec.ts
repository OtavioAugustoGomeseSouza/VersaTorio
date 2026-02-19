import { Test, TestingModule } from '@nestjs/testing';
import { ExamVersionsController } from './exam-versions.controller';
import { ExamVersionsService } from './exam-versions.service';

describe('ExamVersionsController', () => {
  let controller: ExamVersionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamVersionsController],
      providers: [ExamVersionsService],
    }).compile();

    controller = module.get<ExamVersionsController>(ExamVersionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
