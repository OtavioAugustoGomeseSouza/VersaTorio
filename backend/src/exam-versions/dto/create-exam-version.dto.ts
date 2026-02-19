import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateExamVersionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  examId: string;

  @IsOptional()
  orderData?: any;
}
