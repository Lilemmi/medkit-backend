import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createUser(name: string, email: string, password: string, gender?: string, allergies?: string, birthDate?: Date) {
    const user = await this.prisma.user.create({ 
      data: {
        name,
        email,
        password,
        gender: gender || null,
        allergies: allergies || null,
        birthDate: birthDate || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        allergies: true,
        photoUri: true,
        birthDate: true,
        gender: true,
        weight: true,
        height: true,
        chronicDiseases: true,
        medicalConditions: true,
        organConditions: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    return user;
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({ 
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        allergies: true,
        photoUri: true,
        birthDate: true,
        gender: true,
        weight: true,
        height: true,
        chronicDiseases: true,
        medicalConditions: true,
        organConditions: true,
        createdAt: true,
        updatedAt: true,
      }
    });
  }

  async updateUser(id: number, data: {
    name?: string;
    email?: string;
    phone?: string;
    allergies?: string;
    photoUri?: string;
    birthDate?: string | Date;
    gender?: string;
    weight?: number;
    height?: number;
    chronicDiseases?: string[];
    medicalConditions?: string[];
    organConditions?: string[];
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

    // Подготавливаем данные для обновления
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.allergies !== undefined) updateData.allergies = data.allergies;
    if (data.photoUri !== undefined) updateData.photoUri = data.photoUri;
    
    // Основная информация
    if (data.birthDate !== undefined) {
      updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    }
    if (data.gender !== undefined) updateData.gender = data.gender;
    
    // Медицинская информация
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.chronicDiseases !== undefined) {
      updateData.chronicDiseases = data.chronicDiseases;
    }
    if (data.medicalConditions !== undefined) {
      updateData.medicalConditions = data.medicalConditions;
    }
    if (data.organConditions !== undefined) {
      updateData.organConditions = data.organConditions;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        allergies: true,
        photoUri: true,
        birthDate: true,
        gender: true,
        weight: true,
        height: true,
        chronicDiseases: true,
        medicalConditions: true,
        organConditions: true,
        createdAt: true,
        updatedAt: true,
      }
    });
  }

  async changePassword(id: number, oldPassword: string, newPassword: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Password change is disabled because User has no password field in select
    throw new BadRequestException('Password change is disabled because User has no password field.');
  }
}
