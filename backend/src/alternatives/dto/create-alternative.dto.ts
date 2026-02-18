import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
} from 'class-validator';
import { AlternativeType } from '../entities/alternative.etity';


export class CreateAlternativeDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsEnum(AlternativeType)
  type: AlternativeType;

  @IsBoolean()
  isCorrect: boolean;

  @IsUUID()
  @IsNotEmpty()
  questionId: string;
}
