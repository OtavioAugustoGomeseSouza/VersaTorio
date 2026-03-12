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
import {
  type AuthenticatedRequest,
} from '../auth/interfaces/auth-token-payload.interface';

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

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.examVersionsService.remove(id, authUser);
  }
}
