import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateExamDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

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
  versionsCountDefault?: number;
}
