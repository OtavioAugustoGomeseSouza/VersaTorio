import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionsService } from '../questions/questions.service';
import { DisciplineEntity } from './entities/discipline.entity';
import { plainToInstance } from 'class-transformer';
import {
  AuthTokenPayload,
  UserRole,
} from '../auth/interfaces/auth-token-payload.interface';

@Injectable()
export class DisciplinesService {
  constructor(
    private prisma: PrismaService,
    private readonly questionsService: QuestionsService,
  ) {}

  private isAdmin(authUser: AuthTokenPayload): boolean {
    return authUser.role === UserRole.admin;
  }

  async create(
    createDisciplineDto: CreateDisciplineDto,
    authUser: AuthTokenPayload,
  ): Promise<DisciplineEntity> {
    const existingDiscipline = await this.prisma.discipline.findFirst({
      where: { userId: authUser.id, name: createDisciplineDto.name },
    });
    if (existingDiscipline) {
      throw new ConflictException(
        `Disciplina com nome "${createDisciplineDto.name}" já existe`,
      );
    }

    const discipline = await this.prisma.discipline.create({
      data: { ...createDisciplineDto, userId: authUser.id },
    });
    return plainToInstance(DisciplineEntity, discipline);
  }

  async findAll(authUser: AuthTokenPayload): Promise<DisciplineEntity[]> {
    const disciplines = await this.prisma.discipline.findMany({
      where: this.isAdmin(authUser) ? undefined : { userId: authUser.id },
    });
    return plainToInstance(DisciplineEntity, disciplines);
  }

  async findOne(
    id: string,
    authUser: AuthTokenPayload,
  ): Promise<DisciplineEntity> {
    const discipline = await this.prisma.discipline.findUnique({
      where: { id },
    });
    if (
      !discipline ||
      (!this.isAdmin(authUser) && discipline.userId !== authUser.id)
    ) {
      throw new NotFoundException(`Disciplina com ID ${id} não encontrada`);
    }
    return plainToInstance(DisciplineEntity, discipline);
  }

  async update(
    id: string,
    updateDisciplineDto: UpdateDisciplineDto,
    authUser: AuthTokenPayload,
  ): Promise<DisciplineEntity> {
    const currentDiscipline = await this.findOne(id, authUser);

    if (updateDisciplineDto.name) {
      const existingDiscipline = await this.prisma.discipline.findFirst({
        where: {
          userId: currentDiscipline.userId,
          name: updateDisciplineDto.name,
          id: { not: id },
        },
      });
      if (existingDiscipline) {
        throw new ConflictException(
          `Disciplina com nome "${updateDisciplineDto.name}" já existe`,
        );
      }
    }

    const discipline = await this.prisma.discipline.update({
      where: { id },
      data: updateDisciplineDto,
    });
    return plainToInstance(DisciplineEntity, discipline);
  }

  async remove(
    id: string,
    authUser: AuthTokenPayload,
  ): Promise<DisciplineEntity> {
    await this.findOne(id, authUser);

    const questions = await this.prisma.question.findMany({
      where: {
        topic: {
          disciplineId: id,
        },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const question of questions) {
      await this.questionsService.remove(question.id, authUser);
    }

    const discipline = await this.prisma.discipline.delete({
      where: { id },
    });
    return plainToInstance(DisciplineEntity, discipline);
  }
}
