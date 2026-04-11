import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlternativeDto } from './dto/create-alternative.dto';
import { UpdateAlternativeDto } from './dto/update-alternative.dto';
import { AlternativeEntity } from './entities/alternative.etity';
import { plainToInstance } from 'class-transformer';
import { AlternativeType, QuestionType } from '@prisma/client';
import {
  AuthTokenPayload,
  UserRole,
} from '../auth/interfaces/auth-token-payload.interface';

@Injectable()
export class AlternativesService {
  constructor(private prisma: PrismaService) {}

  private isAdmin(authUser: AuthTokenPayload): boolean {
    return authUser.role === UserRole.admin;
  }

  private async getAccessibleQuestion(
    questionId: string,
    authUser: AuthTokenPayload,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
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
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    return question;
  }

  private async ensureUploadedFileAccess(
    uploadedFileId: string,
    authUser: AuthTokenPayload,
  ): Promise<void> {
    const uploadedFile = await this.prisma.uploadedFile.findUnique({
      where: { id: uploadedFileId },
    });

    if (
      !uploadedFile ||
      (!this.isAdmin(authUser) && uploadedFile.userId !== authUser.id)
    ) {
      throw new NotFoundException(
        `Uploaded file with ID ${uploadedFileId} not found`,
      );
    }
  }

  private validateCreatePayload(createAlternativeDto: CreateAlternativeDto): void {
    const text = createAlternativeDto.text?.trim() ?? '';

    if (createAlternativeDto.type === AlternativeType.TEXT && text.length === 0) {
      throw new BadRequestException('TEXT alternatives must have non-empty text');
    }

    if (
      createAlternativeDto.type === AlternativeType.TEXT &&
      createAlternativeDto.imageFileId
    ) {
      throw new BadRequestException(
        'TEXT alternatives cannot include imageFileId',
      );
    }

    if (
      createAlternativeDto.type === AlternativeType.IMAGE &&
      !createAlternativeDto.imageFileId
    ) {
      throw new BadRequestException(
        'IMAGE alternatives must include imageFileId',
      );
    }
  }

  private async buildValidatedCreateData(
    createAlternativeDto: CreateAlternativeDto,
    authUser: AuthTokenPayload,
  ) {
    this.validateCreatePayload(createAlternativeDto);

    if (createAlternativeDto.imageFileId) {
      await this.ensureUploadedFileAccess(createAlternativeDto.imageFileId, authUser);
    }

    const normalizedText = createAlternativeDto.text?.trim() ?? '';

    return {
      text: normalizedText,
      type: createAlternativeDto.type,
      isCorrect: createAlternativeDto.isCorrect,
      questionId: createAlternativeDto.questionId,
      imageFileId:
        createAlternativeDto.type === AlternativeType.IMAGE
          ? createAlternativeDto.imageFileId ?? null
          : null,
    };
  }

  private async getAlternativeWithAccess(
    id: string,
    authUser: AuthTokenPayload,
  ) {
    const alternative = await this.prisma.alternative.findUnique({
      where: { id },
      include: {
        question: {
          include: {
            topic: {
              include: {
                discipline: {
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (
      !alternative ||
      (!this.isAdmin(authUser) &&
        alternative.question.topic.discipline.userId !== authUser.id)
    ) {
      throw new NotFoundException(`Alternative with ID ${id} not found`);
    }

    return alternative;
  }

  private async buildValidatedUpdateData(
    existingAlternative: Awaited<
      ReturnType<AlternativesService['getAlternativeWithAccess']>
    >,
    updateAlternativeDto: UpdateAlternativeDto,
    authUser: AuthTokenPayload,
  ) {
    const nextType = updateAlternativeDto.type ?? existingAlternative.type;
    const nextText =
      updateAlternativeDto.text !== undefined
        ? updateAlternativeDto.text.trim()
        : existingAlternative.text;
    const nextImageFileId =
      updateAlternativeDto.imageFileId ?? existingAlternative.imageFileId;

    if (nextType === AlternativeType.TEXT) {
      if (nextText.length === 0) {
        throw new BadRequestException('TEXT alternatives must have non-empty text');
      }
    }

    if (nextType === AlternativeType.IMAGE && !nextImageFileId) {
      throw new BadRequestException('IMAGE alternatives must include imageFileId');
    }

    if (nextImageFileId) {
      await this.ensureUploadedFileAccess(nextImageFileId, authUser);
    }

    return {
      text: nextText,
      type: nextType,
      isCorrect: updateAlternativeDto.isCorrect ?? existingAlternative.isCorrect,
      questionId: updateAlternativeDto.questionId ?? existingAlternative.questionId,
      imageFileId: nextType === AlternativeType.IMAGE ? nextImageFileId : null,
    };
  }

  async create(
    createAlternativeDto: CreateAlternativeDto,
    authUser: AuthTokenPayload,
  ): Promise<AlternativeEntity> {
    const question = await this.getAccessibleQuestion(
      createAlternativeDto.questionId,
      authUser,
    );

    if (question.type !== QuestionType.MULTIPLE_CHOICE) {
      throw new BadRequestException(
        'Alternatives can only be added to MULTIPLE_CHOICE questions',
      );
    }

    const data = await this.buildValidatedCreateData(createAlternativeDto, authUser);

    const alternative = await this.prisma.alternative.create({
      data,
    });
    return plainToInstance(AlternativeEntity, alternative);
  }

  async findAll(authUser: AuthTokenPayload): Promise<AlternativeEntity[]> {
    const alternatives = await this.prisma.alternative.findMany({
      where: this.isAdmin(authUser)
        ? undefined
        : {
            question: {
              topic: {
                discipline: {
                  userId: authUser.id,
                },
              },
            },
          },
    });
    return plainToInstance(AlternativeEntity, alternatives);
  }

  async findOne(
    id: string,
    authUser: AuthTokenPayload,
  ): Promise<AlternativeEntity> {
    const alternative = await this.getAlternativeWithAccess(id, authUser);
    return plainToInstance(AlternativeEntity, alternative);
  }

  async update(
    id: string,
    updateAlternativeDto: UpdateAlternativeDto,
    authUser: AuthTokenPayload,
  ): Promise<AlternativeEntity> {
    const existingAlternative = await this.getAlternativeWithAccess(id, authUser);

    if (updateAlternativeDto.questionId) {
      const targetQuestion = await this.getAccessibleQuestion(
        updateAlternativeDto.questionId,
        authUser,
      );

      if (targetQuestion.type !== QuestionType.MULTIPLE_CHOICE) {
        throw new BadRequestException(
          'Alternatives can only be linked to MULTIPLE_CHOICE questions',
        );
      }
    }

    const data = await this.buildValidatedUpdateData(
      existingAlternative,
      updateAlternativeDto,
      authUser,
    );

    const alternative = await this.prisma.alternative.update({
      where: { id },
      data,
    });
    return plainToInstance(AlternativeEntity, alternative);
  }

  async remove(
    id: string,
    authUser: AuthTokenPayload,
  ): Promise<AlternativeEntity> {
    await this.findOne(id, authUser);
    const alternative = await this.prisma.alternative.delete({
      where: { id },
    });
    return plainToInstance(AlternativeEntity, alternative);
  }
}
