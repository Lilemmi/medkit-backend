import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const reflector = app.get(Reflector);

  app.enableCors({
    origin: '*',
    methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
    credentials: true,
  });

  // Включаем валидацию для DTO
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // 🔒 Глобальная защита всех маршрутов JWT (кроме помеченных @Public())
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // 🟢 Порт из переменной окружения (для Railway) или 3000 по умолчанию
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`🔒 JWT Auth Guard enabled globally (use @Public() for public routes)`);
}
bootstrap();
