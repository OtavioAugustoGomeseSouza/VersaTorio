import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PdfHeaderFieldDto {
  @IsString({ message: 'Rótulo do campo do cabeçalho deve ser um texto' })
  @IsNotEmpty({ message: 'Rótulo do campo do cabeçalho é obrigatório' })
  label: string;

  @IsString({ message: 'Valor do campo do cabeçalho deve ser um texto' })
  @IsOptional()
  value?: string;
}

export class GenerateExamVersionPdfDto {
  @ValidateNested({
    each: true,
    message: 'Cada campo do cabeçalho deve ter dados válidos',
  })
  @Type(() => PdfHeaderFieldDto)
  @IsArray({ message: 'Campos do cabeçalho devem estar em uma lista' })
  @ArrayMinSize(1, {
    message: 'Adicione pelo menos um campo no cabeçalho',
  })
  headerFields: PdfHeaderFieldDto[];

  @Type(() => Number)
  @IsInt({ message: 'Quantidade de colunas deve ser um número inteiro' })
  @IsIn([1, 2], { message: 'Quantidade de colunas deve ser 1 ou 2' })
  columns: 1 | 2 = 2;

  @IsBoolean({
    message: 'Incluir versão no rodapé deve ser verdadeiro ou falso',
  })
  @IsOptional()
  includeVersionInFooter?: boolean;
}
