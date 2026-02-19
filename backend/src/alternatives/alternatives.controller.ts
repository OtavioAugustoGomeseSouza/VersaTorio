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
import { AlternativesService } from './alternatives.service';
import { CreateAlternativeDto } from './dto/create-alternative.dto';
import { UpdateAlternativeDto } from './dto/update-alternative.dto';
import {
  AuthTokenPayload,
  type AuthenticatedRequest,
} from '../auth/interfaces/auth-token-payload.interface';

@Controller('alternatives')
export class AlternativesController {
  constructor(private readonly alternativesService: AlternativesService) {}

  @Post()
  create(
    @Body() createAlternativeDto: CreateAlternativeDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.alternativesService.create(createAlternativeDto, authUser);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.alternativesService.findAll(authUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.alternativesService.findOne(id, authUser);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAlternativeDto: UpdateAlternativeDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const authUser = request.user;
    return this.alternativesService.update(id, updateAlternativeDto, authUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const authUser = request.user;
    return this.alternativesService.remove(id, authUser);
  }
}
