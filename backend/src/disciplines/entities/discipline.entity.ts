import type { ExamEntity } from '../../exams/entities/exam.entity';
import type { UserEntity } from '../../users/entities/user.entity';
import type { TopicEntity } from '../../topics/entities/topic.entity';

export class DisciplineEntity {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;

  exams?: ExamEntity[];
  topics?: TopicEntity[];
  user?: UserEntity;
}
