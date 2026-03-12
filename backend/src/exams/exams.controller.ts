import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddExamQuestionDto } from './dto/add-exam-question.dto';
import {
  type AuthenticatedRequest,
} from '../auth/interfaces/auth-token-payload.interface';

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  create(
    @Body() createExamDto: CreateExamDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.examsService.create(createExamDto, authUser);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.examsService.findAll(authUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.examsService.findOne(id, authUser);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateExamDto: UpdateExamDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.examsService.update(id, updateExamDto, authUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.examsService.remove(id, authUser);
  }

  @Post(':id/questions')
  addQuestion(
    @Param('id') id: string,
    @Body() addExamQuestionDto: AddExamQuestionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.examsService.addQuestion(id, addExamQuestionDto, authUser);
  }

  @Delete(':id/questions/:questionId')
  removeQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.examsService.removeQuestion(id, questionId, authUser);
  }
}
