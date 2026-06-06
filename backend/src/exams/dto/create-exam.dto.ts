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
  @IsString({ message: 'Nome da prova deve ser um texto' })
  @IsNotEmpty({ message: 'Nome da prova é obrigatório' })
  name: string;

  @IsString({ message: 'Descrição da prova deve ser um texto' })
  @IsOptional()
  description?: string;

  @IsArray({ message: 'Lista de questões deve ser um array' })
  @ArrayMinSize(1, { message: 'Selecione pelo menos 1 questão para a prova' })
  @ArrayUnique({ message: 'Lista de questões não pode ter itens repetidos' })
  @IsUUID('4', { each: true, message: 'Cada questão deve ter um ID válido' })
  questionIds: string[];

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
  @IsInt({ message: 'Quantidade de versões deve ser um número inteiro' })
  @Min(1, { message: 'Quantidade de versões deve ser no mínimo 1' })
  @Max(26, { message: 'Quantidade de versões deve ser no máximo 26' })
  @IsOptional()
  versionsCount?: number;
}
