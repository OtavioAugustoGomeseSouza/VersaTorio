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
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import {
  AuthTokenPayload,
  type AuthenticatedRequest,
} from '../auth/interfaces/auth-token-payload.interface';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  create(
    @Body() createQuestionDto: CreateQuestionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.questionsService.create(createQuestionDto, authUser);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.questionsService.findAll(authUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.questionsService.findOne(id, authUser);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.questionsService.update(id, updateQuestionDto, authUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.questionsService.remove(id, authUser);
  }
}
