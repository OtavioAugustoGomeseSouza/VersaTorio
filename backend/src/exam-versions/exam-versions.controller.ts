import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { ExamVersionsService } from './exam-versions.service';
import { CreateExamVersionDto } from './dto/create-exam-version.dto';
import { GenerateExamVersionPdfDto } from './dto/generate-exam-version-pdf.dto';
import { type AuthenticatedRequest } from '../auth/interfaces/auth-token-payload.interface';

@Controller('exam-versions')
export class ExamVersionsController {
  constructor(private readonly examVersionsService: ExamVersionsService) {}

  @Post('generate')
  generate(
    @Body() createExamVersionDto: CreateExamVersionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.examVersionsService.generate(
      createExamVersionDto.examId,
      createExamVersionDto.name,
      createExamVersionDto.shuffleQuestions,
      createExamVersionDto.shuffleAlternatives,
      authUser,
    );
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.examVersionsService.findAll(authUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.examVersionsService.findOne(id, authUser);
  }

  @Post(':id/generate-pdf')
  generatePdf(
    @Param('id') id: string,
    @Body() generateExamVersionPdfDto: GenerateExamVersionPdfDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.examVersionsService.generatePdf(
      id,
      generateExamVersionPdfDto,
      authUser,
    );
  }

  @Post(':id/generate-answer-key')
  generateAnswerKey(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.examVersionsService.generateAnswerKey(id, authUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.examVersionsService.remove(id, authUser);
  }
}
