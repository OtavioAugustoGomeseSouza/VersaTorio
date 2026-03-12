import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ExamEntity } from './entities/exam.entity';
import { plainToInstance } from 'class-transformer';
import {
  AuthTokenPayload,
  UserRole,
} from '../auth/interfaces/auth-token-payload.interface';
import { AddExamQuestionDto } from './dto/add-exam-question.dto';
import { ExamQuestionEntity } from './entities/exam-question.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  private isAdmin(authUser: AuthTokenPayload): boolean {
    return authUser.role === UserRole.admin;
  }

  private async ensureExamAccess(
    examId: string,
    authUser: AuthTokenPayload,
  ): Promise<{ id: string; userId: string; disciplineId: string }> {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, userId: true, disciplineId: true },
    });

    if (!exam || (!this.isAdmin(authUser) && exam.userId !== authUser.id)) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    return exam;
  }

  private async getAccessibleDiscipline(
    disciplineId: string,
    authUser: AuthTokenPayload,
  ): Promise<{ id: string; userId: string }> {
    const discipline = await this.prisma.discipline.findUnique({
      where: { id: disciplineId },
      select: { id: true, userId: true },
    });

    if (
      !discipline ||
      (!this.isAdmin(authUser) && discipline.userId !== authUser.id)
    ) {
      throw new NotFoundException(`Discipline with ID ${disciplineId} not found`);
    }

    return discipline;
  }

  async create(
    createExamDto: CreateExamDto,
    authUser: AuthTokenPayload,
  ): Promise<ExamEntity> {
    const discipline = await this.getAccessibleDiscipline(
      createExamDto.disciplineId,
      authUser,
    );
    const examOwnerId = this.isAdmin(authUser)
      ? discipline.userId
      : authUser.id;

    const exam = await this.prisma.exam.create({
      data: {
        name: createExamDto.name,
        description: createExamDto.description,
        disciplineId: createExamDto.disciplineId,
        userId: examOwnerId,
      },
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

    if (!exam || (!this.isAdmin(authUser) && exam.userId !== authUser.id)) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    return plainToInstance(ExamEntity, exam);
  }

  async update(
    id: string,
    updateExamDto: UpdateExamDto,
    authUser: AuthTokenPayload,
  ): Promise<ExamEntity> {
    const currentExam = await this.findOne(id, authUser);

    if (updateExamDto.disciplineId) {
      const discipline = await this.prisma.discipline.findUnique({
        where: { id: updateExamDto.disciplineId },
        select: { userId: true },
      });
      if (!discipline || discipline.userId !== currentExam.userId) {
        throw new NotFoundException(
          `Discipline with ID ${updateExamDto.disciplineId} not found`,
        );
      }
    }

    const exam = await this.prisma.exam.update({
      where: { id },
      data: {
        name: updateExamDto.name,
        description: updateExamDto.description,
        disciplineId: updateExamDto.disciplineId,
      },
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

  async addQuestion(
    examId: string,
    addExamQuestionDto: AddExamQuestionDto,
    authUser: AuthTokenPayload,
  ): Promise<ExamQuestionEntity> {
    const exam = await this.ensureExamAccess(examId, authUser);

    const question = await this.prisma.question.findUnique({
      where: { id: addExamQuestionDto.questionId },
      include: {
        topic: {
          include: {
            discipline: {
              select: { id: true, userId: true },
            },
          },
        },
      },
    });

    if (
      !question ||
      (!this.isAdmin(authUser) && question.topic.discipline.userId !== authUser.id)
    ) {
      throw new NotFoundException(
        `Question with ID ${addExamQuestionDto.questionId} not found`,
      );
    }

    if (question.topic.discipline.id !== exam.disciplineId) {
      throw new BadRequestException(
        'Question topic discipline must match exam discipline',
      );
    }

    try {
      const examQuestion = await this.prisma.examQuestion.create({
        data: {
          examId,
          questionId: addExamQuestionDto.questionId,
          position: addExamQuestionDto.position,
        },
      });

      return plainToInstance(ExamQuestionEntity, examQuestion);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Question is already associated with exam');
      }
      throw error;
    }
  }

  async removeQuestion(
    examId: string,
    questionId: string,
    authUser: AuthTokenPayload,
  ): Promise<ExamQuestionEntity> {
    await this.ensureExamAccess(examId, authUser);

    const examQuestion = await this.prisma.examQuestion.findUnique({
      where: {
        examId_questionId: {
          examId,
          questionId,
        },
      },
    });

    if (!examQuestion) {
      throw new NotFoundException('Question is not associated with this exam');
    }

    const removed = await this.prisma.examQuestion.delete({
      where: { id: examQuestion.id },
    });

    return plainToInstance(ExamQuestionEntity, removed);
  }
}
