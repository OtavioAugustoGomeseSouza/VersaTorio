import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTopicDto {
  @IsString({ message: 'Nome do tópico deve ser um texto' })
  @IsNotEmpty({ message: 'Nome do tópico é obrigatório' })
  name: string;
}
