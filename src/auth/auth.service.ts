import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwt: JwtService
  ) {}

  async register(name: string, email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);

    if (existing) {
      throw new BadRequestException('Email уже зарегистрирован');
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.usersService.createUser(name, email, hashed);

    const token = await this.jwt.signAsync({ sub: user.id });

    // createUser уже не возвращает password (использует select)
    return { user, token };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Неверный email');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Неверный пароль');

    const token = await this.jwt.signAsync({ sub: user.id });

    // findById уже не возвращает password (использует select)
    const userWithoutPassword = await this.usersService.findById(user.id);

    return { user: userWithoutPassword, token };
  }

  async getProfile(userId: number) {
    return this.usersService.findById(userId);
  }
}
