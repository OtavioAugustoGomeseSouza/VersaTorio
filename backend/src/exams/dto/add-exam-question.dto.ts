import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddExamQuestionDto {
  @IsUUID()
  @IsNotEmpty()
  questionId: string;
}
