import { QuestionEntity } from '../../questions/entities/question.entity';
import { SubjectEntity } from '../../subject/entities/subject.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ExamVersionEntity } from '../../exam-versions/entities/exam-version.entity';

export class ExamEntity {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  subjectId: string;

  user?: UserEntity;
  questions?: QuestionEntity[];
  subject?: SubjectEntity;
  versions?: ExamVersionEntity[];
}
