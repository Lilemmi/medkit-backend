# Скрипт для решения проблемы заблокированных файлов в node_modules

Write-Host "=== Решение проблемы EBUSY с node_modules ===" -ForegroundColor Cyan
Write-Host ""

# Шаг 1: Закрыть процессы Node.js
Write-Host "1. Закрываю процессы Node.js..." -ForegroundColor Yellow
$nodeProcesses = Get-Process | Where-Object { $_.ProcessName -like "*node*" -or $_.ProcessName -like "*expo*" }
if ($nodeProcesses) {
    Write-Host "Найдено процессов: $($nodeProcesses.Count)" -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object {
        Write-Host "  Закрываю: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "  Процессы Node.js не найдены" -ForegroundColor Green
}

# Шаг 2: Удалить node_modules
Write-Host ""
Write-Host "2. Удаляю node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    try {
        Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction Stop
        Write-Host "  ✅ node_modules удален" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Не удалось удалить: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "  ⚠️  Нужно закрыть процессы вручную:" -ForegroundColor Yellow
        Write-Host "     - VS Code" -ForegroundColor White
        Write-Host "     - Metro bundler" -ForegroundColor White
        Write-Host "     - Другие процессы, использующие node_modules" -ForegroundColor White
        Write-Host ""
        Write-Host "  Затем перезапустите этот скрипт или выполните:" -ForegroundColor Yellow
        Write-Host "  Remove-Item -Path node_modules -Recurse -Force" -ForegroundColor Cyan
        exit 1
    }
} else {
    Write-Host "  ✅ node_modules уже удален" -ForegroundColor Green
}

# Шаг 3: Установить зависимости
Write-Host ""
Write-Host "3. Устанавливаю зависимости..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Установка завершена успешно!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Проверьте проект:" -ForegroundColor Cyan
    Write-Host "  npx expo-doctor" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Ошибка при установке" -ForegroundColor Red
    Write-Host "Попробуйте перезагрузить компьютер и затем npm install" -ForegroundColor Yellow
}


