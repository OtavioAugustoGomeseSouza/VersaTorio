import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ExamEntity } from './entities/exam.entity';
import { plainToInstance } from 'class-transformer';
import { AuthTokenPayload } from '../auth/interfaces/auth-token-payload.interface';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createExamDto: CreateExamDto,
    authUser: AuthTokenPayload,
  ): Promise<ExamEntity> {
    const exam = await this.prisma.exam.create({
      data: { ...createExamDto, userId: authUser.id },
    });
    return plainToInstance(ExamEntity, exam);
  }

  async findAll(authUser: AuthTokenPayload): Promise<ExamEntity[]> {
    const exams = await this.prisma.exam.findMany({
      where: { userId: authUser.id },
    });
    return plainToInstance(ExamEntity, exams);
  }

  async findOne(id: string, authUser: AuthTokenPayload): Promise<ExamEntity> {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
    });
    if (!exam || exam.userId !== authUser.id)
      throw new NotFoundException(`Exam with ID ${id} not found`);
    return plainToInstance(ExamEntity, exam);
  }

  async update(
    id: string,
    updateExamDto: UpdateExamDto,
    authUser: AuthTokenPayload,
  ): Promise<ExamEntity> {
    await this.findOne(id, authUser);
    const exam = await this.prisma.exam.update({
      where: { id },
      data: updateExamDto,
    });
    return plainToInstance(ExamEntity, exam);
  }

  async remove(id: string, authUser: AuthTokenPayload): Promise<ExamEntity> {
    await this.findOne(id, authUser);
    const exam = await this.prisma.exam.delete({
      where: { id },
    });
    return plainToInstance(ExamEntity, exam);
  }
}
