import type { DisciplineEntity } from '../../disciplines/entities/discipline.entity';
import type { UserEntity } from '../../users/entities/user.entity';
import type { ExamVersionEntity } from '../../exam-versions/entities/exam-version.entity';
import type { ExamQuestionEntity } from './exam-question.entity';

export class ExamEntity {
  id: string;
  name: string;
  description?: string;
  shuffleQuestions: boolean;
  shuffleAlternatives: boolean;
  versionsCountDefault: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  disciplineId: string;

  user?: UserEntity;
  examQuestions?: ExamQuestionEntity[];
  discipline?: DisciplineEntity;
  versions?: ExamVersionEntity[];
}
