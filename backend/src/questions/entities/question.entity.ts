import type { AlternativeEntity } from '../../alternatives/entities/alternative.etity';
import type { TopicEntity } from '../../topics/entities/topic.entity';
import type { ExamQuestionEntity } from '../../exams/entities/exam-question.entity';

export class QuestionImageEntity {
  id: string;
  questionId: string;
  fileId: string;
  position: number;
  createdAt: Date;
}

export enum QuestionType {
  TRUE_FALSE = 'TRUE_FALSE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
}

export class QuestionEntity {
  id: string;
  text: string;
  type: QuestionType;
  createdAt: Date;
  updatedAt: Date;
  topicId: string;

  topic?: TopicEntity;
  examQuestions?: ExamQuestionEntity[];
  alternatives?: AlternativeEntity[];
  questionImages?: QuestionImageEntity[];
}
