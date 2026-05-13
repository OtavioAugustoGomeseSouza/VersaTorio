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
  @IsUUID()
  @IsNotEmpty()
  topicId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class DrawQuestionsDto {
  @IsUUID()
  @IsNotEmpty()
  disciplineId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TopicDrawRuleDto)
  topicRules: TopicDrawRuleDto[];
}
