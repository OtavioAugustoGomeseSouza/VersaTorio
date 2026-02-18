import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateExamDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description: string;

    @IsUUID()
    @IsNotEmpty()
    userId: string;

    @IsUUID()
    @IsOptional()
    subjectId: string;
}
