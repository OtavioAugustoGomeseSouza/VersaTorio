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
  @IsString({ message: 'Nome da prova deve ser um texto' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'Descrição da prova deve ser um texto' })
  @IsOptional()
  description?: string;

  @IsBoolean({ message: 'Embaralhar questões deve ser verdadeiro ou falso' })
  @IsOptional()
  shuffleQuestions?: boolean;

  @IsBoolean({
    message: 'Embaralhar alternativas deve ser verdadeiro ou falso',
  })
  @IsOptional()
  shuffleAlternatives?: boolean;

  @IsBoolean({
    message: 'Distribuir alternativas corretas deve ser verdadeiro ou falso',
  })
  @IsOptional()
  distributeCorrectAlternatives?: boolean;

  @Type(() => Number)
  @IsInt({ message: 'Quantidade padrão de versões deve ser um número inteiro' })
  @Min(1, { message: 'Quantidade padrão de versões deve ser no mínimo 1' })
  @Max(26, { message: 'Quantidade padrão de versões deve ser no máximo 26' })
  @IsOptional()
  versionsCountDefault?: number;
}
