import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersService } from './users/users.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AlternativesModule } from './alternatives/alternatives.module';
import { QuestionsModule } from './questions/questions.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, AlternativesModule, QuestionsModule],
  controllers: [AppController],
  providers: [AppService, UsersService],
})
export class AppModule {}
