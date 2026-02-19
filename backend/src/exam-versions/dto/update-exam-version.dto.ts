import { PartialType } from '@nestjs/mapped-types';
import { CreateExamVersionDto } from './create-exam-version.dto';

export class UpdateExamVersionDto extends PartialType(CreateExamVersionDto) {}
