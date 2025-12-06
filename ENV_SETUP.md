# Настройка переменных окружения

Создайте файл `.env` в корне `medkit-backend/` со следующим содержимым:

```env
# Database - PostgreSQL
# Формат: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
# Пример для локальной разработки:
DATABASE_URL="postgresql://postgres:password@localhost:5432/medkit_db"

# JWT Secret (измените на свой секретный ключ!)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Port (опционально, по умолчанию 3000)
PORT=3000
```

## Для продакшена

### Railway
```env
DATABASE_URL="postgresql://user:password@host.railway.app:5432/railway"
```

### Render
```env
DATABASE_URL="postgresql://user:password@host.render.com:5432/dbname"
```

### Supabase
```env
DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
```

### Heroku
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

## Важно!

⚠️ **Никогда не коммитьте `.env` файл в Git!** Он уже должен быть в `.gitignore`.

