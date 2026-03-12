import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionEntity } from './entities/question.entity';
import { plainToInstance } from 'class-transformer';
import {
  AuthTokenPayload,
  UserRole,
} from '../auth/interfaces/auth-token-payload.interface';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  private isAdmin(authUser: AuthTokenPayload): boolean {
    return authUser.role === UserRole.admin;
  }

  private async ensureExamAccess(
    examId: string,
    authUser: AuthTokenPayload,
  ): Promise<void> {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam || (!this.isAdmin(authUser) && exam.userId !== authUser.id)) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }
  }

  async create(
    createQuestionDto: CreateQuestionDto,
    authUser: AuthTokenPayload,
  ): Promise<QuestionEntity> {
    await this.ensureExamAccess(createQuestionDto.examId, authUser);

    const question = await this.prisma.question.create({
      data: createQuestionDto,
      include: { alternatives: true },
    });
    return plainToInstance(QuestionEntity, question);
  }

  async findAll(authUser: AuthTokenPayload): Promise<QuestionEntity[]> {
    const questions = await this.prisma.question.findMany({
      where: this.isAdmin(authUser)
        ? undefined
        : {
            exam: {
              userId: authUser.id,
            },
          },
      include: { alternatives: true },
    });
    return plainToInstance(QuestionEntity, questions);
  }

  async findOne(
    id: string,
    authUser: AuthTokenPayload,
  ): Promise<QuestionEntity> {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { alternatives: true, exam: true },
    });

    if (
      !question ||
      (!this.isAdmin(authUser) &&
        (!question.exam || question.exam.userId !== authUser.id))
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

    if (updateQuestionDto.examId) {
      await this.ensureExamAccess(updateQuestionDto.examId, authUser);
    }

    const question = await this.prisma.question.update({
      where: { id },
      data: updateQuestionDto,
      include: { alternatives: true },
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
      include: { alternatives: true },
    });
    return plainToInstance(QuestionEntity, question);
  }
}
