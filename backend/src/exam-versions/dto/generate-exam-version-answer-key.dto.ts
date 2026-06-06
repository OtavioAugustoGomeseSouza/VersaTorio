import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

export class GenerateExamVersionAnswerKeyDto {
  @Type(() => Number)
  @IsInt({ message: 'Quantidade de colunas deve ser um número inteiro' })
  @IsIn([1, 2], { message: 'Quantidade de colunas deve ser 1 ou 2' })
  @IsOptional()
  columns: 1 | 2 = 2;
}
