# Medkit Backend

NestJS backend для приложения Smart Family Medkit.

## 🚀 Технологии

- **Framework**: NestJS
- **Database**: PostgreSQL (Railway)
- **ORM**: Prisma
- **Authentication**: JWT
- **Hosting**: Railway

## 📁 Структура

```
medkit-backend/
├── src/
│   ├── auth/          # Авторизация и аутентификация
│   ├── users/          # Управление пользователями
│   ├── medicines/      # Управление лекарствами
│   └── main.ts         # Точка входа
├── prisma/
│   ├── schema.prisma   # Схема базы данных
│   └── migrations/     # Миграции
└── dist/               # Скомпилированный код
```

## 🔧 Настройка

### Переменные окружения

Создайте `.env` файл:

```env
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="your-secret-key"
PORT=3000
```

### Миграции

```bash
npx prisma migrate deploy
```

### Запуск

```bash
# Разработка
npm run start:dev

# Продакшен
npm run start:prod
```

## 🌐 API Endpoints

### Авторизация
- `POST /auth/register` - Регистрация
- `POST /auth/login` - Вход
- `GET /auth/me` - Профиль (требует токен)

### Пользователи
- `GET /users/profile` - Получить профиль
- `PUT /users/:id` - Обновить профиль

### Лекарства
- `GET /medicines/:userId` - Список лекарств
- `POST /medicines/:userId` - Добавить лекарство
- `PUT /medicines/:userId/:id` - Обновить лекарство
- `DELETE /medicines/:userId/:id` - Удалить лекарство
- `GET /medicines/:userId/history` - История изменений

## 🚂 Railway Deployment

Backend автоматически деплоится на Railway при push в GitHub.

## 📝 Лицензия

Private project
