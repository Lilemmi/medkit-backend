# Руководство по миграции с SQLite на PostgreSQL

## Почему PostgreSQL?

✅ **Лучше для продакшена:**
- ACID транзакции для целостности данных
- Отличная производительность для реляционных данных
- Масштабируемость
- Безопасность и изоляция данных по пользователям
- Поддержка сложных запросов

✅ **Подходит для вашего приложения:**
- Реляционная структура (пользователи → лекарства)
- История инвентаризации
- Разделение данных по пользователям
- Готовность к деплою в маркет

## Шаги миграции

### 1. Установка PostgreSQL

#### Windows:
```bash
# Скачайте и установите с официального сайта:
# https://www.postgresql.org/download/windows/
# Или используйте Chocolatey:
choco install postgresql
```

#### macOS:
```bash
brew install postgresql
brew services start postgresql
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Создание базы данных

```bash
# Войдите в PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE medkit_db;

# Создайте пользователя (опционально)
CREATE USER medkit_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE medkit_db TO medkit_user;

# Выйдите
\q
```

### 3. Настройка переменных окружения

Скопируйте `.env.example` в `.env` и обновите `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/medkit_db"
```

**Для продакшена (примеры):**

**Railway:**
```env
DATABASE_URL="postgresql://user:password@host.railway.app:5432/railway"
```

**Render:**
```env
DATABASE_URL="postgresql://user:password@host.render.com:5432/dbname"
```

**Supabase:**
```env
DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
```

**Heroku:**
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

### 4. Установка зависимостей

```bash
cd medkit-backend
npm install
```

### 5. Генерация Prisma клиента и миграция

```bash
# Сгенерируйте Prisma клиент для PostgreSQL
npx prisma generate

# Создайте и примените миграцию
npx prisma migrate dev --name init_postgresql

# Или если хотите применить без создания новой миграции:
npx prisma db push
```

### 6. Миграция данных из SQLite (если нужно)

Если у вас есть данные в SQLite, которые нужно перенести:

```bash
# 1. Экспортируйте данные из SQLite в JSON
# (можно использовать скрипт или Prisma Studio)

# 2. Импортируйте в PostgreSQL через Prisma
# Создайте скрипт миграции данных или используйте Prisma Studio
```

### 7. Проверка подключения

```bash
# Запустите приложение
npm run start:dev

# Или проверьте подключение через Prisma Studio
npx prisma studio
```

## Новые возможности

### История инвентаризации

Теперь все действия с лекарствами автоматически записываются в историю:

- ✅ Создание лекарства
- ✅ Обновление лекарства
- ✅ Удаление лекарства
- ✅ История конкретного лекарства

**API эндпоинты:**
- `GET /medicines/:userId/history` - вся история пользователя
- `GET /medicines/:userId/history/:medicineId` - история конкретного лекарства

### Индексы для производительности

Добавлены индексы для быстрого поиска:
- По email пользователя
- По userId для лекарств
- По дате истечения срока годности
- По действиям в истории

## Деплой в продакшен

### Варианты хостинга PostgreSQL:

1. **Railway** (рекомендуется) - простой и быстрый
   - https://railway.app
   - Бесплатный тариф доступен

2. **Render** - хороший бесплатный вариант
   - https://render.com
   - PostgreSQL в один клик

3. **Supabase** - PostgreSQL с дополнительными функциями
   - https://supabase.com
   - Отличный бесплатный тариф

4. **Heroku Postgres** - проверенный вариант
   - https://www.heroku.com/postgres

5. **AWS RDS / Google Cloud SQL** - для масштабирования

### Деплой бэкенда:

После настройки PostgreSQL, деплойте бэкенд на:
- Railway
- Render
- Heroku
- Vercel (serverless)
- AWS / Google Cloud

## Проверка после миграции

```bash
# 1. Проверьте подключение
npm run start:dev

# 2. Проверьте через Prisma Studio
npx prisma studio

# 3. Протестируйте API эндпоинты
# - Регистрация пользователя
# - Создание лекарства
# - Проверка истории
```

## Откат (если нужно)

Если нужно вернуться к SQLite:

1. Измените `provider` в `schema.prisma` обратно на `sqlite`
2. Обновите `DATABASE_URL` на путь к SQLite файлу
3. Выполните `npx prisma generate` и `npx prisma db push`

## Поддержка

Если возникли проблемы:
1. Проверьте подключение к PostgreSQL: `psql -U postgres -d medkit_db`
2. Проверьте переменные окружения
3. Убедитесь, что PostgreSQL запущен
4. Проверьте логи приложения

