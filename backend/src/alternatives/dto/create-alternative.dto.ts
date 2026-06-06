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
  @IsString({ message: 'Texto da alternativa deve ser um texto' })
  text?: string;

  @IsEnum(AlternativeType, { message: 'Tipo da alternativa inválido' })
  type: AlternativeType;

  @IsBoolean({
    message: 'Campo de alternativa correta deve ser verdadeiro ou falso',
  })
  isCorrect: boolean;

  @IsUUID(undefined, { message: 'ID da questão inválido' })
  @IsNotEmpty({ message: 'ID da questão é obrigatório' })
  questionId: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'ID do arquivo de imagem inválido' })
  imageFileId?: string;
}
