import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersService } from './users/users.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AlternativesModule } from './alternatives/alternatives.module';
import { QuestionsModule } from './questions/questions.module';
import { ExamsModule } from './exams/exams.module';
import { SubjectModule } from './subject/subject.module';
import { JwtAuthGuard } from './auth/jwt.guard';
import { ExamVersionsModule } from './exam-versions/exam-versions.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    AlternativesModule,
    QuestionsModule,
    ExamsModule,
    SubjectModule,
    ExamVersionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
