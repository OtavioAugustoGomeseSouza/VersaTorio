import { ExamEntity } from '../../exams/entities/exam.entity';
import { UserEntity } from '../../users/entities/user.entity';

export class SubjectEntity {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;

  exams?: ExamEntity[];
  user?: UserEntity;
}
