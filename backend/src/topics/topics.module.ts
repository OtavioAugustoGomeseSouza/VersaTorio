import { Module } from '@nestjs/common';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [QuestionsModule],
  controllers: [TopicsController],
  providers: [TopicsService],
})
export class TopicsModule {}
