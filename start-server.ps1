# Скрипт для запуска бэкенд сервера

Write-Host "🚀 Запуск бэкенд сервера..." -ForegroundColor Cyan
Write-Host ""

# Проверяем, что мы в правильной директории
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Ошибка: package.json не найден" -ForegroundColor Red
    Write-Host "   Убедитесь, что вы в директории medkit-backend" -ForegroundColor Yellow
    exit 1
}

# Проверяем .env файл
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Файл .env не найден!" -ForegroundColor Yellow
    Write-Host "   Создайте .env файл с DATABASE_URL" -ForegroundColor Yellow
    Write-Host ""
}

# Проверяем, не запущен ли уже сервер
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 1 -ErrorAction Stop
    Write-Host "⚠️  Сервер уже запущен на порту 3000!" -ForegroundColor Yellow
    Write-Host "   Остановите его перед запуском нового" -ForegroundColor Yellow
    exit 0
} catch {
    # Сервер не запущен - это нормально
}

Write-Host "📦 Установка зависимостей (если нужно)..." -ForegroundColor Cyan
npm install --silent

Write-Host ""
Write-Host "🔄 Запуск сервера в режиме разработки..." -ForegroundColor Cyan
Write-Host "   Сервер будет доступен на: http://localhost:3000" -ForegroundColor Green
Write-Host "   Для мобильного устройства: http://192.168.31.227:3000" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Не закрывайте это окно! Сервер должен работать постоянно." -ForegroundColor Yellow
Write-Host ""

# Запускаем сервер
npm run start:dev

