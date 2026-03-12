import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateTopicDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsNotEmpty()
  @IsOptional()
  disciplineId?: string;
}
