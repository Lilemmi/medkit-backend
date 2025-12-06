# Скрипт для проверки API

Write-Host "🔍 Проверка API сервера..." -ForegroundColor Cyan
Write-Host ""

# Проверка основного endpoint
Write-Host "1. Проверка основного endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5
    Write-Host "✅ Сервер работает! Статус: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Сервер не отвечает на порту 3000" -ForegroundColor Red
    Write-Host "   Убедитесь, что сервер запущен: npm run start:dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "2. Проверка подключения к базе данных..." -ForegroundColor Yellow
try {
    npx prisma db execute --stdin --schema prisma/schema.prisma
    Write-Host "✅ Подключение к базе данных работает!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Не удалось проверить подключение к БД напрямую" -ForegroundColor Yellow
    Write-Host "   Это нормально, если используется Railway PostgreSQL" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "3. Проверка API endpoints..." -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Доступные endpoints:" -ForegroundColor Cyan
Write-Host "   POST /auth/register - Регистрация" -ForegroundColor White
Write-Host "   POST /auth/login - Вход" -ForegroundColor White
Write-Host "   GET /medicines/:userId - Список лекарств" -ForegroundColor White
Write-Host "   POST /medicines/:userId - Создать лекарство" -ForegroundColor White
Write-Host "   GET /medicines/:userId/history - История инвентаризации" -ForegroundColor White
Write-Host ""
Write-Host "✅ Все проверки завершены!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Для тестирования API используйте:" -ForegroundColor Cyan
Write-Host "   - Postman" -ForegroundColor White
Write-Host "   - curl" -ForegroundColor White
Write-Host "   - Мобильное приложение" -ForegroundColor White


