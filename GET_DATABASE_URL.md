# 🔗 Как получить DATABASE_URL из Railway

## 📝 Из вашей команды psql:

```
PGPASSWORD=atSNeqIROELQAtAAXFYiUmRBiyxtoWya 
psql -h shuttle.proxy.rlwy.net -U postgres -p 34466 -d railway
```

## ✅ Правильный DATABASE_URL:

Из вашей команды можно составить connection string:

```
postgresql://postgres:atSNeqIROELQAtAAXFYiUmRBiyxtoWya@shuttle.proxy.rlwy.net:34466/railway
```

**Формат:** `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`

## 📝 Шаг 1: Обновите .env файл

Откройте `medkit-backend/.env` и обновите:

```env
DATABASE_URL="postgresql://postgres:atSNeqIROELQAtAAXFYiUmRBiyxtoWya@shuttle.proxy.rlwy.net:34466/railway"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=3000
```

## 📝 Шаг 2: Проверьте подключение

```bash
cd medkit-backend
npx prisma db pull
```

Или:
```bash
npx prisma studio
```

## 📝 Альтернативный способ: Получить из Railway Dashboard

1. Зайдите на https://railway.app
2. Откройте проект
3. Нажмите на PostgreSQL сервис
4. Перейдите в **"Variables"** (Переменные)
5. Найдите **`DATABASE_URL`** или **`POSTGRES_URL`**
6. Скопируйте значение

## ⚠️ Важно:

- **Никогда не коммитьте .env файл в Git!**
- Пароль должен быть секретным
- Используйте этот URL только в бэкенде, не в мобильном приложении

## ✅ После обновления:

1. Перезапустите бэкенд:
   ```bash
   cd medkit-backend
   npm run start:dev
   ```

2. Проверьте, что подключение работает:
   ```bash
   npx prisma studio
   ```

