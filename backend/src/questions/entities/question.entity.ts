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
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  DISSERTATIVE = 'DISSERTATIVE',
}

export enum AnswerSpaceSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

export class QuestionEntity {
  id: string;
  text: string;
  type: QuestionType;
  answerText?: string | null;
  answerSpaceSize?: AnswerSpaceSize | null;
  createdAt: Date;
  updatedAt: Date;
  topicId: string;

  topic?: TopicEntity;
  examQuestions?: ExamQuestionEntity[];
  alternatives?: AlternativeEntity[];
  questionImages?: QuestionImageEntity[];
}
