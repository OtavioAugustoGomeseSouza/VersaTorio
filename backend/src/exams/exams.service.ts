import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ExamEntity } from './entities/exam.entity';
import { plainToInstance } from 'class-transformer';
import {
  AuthTokenPayload,
  UserRole,
} from '../auth/interfaces/auth-token-payload.interface';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  private isAdmin(authUser: AuthTokenPayload): boolean {
    return authUser.role === UserRole.admin;
  }

  async create(
    createExamDto: CreateExamDto,
    authUser: AuthTokenPayload,
  ): Promise<ExamEntity> {
    const subject = await this.prisma.subject.findUnique({
      where: { id: createExamDto.subjectId },
    });
    if (
      !subject ||
      (!this.isAdmin(authUser) && subject.userId !== authUser.id)
    ) {
      throw new NotFoundException(
        `Subject with ID ${createExamDto.subjectId} not found`,
      );
    }

    const examOwnerId = this.isAdmin(authUser) ? subject.userId : authUser.id;

    const exam = await this.prisma.exam.create({
      data: { ...createExamDto, userId: examOwnerId },
    });
    return plainToInstance(ExamEntity, exam);
  }

  async findAll(authUser: AuthTokenPayload): Promise<ExamEntity[]> {
    const exams = await this.prisma.exam.findMany({
      where: this.isAdmin(authUser) ? undefined : { userId: authUser.id },
    });
    return plainToInstance(ExamEntity, exams);
  }

  async findOne(id: string, authUser: AuthTokenPayload): Promise<ExamEntity> {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
    });
    if (!exam || (!this.isAdmin(authUser) && exam.userId !== authUser.id))
      throw new NotFoundException(`Exam with ID ${id} not found`);
    return plainToInstance(ExamEntity, exam);
  }

  async update(
    id: string,
    updateExamDto: UpdateExamDto,
    authUser: AuthTokenPayload,
  ): Promise<ExamEntity> {
    const currentExam = await this.findOne(id, authUser);

    if (updateExamDto.subjectId) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: updateExamDto.subjectId },
      });
      if (!subject || subject.userId !== currentExam.userId) {
        throw new NotFoundException(
          `Subject with ID ${updateExamDto.subjectId} not found`,
        );
      }
    }

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
