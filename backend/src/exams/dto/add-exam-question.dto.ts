import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddExamQuestionDto {
  @IsUUID(undefined, { message: 'ID da questão inválido' })
  @IsNotEmpty({ message: 'ID da questão é obrigatório' })
  questionId: string;
}
