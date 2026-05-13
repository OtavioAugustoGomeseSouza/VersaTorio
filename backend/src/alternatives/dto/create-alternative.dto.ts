import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { AlternativeType } from '../entities/alternative.etity';


export class CreateAlternativeDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsEnum(AlternativeType)
  type: AlternativeType;

  @IsBoolean()
  isCorrect: boolean;

  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @IsOptional()
  @IsUUID()
  imageFileId?: string;
}
