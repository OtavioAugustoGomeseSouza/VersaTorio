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
import { DisciplinesModule } from './disciplines/disciplines.module';
import { JwtAuthGuard } from './auth/jwt.guard';
import { ExamVersionsModule } from './exam-versions/exam-versions.module';
import { TopicsModule } from './topics/topics.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    AlternativesModule,
    QuestionsModule,
    ExamsModule,
    DisciplinesModule,
    TopicsModule,
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
