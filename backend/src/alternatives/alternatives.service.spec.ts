import { Test, TestingModule } from '@nestjs/testing';
import { AlternativesService } from './alternatives.service';
import { PrismaModule } from '../prisma/prisma.module';

describe('AlternativesService', () => {
  let service: AlternativesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [AlternativesService],
    }).compile();

    service = module.get<AlternativesService>(AlternativesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
