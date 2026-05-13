import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  AuthTokenPayload,
  UserRole,
} from '../auth/interfaces/auth-token-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { TopicEntity } from './entities/topic.entity';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  private isAdmin(authUser: AuthTokenPayload): boolean {
    return authUser.role === UserRole.admin;
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

  async create(
    disciplineId: string,
    createTopicDto: CreateTopicDto,
    authUser: AuthTokenPayload,
  ): Promise<TopicEntity> {
    await this.ensureDisciplineAccess(disciplineId, authUser);

    const existingTopic = await this.prisma.topic.findFirst({
      where: { disciplineId, name: createTopicDto.name },
    });
    if (existingTopic) {
      throw new ConflictException(
        `Topic with name "${createTopicDto.name}" already exists in this discipline`,
      );
    }

    const topic = await this.prisma.topic.create({
      data: { ...createTopicDto, disciplineId },
    });

    return plainToInstance(TopicEntity, topic);
  }

  async findAllByDiscipline(
    disciplineId: string,
    authUser: AuthTokenPayload,
  ): Promise<TopicEntity[]> {
    await this.ensureDisciplineAccess(disciplineId, authUser);

    const topics = await this.prisma.topic.findMany({
      where: { disciplineId },
      orderBy: { createdAt: 'asc' },
    });

    return plainToInstance(TopicEntity, topics);
  }

  async findOne(id: string, authUser: AuthTokenPayload): Promise<TopicEntity> {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        discipline: {
          select: { id: true, userId: true },
        },
      },
    });

    if (
      !topic ||
      (!this.isAdmin(authUser) && topic.discipline.userId !== authUser.id)
    ) {
      throw new NotFoundException(`Topic with ID ${id} not found`);
    }

    return plainToInstance(TopicEntity, topic);
  }

  async update(
    id: string,
    updateTopicDto: UpdateTopicDto,
    authUser: AuthTokenPayload,
  ): Promise<TopicEntity> {
    const currentTopic = await this.findOne(id, authUser);

    let targetDisciplineId = currentTopic.disciplineId;
    if (
      updateTopicDto.disciplineId &&
      updateTopicDto.disciplineId !== currentTopic.disciplineId
    ) {
      const discipline = await this.ensureDisciplineAccess(
        updateTopicDto.disciplineId,
        authUser,
      );
      targetDisciplineId = discipline.id;
    }

    const targetName = updateTopicDto.name ?? currentTopic.name;
    const duplicateTopic = await this.prisma.topic.findFirst({
      where: {
        disciplineId: targetDisciplineId,
        name: targetName,
        id: { not: id },
      },
    });

    if (duplicateTopic) {
      throw new ConflictException(
        `Topic with name "${targetName}" already exists in this discipline`,
      );
    }

    const topic = await this.prisma.topic.update({
      where: { id },
      data: {
        name: updateTopicDto.name,
        disciplineId: updateTopicDto.disciplineId,
      },
    });

    return plainToInstance(TopicEntity, topic);
  }

  async remove(id: string, authUser: AuthTokenPayload): Promise<TopicEntity> {
    await this.findOne(id, authUser);

    const topic = await this.prisma.topic.delete({
      where: { id },
    });

    return plainToInstance(TopicEntity, topic);
  }
}
