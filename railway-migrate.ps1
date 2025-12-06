# Скрипт для миграции базы данных в Railway
# Убедитесь, что DATABASE_URL в .env файле указывает на Railway PostgreSQL

Write-Host "Проверка подключения к базе данных..." -ForegroundColor Cyan
npx prisma validate

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nГенерация Prisma клиента..." -ForegroundColor Cyan
    npx prisma generate
    
    Write-Host "`nПрименение миграций..." -ForegroundColor Cyan
    npx prisma migrate dev --name init_postgresql
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Миграция успешно завершена!" -ForegroundColor Green
        Write-Host "`nДля просмотра данных используйте: npx prisma studio" -ForegroundColor Yellow
    } else {
        Write-Host "`n❌ Ошибка при миграции. Проверьте DATABASE_URL в .env файле." -ForegroundColor Red
    }
} else {
    Write-Host "`n❌ Ошибка валидации схемы. Проверьте .env файл." -ForegroundColor Red
}


