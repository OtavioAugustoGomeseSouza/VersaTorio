import type { ExamEntity } from './exam.entity';
import type { QuestionEntity } from '../../questions/entities/question.entity';

export class ExamQuestionEntity {
  id: string;
  examId: string;
  questionId: string;
  createdAt: Date;

  exam?: ExamEntity;
  question?: QuestionEntity;
}
