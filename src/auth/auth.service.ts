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

  async register(name: string, email: string, password: string, gender: string, allergies: string, birthDate: string) {
    try {
      console.log('🔐 AuthService.register called with:', {
        name,
        email,
        password: password ? '***' : undefined,
        gender,
        allergies,
        birthDate,
      });

      const existing = await this.usersService.findByEmail(email);

      if (existing) {
        throw new BadRequestException('Email уже зарегистрирован');
      }

      const hashed = await bcrypt.hash(password, 10);
      
      // Преобразуем дату рождения в Date объект
      let birthDateObj: Date | null = null;
      if (birthDate) {
        try {
          birthDateObj = new Date(birthDate);
          // Проверяем, что дата валидна
          if (isNaN(birthDateObj.getTime())) {
            console.error('❌ Invalid birthDate:', birthDate);
            throw new BadRequestException('Неверный формат даты рождения');
          }
          console.log('✅ Parsed birthDate:', birthDateObj.toISOString());
        } catch (error) {
          console.error('❌ Error parsing birthDate:', error);
          throw new BadRequestException('Неверный формат даты рождения');
        }
      }
      
      console.log('📝 Creating user with data:', {
        name,
        email,
        gender,
        allergies,
        birthDate: birthDateObj?.toISOString() || null,
      });

      const user = await this.usersService.createUser(name, email, hashed, gender, allergies, birthDateObj);

      console.log('✅ User created:', { id: user.id, email: user.email });

      const token = await this.jwt.signAsync({ sub: user.id });

      console.log('✅ Token generated for user:', user.id);

      // createUser уже не возвращает password (использует select)
      return { user, token };
    } catch (error) {
      console.error('❌ AuthService.register error:', error);
      console.error('❌ Error stack:', error?.stack);
      // Если это уже BadRequestException, пробрасываем дальше
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Для других ошибок выбрасываем общую ошибку
      throw new BadRequestException(`Ошибка при регистрации: ${error?.message || 'Unknown error'}`);
    }
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
