import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  private users: User[] = []; // временная база пользователей

  constructor(private jwt: JwtService) {}

  async register(name: string, email: string, password: string) {
    const existing = this.users.find((u) => u.email === email);
    if (existing) {
      throw new Error('Email уже используется');
    }

    const hashed = await bcrypt.hash(password, 10);

    const user: User = {
      id: Date.now(),
      name,
      email,
      password: hashed,
    };

    this.users.push(user);

    const token = await this.jwt.signAsync({ id: user.id });

    return { user, token };
  }

  async login(email: string, password: string) {
    const user = this.users.find((u) => u.email === email);
    if (!user) throw new Error('Пользователь не найден');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new Error('Неверный пароль');

    const token = await this.jwt.signAsync({ id: user.id });

    return { user, token };
  }
}
