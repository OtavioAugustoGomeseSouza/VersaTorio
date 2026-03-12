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
import { DisciplinesService } from './disciplines.service';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';
import {
  type AuthenticatedRequest,
} from '../auth/interfaces/auth-token-payload.interface';

@Controller(['disciplines', 'subject'])
export class DisciplinesController {
  constructor(private readonly disciplinesService: DisciplinesService) {}

  @Post()
  create(
    @Body() createDisciplineDto: CreateDisciplineDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.disciplinesService.create(createDisciplineDto, authUser);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.disciplinesService.findAll(authUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.disciplinesService.findOne(id, authUser);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDisciplineDto: UpdateDisciplineDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.disciplinesService.update(id, updateDisciplineDto, authUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.disciplinesService.remove(id, authUser);
  }
}
