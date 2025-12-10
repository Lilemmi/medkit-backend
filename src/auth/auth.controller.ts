import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from './decorators/user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public() // Публичный маршрут - не требует аутентификации
  @Post('register')
  register(@Body() dto: RegisterDto) {
    // Логируем, что пришло на бэкенд
    console.log('📥 REGISTER REQUEST received:', {
      name: dto.name,
      email: dto.email,
      password: dto.password ? '***' : undefined,
      dtoType: typeof dto,
      dtoKeys: Object.keys(dto),
    });
    
    // Проверяем, что данные не undefined
    if (!dto.email || dto.email === undefined) {
      console.error('❌ REGISTER: email is undefined!', { dto });
      throw new BadRequestException('Email is required');
    }
    if (!dto.name || dto.name === undefined) {
      console.error('❌ REGISTER: name is undefined!', { dto });
      throw new BadRequestException('Name is required');
    }
    if (!dto.password || dto.password === undefined) {
      console.error('❌ REGISTER: password is undefined!', { dto });
      throw new BadRequestException('Password is required');
    }
    
    return this.auth.register(dto.name, dto.email, dto.password);
  }

  @Public() // Публичный маршрут - не требует аутентификации
  @Post('login')
  login(@Body() dto: LoginDto) {
    // Логируем, что пришло на бэкенд
    console.log('📥 LOGIN REQUEST received:', {
      email: dto.email,
      password: dto.password ? '***' : undefined,
      dtoType: typeof dto,
      dtoKeys: Object.keys(dto),
    });
    
    // Проверяем, что данные не undefined
    if (!dto.email || dto.email === undefined) {
      console.error('❌ LOGIN: email is undefined!', { dto });
      throw new BadRequestException('Email is required');
    }
    if (!dto.password || dto.password === undefined) {
      console.error('❌ LOGIN: password is undefined!', { dto });
      throw new BadRequestException('Password is required');
    }
    
    return this.auth.login(dto.email, dto.password);
  }

  // @UseGuards(JwtAuthGuard) - не нужен, так как guard применяется глобально
  @Get('me')
  me(@User() user: any) {
    return this.auth.getProfile(user.id);
  }
}
