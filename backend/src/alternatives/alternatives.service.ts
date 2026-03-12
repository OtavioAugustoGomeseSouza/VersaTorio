import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlternativeDto } from './dto/create-alternative.dto';
import { UpdateAlternativeDto } from './dto/update-alternative.dto';
import { AlternativeEntity } from './entities/alternative.etity';
import { plainToInstance } from 'class-transformer';
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

  private async ensureQuestionAccess(
    questionId: string,
    authUser: AuthTokenPayload,
  ): Promise<void> {
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
  }

  async create(
    createAlternativeDto: CreateAlternativeDto,
    authUser: AuthTokenPayload,
  ): Promise<AlternativeEntity> {
    await this.ensureQuestionAccess(createAlternativeDto.questionId, authUser);

    const alternative = await this.prisma.alternative.create({
      data: createAlternativeDto,
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

    return plainToInstance(AlternativeEntity, alternative);
  }

  async update(
    id: string,
    updateAlternativeDto: UpdateAlternativeDto,
    authUser: AuthTokenPayload,
  ): Promise<AlternativeEntity> {
    await this.findOne(id, authUser);

    if (updateAlternativeDto.questionId) {
      await this.ensureQuestionAccess(
        updateAlternativeDto.questionId,
        authUser,
      );
    }

    const alternative = await this.prisma.alternative.update({
      where: { id },
      data: updateAlternativeDto,
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
