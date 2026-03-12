import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../decorators/public.decorator';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() body: CreateUserDto) {
    return this.auth.register(body);
  }

  @Public()
  @Post('login')
  login(@Body() body: LoginUserDto) {
    return this.auth.login(body);
  }

  @Get('me')
  me(@Req() req: any) {
    return req.user;
  }
}
