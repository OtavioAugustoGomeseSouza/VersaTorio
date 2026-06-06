import {
  ArrayMinSize,
  ArrayUnique,
  IsBoolean,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  questionIds: string[];

  @IsBoolean()
  @IsOptional()
  shuffleQuestions?: boolean;

  @IsBoolean()
  @IsOptional()
  shuffleAlternatives?: boolean;

  @IsBoolean()
  @IsOptional()
  distributeCorrectAlternatives?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(26)
  @IsOptional()
  versionsCount?: number;
}
