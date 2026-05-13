import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionEntity } from './entities/question.entity';
import { plainToInstance } from 'class-transformer';
import { Prisma, QuestionType } from '@prisma/client';
import {
  AuthTokenPayload,
  UserRole,
} from '../auth/interfaces/auth-token-payload.interface';
import { UploadedFilesService } from '../uploaded-files/uploaded-files.service';

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
export class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private readonly uploadedFilesService: UploadedFilesService,
  ) {}

  private readonly questionWithAssetsInclude = {
    alternatives: true,
    questionImages: {
      orderBy: {
        position: 'asc',
      },
      select: {
        id: true,
        questionId: true,
        fileId: true,
        position: true,
        createdAt: true,
      },
    },
  } satisfies Prisma.QuestionInclude;

  private isAdmin(authUser: AuthTokenPayload): boolean {
    return authUser.role === UserRole.admin;
  }

  private async ensureTopicAccess(
    topicId: string,
    authUser: AuthTokenPayload,
  ): Promise<void> {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        discipline: {
          select: { userId: true },
        },
      },
    });

    if (
      !topic ||
      (!this.isAdmin(authUser) && topic.discipline.userId !== authUser.id)
    ) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }
  }

  private async ensureUploadedFilesAccess(
    fileIds: string[],
    authUser: AuthTokenPayload,
  ): Promise<void> {
    if (fileIds.length === 0) {
      return;
    }

    const uploadedFiles = await this.prisma.uploadedFile.findMany({
      where: {
        id: {
          in: fileIds,
        },
        ...(this.isAdmin(authUser) ? {} : { userId: authUser.id }),
      },
      select: {
        id: true,
      },
    });

    if (uploadedFiles.length !== fileIds.length) {
      throw new NotFoundException(
        'One or more uploaded files were not found for this user',
      );
    }
  }

  private normalizeQuestionImageFileIds(fileIds?: string[]): string[] {
    if (!fileIds) {
      return [];
    }

    const normalizedFileIds = fileIds.filter(Boolean);
    if (normalizedFileIds.length !== fileIds.length) {
      throw new BadRequestException('questionImageFileIds contains invalid values');
    }

    return normalizedFileIds;
  }

  private buildQuestionImageCreateManyData(
    questionId: string,
    questionImageFileIds: string[],
  ) {
    return questionImageFileIds.map((fileId, index) => ({
      questionId,
      fileId,
      position: index + 1,
    }));
  }

  private parseExamVersionOrderData(
    orderData: Prisma.JsonValue,
  ): ExamVersionOrderData {
    if (
      !orderData ||
      typeof orderData !== 'object' ||
      Array.isArray(orderData) ||
      !Array.isArray((orderData as { questions?: unknown }).questions)
    ) {
      throw new BadRequestException('Exam version orderData is invalid');
    }

    const questions = (orderData as { questions: unknown[] }).questions.map(
      (question) => {
        if (
          !question ||
          typeof question !== 'object' ||
          Array.isArray(question)
        ) {
          throw new BadRequestException(
            'Exam version question order is invalid',
          );
        }

        const parsedQuestion = question as {
          questionId?: unknown;
          position?: unknown;
          alternatives?: unknown;
        };

        if (
          typeof parsedQuestion.questionId !== 'string' ||
          typeof parsedQuestion.position !== 'number' ||
          !Array.isArray(parsedQuestion.alternatives)
        ) {
          throw new BadRequestException(
            'Exam version question order is invalid',
          );
        }

        const alternatives = parsedQuestion.alternatives.map((alternative) => {
          if (
            !alternative ||
            typeof alternative !== 'object' ||
            Array.isArray(alternative)
          ) {
            throw new BadRequestException(
              'Exam version alternative order is invalid',
            );
          }

          const parsedAlternative = alternative as {
            alternativeId?: unknown;
            position?: unknown;
          };

          if (
            typeof parsedAlternative.alternativeId !== 'string' ||
            typeof parsedAlternative.position !== 'number'
          ) {
            throw new BadRequestException(
              'Exam version alternative order is invalid',
            );
          }

          return {
            alternativeId: parsedAlternative.alternativeId,
            position: parsedAlternative.position,
          };
        });

        return {
          questionId: parsedQuestion.questionId,
          position: parsedQuestion.position,
          alternatives,
        };
      },
    );

    return {
      questions: questions.sort(
        (first, second) => first.position - second.position,
      ),
    };
  }

  private removeQuestionFromOrderData(
    orderData: Prisma.JsonValue,
    questionId: string,
  ): {
    didChange: boolean;
    nextOrderData: ExamVersionOrderData;
  } {
    const parsedOrderData = this.parseExamVersionOrderData(orderData);
    const remainingQuestions = parsedOrderData.questions.filter(
      (question) => question.questionId !== questionId,
    );

    return {
      didChange: remainingQuestions.length !== parsedOrderData.questions.length,
      nextOrderData: {
        questions: remainingQuestions.map((question, index) => ({
          ...question,
          position: index + 1,
        })),
      },
    };
  }

  private removeQuestionFromAnswerKeyJson(
    answerKeyJson: Prisma.JsonValue | null,
    questionId: string,
  ): Prisma.InputJsonValue | null {
    if (
      !answerKeyJson ||
      typeof answerKeyJson !== 'object' ||
      Array.isArray(answerKeyJson)
    ) {
      return null;
    }

    const parsedAnswerKey = answerKeyJson as {
      answers?: unknown;
      [key: string]: unknown;
    };
    const answers = Array.isArray(parsedAnswerKey.answers)
      ? parsedAnswerKey.answers
      : [];

    return {
      ...parsedAnswerKey,
      answers: answers
        .filter((answer) => {
          if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
            return false;
          }

          return (answer as { questionId?: unknown }).questionId !== questionId;
        })
        .map((answer, index) => ({
          ...(answer as Record<string, unknown>),
          questionNumber: index + 1,
        })),
    } as Prisma.InputJsonValue;
  }

  private extractUploadedFileIdFromContentUrl(
    contentUrl?: string | null,
  ): string | null {
    if (!contentUrl) {
      return null;
    }

    const match = contentUrl.match(/^\/uploaded-files\/([^/]+)\/content$/);
    return match?.[1] ?? null;
  }

  private async cleanupUploadedFiles(
    fileIds: string[],
    authUser: AuthTokenPayload,
  ): Promise<void> {
    if (fileIds.length === 0) {
      return;
    }

    const uniqueFileIds = [...new Set(fileIds)];

    await Promise.all(
      uniqueFileIds.map(async (fileId) => {
        try {
          await this.uploadedFilesService.remove(fileId, authUser);
        } catch (error) {
          if (
            error instanceof NotFoundException ||
            error instanceof BadRequestException
          ) {
            return;
          }

          throw error;
        }
      }),
    );
  }

  private validateQuestionPayloadForCreate(
    createQuestionDto: CreateQuestionDto,
  ): void {
    const answerText = createQuestionDto.answerText?.trim() ?? '';
    const answerSpaceSize = createQuestionDto.answerSpaceSize;

    if (createQuestionDto.type === QuestionType.DISSERTATIVE) {
      if (answerText.length === 0) {
        throw new BadRequestException(
          'DISSERTATIVE questions must include answerText',
        );
      }

      if (!answerSpaceSize) {
        throw new BadRequestException(
          'DISSERTATIVE questions must include answerSpaceSize',
        );
      }
    }

    if (createQuestionDto.type === QuestionType.MULTIPLE_CHOICE) {
      if (answerText.length > 0 || answerSpaceSize) {
        throw new BadRequestException(
          'MULTIPLE_CHOICE questions cannot include answerText or answerSpaceSize',
        );
      }
    }
  }

  private async validateQuestionPayloadForUpdate(
    id: string,
    updateQuestionDto: UpdateQuestionDto,
  ): Promise<void> {
    if (
      updateQuestionDto.type === undefined &&
      updateQuestionDto.answerText === undefined &&
      updateQuestionDto.answerSpaceSize === undefined
    ) {
      return;
    }

    const currentQuestion = await this.prisma.question.findUnique({
      where: { id },
      select: {
        type: true,
        answerText: true,
        answerSpaceSize: true,
      },
    });

    if (!currentQuestion) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    const nextType = updateQuestionDto.type ?? currentQuestion.type;
    const nextAnswerText =
      updateQuestionDto.answerText !== undefined
        ? updateQuestionDto.answerText.trim()
        : (currentQuestion.answerText ?? '');
    const nextAnswerSpaceSize =
      updateQuestionDto.answerSpaceSize ?? currentQuestion.answerSpaceSize;

    if (nextType === QuestionType.DISSERTATIVE) {
      if (nextAnswerText.length === 0) {
        throw new BadRequestException(
          'DISSERTATIVE questions must include answerText',
        );
      }

      if (!nextAnswerSpaceSize) {
        throw new BadRequestException(
          'DISSERTATIVE questions must include answerSpaceSize',
        );
      }
    }

    if (nextType === QuestionType.MULTIPLE_CHOICE) {
      const isSwitchingToMultipleChoice =
        updateQuestionDto.type === QuestionType.MULTIPLE_CHOICE;

      if (isSwitchingToMultipleChoice) {
        return;
      }

      if (nextAnswerText.length > 0 || nextAnswerSpaceSize) {
        throw new BadRequestException(
          'MULTIPLE_CHOICE questions cannot include answerText or answerSpaceSize',
        );
      }
    }
  }

  async create(
    createQuestionDto: CreateQuestionDto,
    authUser: AuthTokenPayload,
  ): Promise<QuestionEntity> {
    await this.ensureTopicAccess(createQuestionDto.topicId, authUser);
    this.validateQuestionPayloadForCreate(createQuestionDto);
    const questionImageFileIds = this.normalizeQuestionImageFileIds(
      createQuestionDto.questionImageFileIds,
    );
    await this.ensureUploadedFilesAccess(questionImageFileIds, authUser);

    const questionData = {
      text: createQuestionDto.text,
      type: createQuestionDto.type,
      answerText:
        createQuestionDto.type === QuestionType.DISSERTATIVE
          ? createQuestionDto.answerText?.trim() ?? null
          : null,
      answerSpaceSize:
        createQuestionDto.type === QuestionType.DISSERTATIVE
          ? createQuestionDto.answerSpaceSize ?? null
          : null,
      topicId: createQuestionDto.topicId,
    };

    const question = await this.prisma.$transaction(async (tx) => {
      const createdQuestion = await tx.question.create({
        data: questionData,
      });

      if (questionImageFileIds.length > 0) {
        await tx.questionImage.createMany({
          data: this.buildQuestionImageCreateManyData(
            createdQuestion.id,
            questionImageFileIds,
          ),
        });
      }

      const createdQuestionWithRelations = await tx.question.findUnique({
        where: { id: createdQuestion.id },
        include: this.questionWithAssetsInclude,
      });

      if (!createdQuestionWithRelations) {
        throw new NotFoundException(
          `Question with ID ${createdQuestion.id} not found`,
        );
      }

      return createdQuestionWithRelations;
    });

    return plainToInstance(QuestionEntity, question);
  }

  async findAll(authUser: AuthTokenPayload): Promise<QuestionEntity[]> {
    const questions = await this.prisma.question.findMany({
      where: this.isAdmin(authUser)
        ? undefined
        : {
            topic: {
              discipline: {
                userId: authUser.id,
              },
            },
          },
      include: this.questionWithAssetsInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
    return plainToInstance(QuestionEntity, questions);
  }

  async findOne(
    id: string,
    authUser: AuthTokenPayload,
  ): Promise<QuestionEntity> {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        ...this.questionWithAssetsInclude,
        topic: {
          include: {
            discipline: {
              select: { userId: true },
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
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return plainToInstance(QuestionEntity, question);
  }

  async update(
    id: string,
    updateQuestionDto: UpdateQuestionDto,
    authUser: AuthTokenPayload,
  ): Promise<QuestionEntity> {
    await this.findOne(id, authUser);
    await this.validateQuestionPayloadForUpdate(id, updateQuestionDto);

    if (updateQuestionDto.topicId) {
      await this.ensureTopicAccess(updateQuestionDto.topicId, authUser);
    }

    const questionImageFileIds = updateQuestionDto.questionImageFileIds
      ? this.normalizeQuestionImageFileIds(updateQuestionDto.questionImageFileIds)
      : undefined;

    if (questionImageFileIds) {
      await this.ensureUploadedFilesAccess(questionImageFileIds, authUser);
    }

    const questionData = {
      ...(updateQuestionDto.text !== undefined
        ? { text: updateQuestionDto.text }
        : {}),
      ...(updateQuestionDto.type !== undefined
        ? { type: updateQuestionDto.type }
        : {}),
      ...(updateQuestionDto.type === QuestionType.MULTIPLE_CHOICE
        ? { answerText: null, answerSpaceSize: null }
        : {}),
      ...(updateQuestionDto.answerText !== undefined
        ? {
            answerText:
              updateQuestionDto.answerText.trim().length > 0
                ? updateQuestionDto.answerText.trim()
                : null,
          }
        : {}),
      ...(updateQuestionDto.answerSpaceSize !== undefined
        ? { answerSpaceSize: updateQuestionDto.answerSpaceSize }
        : {}),
      ...(updateQuestionDto.topicId !== undefined
        ? { topicId: updateQuestionDto.topicId }
        : {}),
    };

    const question = await this.prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id },
        data: questionData,
      });

      if (questionImageFileIds) {
        await tx.questionImage.deleteMany({
          where: { questionId: id },
        });

        if (questionImageFileIds.length > 0) {
          await tx.questionImage.createMany({
            data: this.buildQuestionImageCreateManyData(id, questionImageFileIds),
          });
        }
      }

      const updatedQuestion = await tx.question.findUnique({
        where: { id },
        include: this.questionWithAssetsInclude,
      });

      if (!updatedQuestion) {
        throw new NotFoundException(`Question with ID ${id} not found`);
      }

      return updatedQuestion;
    });

    return plainToInstance(QuestionEntity, question);
  }

  async remove(
    id: string,
    authUser: AuthTokenPayload,
  ): Promise<QuestionEntity> {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        ...this.questionWithAssetsInclude,
        topic: {
          include: {
            discipline: {
              select: { userId: true },
            },
          },
        },
        examQuestions: {
          select: {
            exam: {
              select: {
                versions: {
                  select: {
                    id: true,
                    orderData: true,
                    answerKeyJson: true,
                    pdfUrl: true,
                    answerKeyUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (
      !question ||
      (!this.isAdmin(authUser) && question.topic.discipline.userId !== authUser.id)
    ) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    const uploadedFileIdsToCleanup = new Set<string>();

    question.questionImages.forEach((questionImage) => {
      uploadedFileIdsToCleanup.add(questionImage.fileId);
    });

    question.alternatives.forEach((alternative) => {
      if (alternative.imageFileId) {
        uploadedFileIdsToCleanup.add(alternative.imageFileId);
      }
    });

    for (const examQuestion of question.examQuestions) {
      for (const version of examQuestion.exam.versions) {
        const { didChange, nextOrderData } = this.removeQuestionFromOrderData(
          version.orderData,
          id,
        );

        if (!didChange) {
          continue;
        }

        const pdfFileId = this.extractUploadedFileIdFromContentUrl(version.pdfUrl);
        if (pdfFileId) {
          uploadedFileIdsToCleanup.add(pdfFileId);
        }

        const answerKeyFileId = this.extractUploadedFileIdFromContentUrl(
          version.answerKeyUrl,
        );
        if (answerKeyFileId) {
          uploadedFileIdsToCleanup.add(answerKeyFileId);
        }
      }
    }

    const removedQuestion = await this.prisma.$transaction(async (tx) => {
      for (const examQuestion of question.examQuestions) {
        for (const version of examQuestion.exam.versions) {
          const { didChange, nextOrderData } = this.removeQuestionFromOrderData(
            version.orderData,
            id,
          );

          if (!didChange) {
            continue;
          }

          const nextAnswerKeyJson = this.removeQuestionFromAnswerKeyJson(
            version.answerKeyJson,
            id,
          );

          await tx.examVersion.update({
            where: { id: version.id },
            data: {
              orderData: nextOrderData as unknown as Prisma.InputJsonValue,
              answerKeyJson:
                nextAnswerKeyJson === null
                  ? Prisma.DbNull
                  : nextAnswerKeyJson,
              pdfUrl: null,
              answerKeyUrl: null,
            },
          });
        }
      }

      return tx.question.delete({
        where: { id },
        include: this.questionWithAssetsInclude,
      });
    });

    await this.cleanupUploadedFiles([...uploadedFileIdsToCleanup], authUser);

    return plainToInstance(QuestionEntity, removedQuestion);
  }
}
