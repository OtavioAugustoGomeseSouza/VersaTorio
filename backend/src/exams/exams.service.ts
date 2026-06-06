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
import { buildExamVersionOrderData } from './exam-ordering.util';
import { ExamEntity } from './entities/exam.entity';
import { ExamQuestionEntity } from './entities/exam-question.entity';

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
      return `Versão ${letter}`;
    }

    return `Versão ${letter}${cycle + 1}`;
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

  private normalizeDistributeCorrectAlternatives(
    shuffleAlternatives: boolean,
    distributeCorrectAlternatives?: boolean,
  ): boolean {
    return shuffleAlternatives && Boolean(distributeCorrectAlternatives);
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
      throw new NotFoundException(
        `Disciplina com ID ${disciplineId} não encontrada`,
      );
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
      throw new NotFoundException(`Prova com ID ${examId} não encontrada`);
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
      throw new NotFoundException('Uma ou mais questões não foram encontradas');
    }

    if (
      !this.isAdmin(authUser) &&
      questions.some(
        (question) => question.topic.discipline.userId !== authUser.id,
      )
    ) {
      throw new NotFoundException('Uma ou mais questões não foram encontradas');
    }

    return questions;
  }

  private validateQuestionAlternativesForVersionCreation(
    questions: QuestionForOrder[],
    distributeCorrectAlternatives: boolean,
  ): void {
    for (const question of questions) {
      const totalAlternatives = question.alternatives.length;
      const correctAlternatives = question.alternatives.filter(
        (alternative) => alternative.isCorrect,
      ).length;

      if (question.type === QuestionType.DISSERTATIVE) {
        if (!question.answerText || !question.answerSpaceSize) {
          throw new BadRequestException(
            `Questão ${question.id} deve incluir resposta e tamanho do espaço de resposta para ser dissertativa`,
          );
        }

        if (totalAlternatives > 0) {
          throw new BadRequestException(
            `Questão ${question.id} não pode ter alternativas porque é dissertativa`,
          );
        }

        continue;
      }

      if (totalAlternatives < 2) {
        throw new BadRequestException(
          `Questão ${question.id} deve ter pelo menos 2 alternativas`,
        );
      }

      if (correctAlternatives < 1) {
        throw new BadRequestException(
          `Questão ${question.id} deve ter pelo menos 1 alternativa correta`,
        );
      }

      if (distributeCorrectAlternatives && correctAlternatives !== 1) {
        throw new BadRequestException(
          `Questão ${question.id} deve ter exatamente 1 alternativa correta para distribuir as alternativas corretas proporcionalmente`,
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
    const distributeCorrectAlternatives =
      this.normalizeDistributeCorrectAlternatives(
        shuffleAlternatives,
        createExamDto.distributeCorrectAlternatives,
      );
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
          distributeCorrectAlternatives,
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
        distributeCorrectAlternatives,
      );

      const questionById = new Map(
        questionsWithAlternatives.map((question) => [question.id, question]),
      );

      const baseOrderedQuestions = createExamDto.questionIds.map(
        (questionId) => {
          const question = questionById.get(questionId);
          if (!question) {
            throw new NotFoundException(
              `Questão com ID ${questionId} não encontrada`,
            );
          }

          return question;
        },
      );

      for (let index = 0; index < versionsCount; index += 1) {
        const versionQuestions = this.shuffleQuestions(
          baseOrderedQuestions,
          shuffleQuestions,
        );

        await tx.examVersion.create({
          data: {
            name: this.buildVersionName(index),
            examId: createdExam.id,
            orderData: buildExamVersionOrderData(versionQuestions, {
              shuffleAlternatives,
              distributeCorrectAlternatives,
              shuffleArray: this.shuffleArray.bind(this),
            }),
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
    topicSelections: Array<{
      topicId: string;
      quantity: number;
      questionIds: string[];
    }>;
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
        'Um ou mais tópicos não foram encontrados para esta disciplina',
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
          `Tópico ${topicId} possui apenas ${availableQuestionIds.length} questão(ões) disponível(is)`,
        );
      }

      const drawnQuestionIds = this.shuffleQuestions(
        availableQuestionIds,
        true,
      ).slice(0, quantity);

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
      throw new NotFoundException(`Prova com ID ${id} não encontrada`);
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
    const distributeCorrectAlternatives =
      updateExamDto.distributeCorrectAlternatives ??
      currentExam.distributeCorrectAlternatives;
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
        distributeCorrectAlternatives:
          this.normalizeDistributeCorrectAlternatives(
            shuffleAlternatives,
            distributeCorrectAlternatives,
          ),
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
      (!this.isAdmin(authUser) &&
        question.topic.discipline.userId !== authUser.id)
    ) {
      throw new NotFoundException(
        `Questão com ID ${addExamQuestionDto.questionId} não encontrada`,
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
        throw new ConflictException('Questão já associada a esta prova');
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
      throw new NotFoundException('Questão não associada a esta prova');
    }

    const removed = await this.prisma.examQuestion.delete({
      where: { id: examQuestion.id },
    });

    return plainToInstance(ExamQuestionEntity, removed);
  }
}
