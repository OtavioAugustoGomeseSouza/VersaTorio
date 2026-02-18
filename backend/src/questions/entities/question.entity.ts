
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
}