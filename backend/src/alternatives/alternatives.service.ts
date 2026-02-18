import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAlternativeDto } from './dto/create-alternative.dto';
import { UpdateAlternativeDto } from './dto/update-alternative.dto';

@Injectable()
export class AlternativesService {
  constructor(private prisma: PrismaService) {}

  async create(createAlternativeDto: CreateAlternativeDto) {
    return this.prisma.alternative.create({
      data: createAlternativeDto,
    });
  }

  async findAll() {
    return this.prisma.alternative.findMany();
  }

  async findOne(id: string) {
    const alternative = await this.prisma.alternative.findUnique({
      where: { id },
    });
    if (!alternative)
      throw new NotFoundException(`Alternative with ID ${id} not found`);
    return alternative;
  }

  async update(id: string, updateAlternativeDto: UpdateAlternativeDto) {
    await this.findOne(id);
    return this.prisma.alternative.update({
      where: { id },
      data: updateAlternativeDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.alternative.delete({
      where: { id },
    });
  }
}
