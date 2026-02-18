import { Test, TestingModule } from '@nestjs/testing';
import { AlternativesController } from './alternatives.controller';

describe('AlternativesController', () => {
  let controller: AlternativesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlternativesController],
    }).compile();

    controller = module.get<AlternativesController>(AlternativesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
