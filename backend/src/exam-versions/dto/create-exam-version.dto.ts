import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateExamVersionDto {
  @IsString({ message: 'Nome da versão deve ser um texto' })
  @IsNotEmpty({ message: 'Nome da versão é obrigatório' })
  name: string;

  @IsUUID(undefined, { message: 'ID da prova inválido' })
  @IsNotEmpty({ message: 'ID da prova é obrigatório' })
  examId: string;

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
}
