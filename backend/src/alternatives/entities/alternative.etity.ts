import type { QuestionEntity } from '../../questions/entities/question.entity';

export enum AlternativeType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
}

export class AlternativeEntity {
  id: string;
  text: string;
  type: AlternativeType;
  isCorrect: boolean;
  questionId: string;
  imageFileId?: string | null;
  createdAt: Date;
  updatedAt: Date;

  question?: QuestionEntity;
}
