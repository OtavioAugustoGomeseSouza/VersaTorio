import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  type AuthenticatedRequest,
} from '../auth/interfaces/auth-token-payload.interface';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { TopicsService } from './topics.service';

@Controller()
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get('disciplines/:disciplineId/topics')
  findAllByDiscipline(
    @Param('disciplineId') disciplineId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.topicsService.findAllByDiscipline(disciplineId, authUser);
  }

  @Post('disciplines/:disciplineId/topics')
  create(
    @Param('disciplineId') disciplineId: string,
    @Body() createTopicDto: CreateTopicDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.topicsService.create(disciplineId, createTopicDto, authUser);
  }

  @Get('topics/:id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.topicsService.findOne(id, authUser);
  }

  @Patch('topics/:id')
  update(
    @Param('id') id: string,
    @Body() updateTopicDto: UpdateTopicDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.topicsService.update(id, updateTopicDto, authUser);
  }

  @Delete('topics/:id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.topicsService.remove(id, authUser);
  }
}
