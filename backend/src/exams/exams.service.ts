import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnswerSpaceSize, Prisma, QuestionType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import {
  AuthTokenPayload,
  UserRole,
} from '../auth/interfaces/auth-token-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AddExamQuestionDto } from './dto/add-exam-question.dto';
import { CreateExamDto } from './dto/create-exam.dto';
import { DrawQuestionsDto } from './dto/draw-questions.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamEntity } from './entities/exam.entity';
import { ExamQuestionEntity } from './entities/exam-question.entity';

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

type QuestionForCreation = {
  id: string;
  topic: { discipline: { id: string; userId: string } };
};

type QuestionForOrder = {
  id: string;
  type: QuestionType;
  answerText: string | null;
  answerSpaceSize: AnswerSpaceSize | null;
  alternatives: Array<{ id: string; isCorrect: boolean }>;
};

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  private isAdmin(authUser: AuthTokenPayload): boolean {
    return authUser.role === UserRole.admin;
  }

  private buildVersionName(index: number): string {
    const letterIndex = index % 26;
    const cycle = Math.floor(index / 26);
    const letter = String.fromCharCode(65 + letterIndex);

    if (cycle === 0) {
      return `Versao ${letter}`;
    }

    return `Versao ${letter}${cycle + 1}`;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
  }

  private shuffleQuestions<T>(questions: T[], shouldShuffle: boolean): T[] {
    if (!shouldShuffle) {
      return [...questions];
    }

    return this.shuffleArray(questions);
  }

  private shuffleAlternatives<T>(
    alternatives: T[],
    shouldShuffle: boolean,
  ): T[] {
    if (!shouldShuffle) {
      return [...alternatives];
    }

    return this.shuffleArray(alternatives);
  }

  private normalizeVersionsCount(
    shuffleQuestions: boolean,
    shuffleAlternatives: boolean,
    versionsCount: number,
  ): number {
    if (!shuffleQuestions && !shuffleAlternatives) {
      return 1;
    }

    return versionsCount;
  }

  private buildOrderData(
    questions: QuestionForOrder[],
    shuffleAlternatives: boolean,
  ): ExamVersionOrderData {
    return {
      questions: questions.map((question, questionIndex) => ({
        questionId: question.id,
        position: questionIndex + 1,
        alternatives: this.shuffleAlternatives(
          question.alternatives,
          shuffleAlternatives,
        ).map((alternative, alternativeIndex) => ({
          alternativeId: alternative.id,
          position: alternativeIndex + 1,
        })),
      })),
    };
  }

  private async ensureDisciplineAccess(
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

  private async ensureExamAccess(
    examId: string,
    authUser: AuthTokenPayload,
  ): Promise<{ id: string; userId: string }> {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, userId: true },
    });

    if (!exam || (!this.isAdmin(authUser) && exam.userId !== authUser.id)) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    return exam;
  }

  private async getQuestionsForExamCreation(
    questionIds: string[],
    authUser: AuthTokenPayload,
  ): Promise<QuestionForCreation[]> {
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
    questions: QuestionForOrder[],
  ): void {
    for (const question of questions) {
      const totalAlternatives = question.alternatives.length;
      const correctAlternatives = question.alternatives.filter(
        (alternative) => alternative.isCorrect,
      ).length;

      if (question.type === QuestionType.DISSERTATIVE) {
        if (!question.answerText || !question.answerSpaceSize) {
          throw new BadRequestException(
            `Question ${question.id} must include answerText and answerSpaceSize for DISSERTATIVE`,
          );
        }

        if (totalAlternatives > 0) {
          throw new BadRequestException(
            `Question ${question.id} cannot have alternatives for DISSERTATIVE`,
          );
        }

        continue;
      }

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

    const shuffleQuestions = createExamDto.shuffleQuestions ?? true;
    const shuffleAlternatives = createExamDto.shuffleAlternatives ?? true;
    const versionsCount = this.normalizeVersionsCount(
      shuffleQuestions,
      shuffleAlternatives,
      createExamDto.versionsCount ?? 1,
    );

    const exam = await this.prisma.$transaction(async (tx) => {
      const createdExam = await tx.exam.create({
        data: {
          name: createExamDto.name,
          description: createExamDto.description,
          disciplineId: discipline.id,
          userId: examOwnerId,
          shuffleQuestions,
          shuffleAlternatives,
          versionsCountDefault: versionsCount,
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
          answerText: true,
          answerSpaceSize: true,
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

      const baseOrderedQuestions = createExamDto.questionIds.map((questionId) => {
        const question = questionById.get(questionId);
        if (!question) {
          throw new NotFoundException(`Question with ID ${questionId} not found`);
        }

        return question;
      });

      for (let index = 0; index < versionsCount; index += 1) {
        const versionQuestions = this.shuffleQuestions(
          baseOrderedQuestions,
          shuffleQuestions,
        );

        await tx.examVersion.create({
          data: {
            name: this.buildVersionName(index),
            examId: createdExam.id,
            orderData: this.buildOrderData(versionQuestions, shuffleAlternatives),
          },
        });
      }

      return createdExam;
    });

    return plainToInstance(ExamEntity, exam);
  }

  async drawQuestions(
    drawQuestionsDto: DrawQuestionsDto,
    authUser: AuthTokenPayload,
  ): Promise<{
    disciplineId: string;
    questionIds: string[];
    topicSelections: Array<{ topicId: string; quantity: number; questionIds: string[] }>;
  }> {
    await this.ensureDisciplineAccess(drawQuestionsDto.disciplineId, authUser);

    const groupedRules = new Map<string, number>();
    for (const rule of drawQuestionsDto.topicRules) {
      const previous = groupedRules.get(rule.topicId) ?? 0;
      groupedRules.set(rule.topicId, previous + rule.quantity);
    }

    const topicIds = [...groupedRules.keys()];

    const topics = await this.prisma.topic.findMany({
      where: {
        id: { in: topicIds },
        disciplineId: drawQuestionsDto.disciplineId,
      },
      select: { id: true },
    });

    if (topics.length !== topicIds.length) {
      throw new NotFoundException(
        'One or more topics were not found for this discipline',
      );
    }

    const questions = await this.prisma.question.findMany({
      where: {
        topicId: { in: topicIds },
      },
      select: {
        id: true,
        topicId: true,
      },
    });

    const questionsByTopic = new Map<string, string[]>();
    for (const question of questions) {
      const current = questionsByTopic.get(question.topicId) ?? [];
      current.push(question.id);
      questionsByTopic.set(question.topicId, current);
    }

    const questionIds: string[] = [];
    const topicSelections: Array<{
      topicId: string;
      quantity: number;
      questionIds: string[];
    }> = [];

    for (const [topicId, quantity] of groupedRules.entries()) {
      const availableQuestionIds = questionsByTopic.get(topicId) ?? [];

      if (quantity > availableQuestionIds.length) {
        throw new BadRequestException(
          `Topic ${topicId} has only ${availableQuestionIds.length} available questions`,
        );
      }

      const drawnQuestionIds = this.shuffleQuestions(availableQuestionIds, true).slice(
        0,
        quantity,
      );

      questionIds.push(...drawnQuestionIds);
      topicSelections.push({
        topicId,
        quantity,
        questionIds: drawnQuestionIds,
      });
    }

    return {
      disciplineId: drawQuestionsDto.disciplineId,
      questionIds,
      topicSelections,
    };
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
    const shuffleQuestions =
      updateExamDto.shuffleQuestions ?? currentExam.shuffleQuestions;
    const shuffleAlternatives =
      updateExamDto.shuffleAlternatives ?? currentExam.shuffleAlternatives;
    const versionsCountDefault = this.normalizeVersionsCount(
      shuffleQuestions,
      shuffleAlternatives,
      updateExamDto.versionsCountDefault ?? currentExam.versionsCountDefault,
    );

    const exam = await this.prisma.exam.update({
      where: { id },
      data: {
        name: updateExamDto.name,
        description: updateExamDto.description,
        shuffleQuestions: updateExamDto.shuffleQuestions,
        shuffleAlternatives: updateExamDto.shuffleAlternatives,
        versionsCountDefault,
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
