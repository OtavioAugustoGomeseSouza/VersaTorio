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
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsOptional()
  @IsString()
  answerText?: string;

  @IsOptional()
  @IsEnum(AnswerSpaceSize)
  answerSpaceSize?: AnswerSpaceSize;

  @IsUUID()
  @IsNotEmpty()
  topicId: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  questionImageFileIds?: string[];
}
