import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDisciplineDto {
  @IsString({ message: 'Nome da disciplina deve ser um texto' })
  @IsNotEmpty({ message: 'Nome da disciplina é obrigatório' })
  name: string;
}
