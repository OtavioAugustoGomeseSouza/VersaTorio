import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthTokenPayload,
  UserRole,
} from '../auth/interfaces/auth-token-payload.interface';

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
type AccessibleExam = Awaited<
  ReturnType<ExamVersionsService['getAccessibleExam']>
>;

@Injectable()
export class ExamVersionsService {
  constructor(private readonly prisma: PrismaService) {}

  private isAdmin(authUser: AuthTokenPayload): boolean {
    return authUser.role === UserRole.admin;
  }

  private async getAccessibleExam(examId: string, authUser: AuthTokenPayload) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: {
          orderBy: [{ createdAt: 'asc' }],
          include: {
            question: {
              select: {
                id: true,
                type: true,
                answerText: true,
                answerSpaceSize: true,
                alternatives: true,
                topic: {
                  select: { disciplineId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!exam || (!this.isAdmin(authUser) && exam.userId !== authUser.id)) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  private validateExamQuestionsForGeneration(exam: AccessibleExam): void {
    if (exam.examQuestions.length === 0) {
      throw new BadRequestException(
        'Cannot generate exam version without questions',
      );
    }

    for (const examQuestion of exam.examQuestions) {
      const question = examQuestion.question;

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

  async generate(
    examId: string,
    name: string,
    shuffleQuestionsOverride: boolean | undefined,
    shuffleAlternativesOverride: boolean | undefined,
    authUser: AuthTokenPayload,
  ) {
    const exam = await this.getAccessibleExam(examId, authUser);
    this.validateExamQuestionsForGeneration(exam);

    const shouldShuffleQuestions =
      shuffleQuestionsOverride ?? exam.shuffleQuestions;
    const shouldShuffleAlternatives =
      shuffleAlternativesOverride ?? exam.shuffleAlternatives;

    const orderedQuestions = this.shuffleQuestions(
      exam.examQuestions.map((examQuestion) => examQuestion.question),
      shouldShuffleQuestions,
    );

    const orderData: ExamVersionOrderData = {
      questions: orderedQuestions.map((question, questionIndex) => ({
        questionId: question.id,
        position: questionIndex + 1,
        alternatives: this.shuffleAlternatives(
          [...question.alternatives],
          shouldShuffleAlternatives,
        ).map((alternative, alternativeIndex) => ({
          alternativeId: alternative.id,
          position: alternativeIndex + 1,
        })),
      })),
    };

    return this.prisma.examVersion.create({
      data: {
        name,
        examId,
        orderData,
      },
    });
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

  private shuffleArray<T>(array: T[]): T[] {
    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
  }

  findAll(authUser: AuthTokenPayload) {
    return this.prisma.examVersion.findMany({
      where: this.isAdmin(authUser)
        ? undefined
        : {
            exam: {
              userId: authUser.id,
            },
          },
    });
  }

  async findOne(id: string, authUser: AuthTokenPayload) {
    const examVersion = await this.prisma.examVersion.findUnique({
      where: { id },
      include: { exam: true },
    });

    if (
      !examVersion ||
      (!this.isAdmin(authUser) && examVersion.exam.userId !== authUser.id)
    ) {
      throw new NotFoundException(`Exam version with ID ${id} not found`);
    }

    return examVersion;
  }

  async remove(id: string, authUser: AuthTokenPayload) {
    await this.findOne(id, authUser);

    return this.prisma.examVersion.delete({
      where: { id },
    });
  }
}
