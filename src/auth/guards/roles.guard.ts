import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Guard для проверки прав доступа
 * Пользователь может работать только со своими данными
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Проверяем, что userId из токена совпадает с userId в параметрах запроса (если есть)
    const userIdParam = request.params?.userId;
    if (userIdParam && Number(userIdParam) !== user.id) {
      throw new ForbiddenException('Access denied: You can only access your own data');
    }

    return true;
  }
}

