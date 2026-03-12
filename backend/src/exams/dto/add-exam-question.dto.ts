import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class AddExamQuestionDto {
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  position?: number;
}
