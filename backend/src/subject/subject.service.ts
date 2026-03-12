import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SubjectEntity } from './entities/subject.entity';
import { plainToInstance } from 'class-transformer';
import {
  AuthTokenPayload,
  UserRole,
} from '../auth/interfaces/auth-token-payload.interface';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}

  private isAdmin(authUser: AuthTokenPayload): boolean {
    return authUser.role === UserRole.admin;
  }

  async create(
    createSubjectDto: CreateSubjectDto,
    authUser: AuthTokenPayload,
  ): Promise<SubjectEntity> {
    const existingSubject = await this.prisma.subject.findFirst({
      where: { userId: authUser.id, name: createSubjectDto.name },
    });
    if (existingSubject) {
      throw new ConflictException(
        `Subject with name "${createSubjectDto.name}" already exists`,
      );
    }

    const subject = await this.prisma.subject.create({
      data: { ...createSubjectDto, userId: authUser.id },
    });
    return plainToInstance(SubjectEntity, subject);
  }

  async findAll(authUser: AuthTokenPayload): Promise<SubjectEntity[]> {
    const subjects = await this.prisma.subject.findMany({
      where: this.isAdmin(authUser) ? undefined : { userId: authUser.id },
    });
    return plainToInstance(SubjectEntity, subjects);
  }

  async findOne(
    id: string,
    authUser: AuthTokenPayload,
  ): Promise<SubjectEntity> {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
    });
    if (!subject || (!this.isAdmin(authUser) && subject.userId !== authUser.id))
      throw new NotFoundException(`Subject with ID ${id} not found`);
    return plainToInstance(SubjectEntity, subject);
  }

  async update(
    id: string,
    updateSubjectDto: UpdateSubjectDto,
    authUser: AuthTokenPayload,
  ): Promise<SubjectEntity> {
    const currentSubject = await this.findOne(id, authUser);

    if (updateSubjectDto.name) {
      const existingSubject = await this.prisma.subject.findFirst({
        where: {
          userId: currentSubject.userId,
          name: updateSubjectDto.name,
          id: { not: id },
        },
      });
      if (existingSubject) {
        throw new ConflictException(
          `Subject with name "${updateSubjectDto.name}" already exists`,
        );
      }
    }

    const subject = await this.prisma.subject.update({
      where: { id },
      data: updateSubjectDto,
    });
    return plainToInstance(SubjectEntity, subject);
  }

  async remove(id: string, authUser: AuthTokenPayload): Promise<SubjectEntity> {
    await this.findOne(id, authUser);
    const subject = await this.prisma.subject.delete({
      where: { id },
    });
    return plainToInstance(SubjectEntity, subject);
  }
}
