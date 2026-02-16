import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
  
  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }

  async create(data: { email: string; name?: string; password: string }) {
    return this.prisma.user.create({
      data,
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }
}
