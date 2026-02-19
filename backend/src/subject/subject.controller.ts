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
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import {
  AuthTokenPayload,
  type AuthenticatedRequest,
} from '../auth/interfaces/auth-token-payload.interface';

@Controller('subject')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  create(
    @Body() createSubjectDto: CreateSubjectDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.subjectService.create(createSubjectDto, authUser);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.subjectService.findAll(authUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.subjectService.findOne(id, authUser);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.subjectService.update(id, updateSubjectDto, authUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.subjectService.remove(id, authUser);
  }
}
