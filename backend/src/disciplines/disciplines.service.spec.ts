import { Test, TestingModule } from '@nestjs/testing';
import { DisciplinesService } from './disciplines.service';
import { PrismaModule } from '../prisma/prisma.module';

describe('DisciplinesService', () => {
  let service: DisciplinesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [DisciplinesService],
    }).compile();

    service = module.get<DisciplinesService>(DisciplinesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
