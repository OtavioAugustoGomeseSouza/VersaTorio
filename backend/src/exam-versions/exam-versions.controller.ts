import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ExamVersionsService } from './exam-versions.service';
import { CreateExamVersionDto } from './dto/create-exam-version.dto';
import { UpdateExamVersionDto } from './dto/update-exam-version.dto';

@Controller('exam-versions')
export class ExamVersionsController {
  constructor(private readonly examVersionsService: ExamVersionsService) {}

  @Post('generate')
  generate(@Body() createExamVersionDto: CreateExamVersionDto) {
    return this.examVersionsService.generate(
      createExamVersionDto.examId,
      createExamVersionDto.name,
    );
  }

  @Get()
  findAll() {
    return this.examVersionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examVersionsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.examVersionsService.remove(id);
  }
}
