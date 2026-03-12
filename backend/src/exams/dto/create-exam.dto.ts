import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  @Transform(({ value, obj }) => value ?? obj.subjectId)
  disciplineId: string;

  @IsUUID()
  @IsOptional()
  subjectId?: string;
}
