import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateExamVersionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  examId: string;
}
