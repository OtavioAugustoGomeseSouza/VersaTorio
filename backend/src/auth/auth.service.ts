import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) {}

  async register(dto: { email: string; name?: string; password: string }) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email já cadastrado');

    const hash = await bcrypt.hash(dto.password, 12);

    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      password: hash,
    });

    return this.signToken(user.id, user.email);
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    return this.signToken(user.id, user.email);
  }

  private signToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return { access_token: this.jwt.sign(payload) };
  }
}
