import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createUser(name: string, email: string, password: string) {
    return this.prisma.user.create({ data: { name, email, password } });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updateUser(id: number, data: {
    name?: string;
    email?: string;
    phone?: string;
    allergies?: string;
    photoUri?: string;
  }) {
    // Проверяем, существует ли пользователь
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Если обновляется email, проверяем, что он не занят другим пользователем
    if (data.email && data.email !== user.email) {
      const existingUser = await this.findByEmail(data.email);
      if (existingUser) {
        throw new BadRequestException('Email already registered');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async changePassword(id: number, oldPassword: string, newPassword: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Проверяем старый пароль
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) {
      throw new BadRequestException('Invalid old password');
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }
}
