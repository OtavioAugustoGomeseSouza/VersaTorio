import { Test, TestingModule } from '@nestjs/testing';
import { AlternativesController } from './alternatives.controller';
import { AlternativesService } from './alternatives.service';
import { PrismaModule } from '../prisma/prisma.module';

describe('AlternativesController', () => {
  let controller: AlternativesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      controllers: [AlternativesController],
      providers: [AlternativesService],
    }).compile();

    controller = module.get<AlternativesController>(AlternativesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
