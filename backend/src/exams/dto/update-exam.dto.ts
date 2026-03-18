import { IsOptional, IsString } from 'class-validator';

export class UpdateExamDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
