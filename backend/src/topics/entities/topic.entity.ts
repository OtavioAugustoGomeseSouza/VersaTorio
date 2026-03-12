import type { DisciplineEntity } from '../../disciplines/entities/discipline.entity';
import type { QuestionEntity } from '../../questions/entities/question.entity';

export class TopicEntity {
  id: string;
  name: string;
  disciplineId: string;
  createdAt: Date;
  updatedAt: Date;

  discipline?: DisciplineEntity;
  questions?: QuestionEntity[];
}
