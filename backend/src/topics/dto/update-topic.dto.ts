import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateTopicDto {
  @IsString({ message: 'Nome do tópico deve ser um texto' })
  @IsNotEmpty({ message: 'Nome do tópico é obrigatório' })
  @IsOptional()
  name?: string;

  @IsUUID(undefined, { message: 'ID da disciplina inválido' })
  @IsNotEmpty({ message: 'ID da disciplina é obrigatório' })
  @IsOptional()
  disciplineId?: string;
}
