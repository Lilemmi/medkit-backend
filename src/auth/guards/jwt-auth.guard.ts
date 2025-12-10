import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Проверяем, помечен ли маршрут как публичный
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Если маршрут публичный, пропускаем без проверки токена
    if (isPublic) {
      return true;
    }

    // Иначе применяем стандартную проверку JWT
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Если есть ошибка или пользователь не найден, выбрасываем UnauthorizedException
    if (err || !user) {
      throw err || new UnauthorizedException('Токен не предоставлен или невалиден');
    }
    return user;
  }
}
