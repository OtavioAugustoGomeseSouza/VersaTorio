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
import { Prisma } from '@prisma/client';
import {
  AuthTokenPayload,
  UserRole,
} from '../auth/interfaces/auth-token-payload.interface';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

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

  async create(
    createQuestionDto: CreateQuestionDto,
    authUser: AuthTokenPayload,
  ): Promise<QuestionEntity> {
    await this.ensureTopicAccess(createQuestionDto.topicId, authUser);
    const questionImageFileIds = this.normalizeQuestionImageFileIds(
      createQuestionDto.questionImageFileIds,
    );
    await this.ensureUploadedFilesAccess(questionImageFileIds, authUser);

    const questionData = {
      text: createQuestionDto.text,
      type: createQuestionDto.type,
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
    await this.findOne(id, authUser);
    const question = await this.prisma.question.delete({
      where: { id },
      include: this.questionWithAssetsInclude,
    });
    return plainToInstance(QuestionEntity, question);
  }
}
