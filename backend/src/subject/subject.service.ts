import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SubjectEntity } from './entities/subject.entity';
import { plainToInstance } from 'class-transformer';
import { AuthTokenPayload } from '../auth/interfaces/auth-token-payload.interface';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}

  async create(
    createSubjectDto: CreateSubjectDto,
    authUser: AuthTokenPayload,
  ): Promise<SubjectEntity> {
    const subject = await this.prisma.subject.create({
      data: { ...createSubjectDto, userId: authUser.id },
    });
    return plainToInstance(SubjectEntity, subject);
  }

  async findAll(authUser: AuthTokenPayload): Promise<SubjectEntity[]> {
    const subjects = await this.prisma.subject.findMany({
      where: { userId: authUser.id },
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
    if (!subject || subject.userId !== authUser.id)
      throw new NotFoundException(`Subject with ID ${id} not found`);
    return plainToInstance(SubjectEntity, subject);
  }

  async update(
    id: string,
    updateSubjectDto: UpdateSubjectDto,
    authUser: AuthTokenPayload,
  ): Promise<SubjectEntity> {
    await this.findOne(id, authUser);
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
