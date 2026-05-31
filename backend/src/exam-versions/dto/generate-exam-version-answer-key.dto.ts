import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

export class GenerateExamVersionAnswerKeyDto {
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  @IsOptional()
  columns: 1 | 2 = 2;
}
