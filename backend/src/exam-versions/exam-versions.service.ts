import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateExamVersionDto } from './dto/create-exam-version.dto';
import { UpdateExamVersionDto } from './dto/update-exam-version.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamVersionsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(examId: string, name: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: {
            alternatives: true,
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const shuffledQuestions = this.shuffle([...exam.questions]);

    const orderData = {
      questions: shuffledQuestions.map((q) => ({
        id: q.id,
        alternatives: this.shuffle([...q.alternatives]).map((a) => a.id),
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

  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  findAll() {
    return this.prisma.examVersion.findMany();
  }

  findOne(id: string) {
    return this.prisma.examVersion.findUnique({
      where: { id },
    });
  }

  async remove(id: string) {
    return this.prisma.examVersion.delete({
      where: { id },
    });
  }
}
