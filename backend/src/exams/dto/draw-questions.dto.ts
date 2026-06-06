import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class TopicDrawRuleDto {
  @IsUUID(undefined, { message: 'ID do tópico inválido' })
  @IsNotEmpty({ message: 'ID do tópico é obrigatório' })
  topicId: string;

  @Type(() => Number)
  @IsInt({ message: 'Quantidade de questões deve ser um número inteiro' })
  @Min(1, { message: 'Quantidade de questões deve ser no mínimo 1' })
  quantity: number;
}

export class DrawQuestionsDto {
  @IsUUID(undefined, { message: 'ID da disciplina inválido' })
  @IsNotEmpty({ message: 'ID da disciplina é obrigatório' })
  disciplineId: string;

  @IsArray({ message: 'Regras de sorteio devem estar em uma lista' })
  @ArrayMinSize(1, { message: 'Adicione pelo menos uma regra de sorteio' })
  @ValidateNested({
    each: true,
    message: 'Cada regra de sorteio deve ter tópico e quantidade válidos',
  })
  @Type(() => TopicDrawRuleDto)
  topicRules: TopicDrawRuleDto[];
}
