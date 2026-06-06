import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { AnswerSpaceSize, QuestionType } from '../entities/question.entity';

export class CreateQuestionDto {
  @IsString({ message: 'Enunciado da questão deve ser um texto' })
  @IsNotEmpty({ message: 'Enunciado da questão é obrigatório' })
  text: string;

  @IsEnum(QuestionType, { message: 'Tipo da questão inválido' })
  type: QuestionType;

  @IsOptional()
  @IsString({ message: 'Resposta da questão deve ser um texto' })
  answerText?: string;

  @IsOptional()
  @IsEnum(AnswerSpaceSize, {
    message: 'Tamanho do espaço de resposta inválido',
  })
  answerSpaceSize?: AnswerSpaceSize;

  @IsUUID(undefined, { message: 'ID do tópico inválido' })
  @IsNotEmpty({ message: 'ID do tópico é obrigatório' })
  topicId: string;

  @IsOptional()
  @IsArray({ message: 'Lista de imagens da questão deve ser um array' })
  @ArrayUnique({
    message: 'Lista de imagens da questão não pode ter itens repetidos',
  })
  @IsUUID(undefined, {
    each: true,
    message: 'Cada imagem da questão deve ter um ID válido',
  })
  questionImageFileIds?: string[];
}
