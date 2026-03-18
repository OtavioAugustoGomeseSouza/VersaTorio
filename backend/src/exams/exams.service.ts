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
import { Prisma, QuestionType } from '@prisma/client';

type ExamVersionOrderData = {
  questions: Array<{
    questionId: string;
    position: number;
    alternatives: Array<{
      alternativeId: string;
      position: number;
    }>;
  }>;
};

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


  private async getQuestionsForExamCreation(
    questionIds: string[],
    authUser: AuthTokenPayload,
  ): Promise<Array<{ id: string; topic: { discipline: { id: string; userId: string } } }>> {
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        topic: {
          select: {
            discipline: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (questions.length !== questionIds.length) {
      throw new NotFoundException('One or more questions were not found');
    }

    if (
      !this.isAdmin(authUser) &&
      questions.some(
        (question) => question.topic.discipline.userId !== authUser.id,
      )
    ) {
      throw new NotFoundException('One or more questions were not found');
    }

    return questions;
  }

  private validateQuestionAlternativesForVersionCreation(
    questions: Array<{
      id: string;
      type: QuestionType;
      alternatives: Array<{ id: string; isCorrect: boolean }>;
    }>,
  ): void {
    for (const question of questions) {
      const totalAlternatives = question.alternatives.length;
      const correctAlternatives = question.alternatives.filter(
        (alternative) => alternative.isCorrect,
      ).length;

      if (totalAlternatives < 2) {
        throw new BadRequestException(
          `Question ${question.id} must have at least 2 alternatives`,
        );
      }

      if (correctAlternatives < 1) {
        throw new BadRequestException(
          `Question ${question.id} must have at least 1 correct alternative`,
        );
      }
    }
  }

  async create(
    createExamDto: CreateExamDto,
    authUser: AuthTokenPayload,
  ): Promise<ExamEntity> {
    const questions = await this.getQuestionsForExamCreation(
      createExamDto.questionIds,
      authUser,
    );
    const discipline = questions[0].topic.discipline;
    const examOwnerId = this.isAdmin(authUser)
      ? discipline.userId
      : authUser.id;

    const exam = await this.prisma.$transaction(async (tx) => {
      const createdExam = await tx.exam.create({
        data: {
          name: createExamDto.name,
          description: createExamDto.description,
          disciplineId: discipline.id,
          userId: examOwnerId,
        },
      });

      await tx.examQuestion.createMany({
        data: createExamDto.questionIds.map((questionId) => ({
          examId: createdExam.id,
          questionId,
        })),
      });

      const questionsWithAlternatives = await tx.question.findMany({
        where: { id: { in: createExamDto.questionIds } },
        select: {
          id: true,
          type: true,
          alternatives: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, isCorrect: true },
          },
        },
      });

      this.validateQuestionAlternativesForVersionCreation(
        questionsWithAlternatives,
      );

      const questionById = new Map(
        questionsWithAlternatives.map((question) => [question.id, question]),
      );

      const orderData: ExamVersionOrderData = {
        questions: createExamDto.questionIds.map((questionId, questionIndex) => {
          const question = questionById.get(questionId);
          if (!question) {
            throw new NotFoundException(`Question with ID ${questionId} not found`);
          }

          return {
            questionId,
            position: questionIndex + 1,
            alternatives: question.alternatives.map((alternative, alternativeIndex) => ({
              alternativeId: alternative.id,
              position: alternativeIndex + 1,
            })),
          };
        }),
      };

      await tx.examVersion.create({
        data: {
          name: 'Versao A',
          examId: createdExam.id,
          orderData,
        },
      });

      return createdExam;
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
    await this.findOne(id, authUser);

    const exam = await this.prisma.exam.update({
      where: { id },
      data: {
        name: updateExamDto.name,
        description: updateExamDto.description,
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

    try {
      const examQuestion = await this.prisma.examQuestion.create({
        data: {
          examId,
          questionId: addExamQuestionDto.questionId,
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
