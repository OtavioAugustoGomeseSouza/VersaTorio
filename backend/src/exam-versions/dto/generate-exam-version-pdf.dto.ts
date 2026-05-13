import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PdfHeaderFieldDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsOptional()
  value?: string;
}

export class GenerateExamVersionPdfDto {
  @ValidateNested({ each: true })
  @Type(() => PdfHeaderFieldDto)
  @ArrayMinSize(1)
  headerFields: PdfHeaderFieldDto[];

  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  columns: 1 | 2 = 2;

  @IsBoolean()
  @IsOptional()
  includeVersionInFooter?: boolean;
}
